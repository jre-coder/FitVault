import { analyzeSet } from '../../services/setAnalysisService'
import { RawSetAnalysis } from '../../modules/expo-set-analyzer'

const mockAnalyzeVideo = jest.fn()

jest.mock('../../modules/expo-set-analyzer', () => ({
  analyzeVideo: (...args: unknown[]) => mockAnalyzeVideo(...args),
}))

// Helpers to build realistic raw analysis data

function makeRawAnalysis(overrides: Partial<RawSetAnalysis> = {}): RawSetAnalysis {
  return {
    frameCount: 100,
    jointAngles: [],
    repCount: 4,
    repTimestamps: [
      { start: 0.5, end: 2.8 },
      { start: 3.1, end: 5.3 },
      { start: 5.7, end: 8.0 },
      { start: 8.4, end: 10.6 },
    ],
    primaryJoint: 'rightElbow',
    ...overrides,
  }
}

function makeControlledReps(): RawSetAnalysis {
  // ~2.5s per rep — controlled
  return makeRawAnalysis({
    repCount: 3,
    repTimestamps: [
      { start: 0.5, end: 3.0 },
      { start: 3.5, end: 6.0 },
      { start: 6.5, end: 9.0 },
    ],
  })
}

function makeFastReps(): RawSetAnalysis {
  // ~1.0s per rep — fast
  return makeRawAnalysis({
    repCount: 5,
    repTimestamps: [
      { start: 0.5, end: 1.5 },
      { start: 2.0, end: 3.0 },
      { start: 3.5, end: 4.5 },
      { start: 5.0, end: 6.0 },
      { start: 6.5, end: 7.5 },
    ],
  })
}

function makeBorderlineReps(): RawSetAnalysis {
  // ~1.7s per rep — borderline
  return makeRawAnalysis({
    repCount: 3,
    repTimestamps: [
      { start: 0.5, end: 2.2 },
      { start: 2.6, end: 4.3 },
      { start: 4.7, end: 6.4 },
    ],
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── rep count ─────────────────────────────────────────────────────────────────

describe('rep count', () => {
  it('returns the rep count from the native module', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis({ repCount: 4 }))
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.repCount).toBe(4)
  })

  it('returns 0 reps when nothing was detected', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis({ repCount: 0, repTimestamps: [] }))
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.repCount).toBe(0)
  })

  it('passes the video URI to the native module', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis())
    await analyzeSet('file://my-set.mp4', 'Squat')
    expect(mockAnalyzeVideo).toHaveBeenCalledWith('file://my-set.mp4')
  })
})

// ─── tempo calculation ─────────────────────────────────────────────────────────

describe('tempo calculation', () => {
  it('calculates average tempo from rep timestamps', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeControlledReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.averageTempoSeconds).toBeCloseTo(2.5, 1)
  })

  it('calculates min tempo (fastest rep)', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis({
      repCount: 3,
      repTimestamps: [
        { start: 0.0, end: 3.0 },  // 3.0s
        { start: 3.5, end: 4.5 },  // 1.0s
        { start: 5.0, end: 8.0 },  // 3.0s
      ],
    }))
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.minTempoSeconds).toBeCloseTo(1.0, 1)
  })

  it('calculates max tempo (slowest rep)', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis({
      repCount: 3,
      repTimestamps: [
        { start: 0.0, end: 3.0 },  // 3.0s
        { start: 3.5, end: 4.5 },  // 1.0s
        { start: 5.0, end: 8.0 },  // 3.0s
      ],
    }))
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.maxTempoSeconds).toBeCloseTo(3.0, 1)
  })

  it('returns null tempos when no reps were detected', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis({ repCount: 0, repTimestamps: [] }))
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.averageTempoSeconds).toBeNull()
    expect(result.minTempoSeconds).toBeNull()
    expect(result.maxTempoSeconds).toBeNull()
  })
})

// ─── tempo category ────────────────────────────────────────────────────────────

describe('tempo category', () => {
  it('classifies controlled reps (≥2.0s avg) as "controlled"', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeControlledReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.tempoCategory).toBe('controlled')
  })

  it('classifies fast reps (<1.5s avg) as "fast"', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeFastReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.tempoCategory).toBe('fast')
  })

  it('classifies borderline reps (1.5–2.0s avg) as "borderline"', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeBorderlineReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.tempoCategory).toBe('borderline')
  })

  it('returns null tempoCategory when no reps detected', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis({ repCount: 0, repTimestamps: [] }))
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.tempoCategory).toBeNull()
  })
})

// ─── insight copy (liability-safe) ────────────────────────────────────────────

describe('insight copy', () => {
  it('includes rep count in the summary', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis({ repCount: 4 }))
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.summary).toMatch(/4 rep/i)
  })

  it('includes tempo in the summary when reps were detected', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeControlledReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.summary).toMatch(/second/i)
  })

  it('shows a neutral summary when no reps were detected', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeRawAnalysis({ repCount: 0, repTimestamps: [] }))
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.summary).toBeTruthy()
    expect(typeof result.summary).toBe('string')
  })

  it('does NOT use words like "wrong", "bad", "incorrect", or "injury" in the summary', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeFastReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    const text = (result.summary + ' ' + (result.guidance ?? '')).toLowerCase()
    expect(text).not.toMatch(/\bwrong\b/)
    expect(text).not.toMatch(/\bbad\b/)
    expect(text).not.toMatch(/\bincorrect\b/)
    expect(text).not.toMatch(/\binjury\b/)
    expect(text).not.toMatch(/\bhurt\b/)
  })

  it('provides guidance for fast reps', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeFastReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.guidance).toBeTruthy()
  })

  it('suggests tempo training content for fast reps', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeFastReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.contentSuggestion).toMatch(/tempo/i)
  })

  it('provides no guidance for controlled reps', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeControlledReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.guidance).toBeNull()
    expect(result.contentSuggestion).toBeNull()
  })

  it('provides mild guidance for borderline reps', async () => {
    mockAnalyzeVideo.mockResolvedValue(makeBorderlineReps())
    const result = await analyzeSet('file://video.mp4', 'Bicep Curl')
    expect(result.guidance).toBeTruthy()
  })
})

// ─── error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws when the native module fails', async () => {
    mockAnalyzeVideo.mockRejectedValue(new Error('Vision analysis failed'))
    await expect(analyzeSet('file://video.mp4', 'Squat')).rejects.toThrow()
  })
})

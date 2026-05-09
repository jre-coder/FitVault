import { analyzeWorkout, buildEphemeralExecution } from '../../services/fixMyWorkoutService'
import * as aiResultCache from '../../services/aiResultCache'
import { UserProfile, WorkoutAnalysis } from '../../types'

jest.mock('../../services/aiResultCache', () => ({
  getCachedResults: jest.fn(),
  setCachedResults: jest.fn(),
  hashParams: jest.fn(),
  TTL_7D: 604800000,
}))

const mockGetCache = aiResultCache.getCachedResults as jest.Mock
const mockSetCache = aiResultCache.setCachedResults as jest.Mock
const mockHash = aiResultCache.hashParams as jest.Mock

const mockFetch = jest.fn()
global.fetch = mockFetch

const PROFILE: UserProfile = {
  goals: ['Muscle Growth'],
  fitnessLevel: 'Intermediate',
  age: 30,
  sensitiveAreas: [],
  equipment: ['barbell', 'dumbbells'],
  preferredDuration: 60,
  preferredPlatforms: ['youtube'],
  preferredWorkoutTypes: [],
}

const ANALYSIS: WorkoutAnalysis = {
  parsedExercises: [
    { name: 'Bench Press', sets: 4, reps: '8-10' },
    { name: 'Incline Press', sets: 3, reps: '10-12' },
    { name: 'Cable Fly', sets: 3, reps: '12-15' },
    { name: 'Tricep Pushdown', sets: 3, reps: '12-15' },
  ],
  muscleGroups: ['Chest', 'Arms'],
  estimatedDurationMinutes: 45,
  issues: [
    {
      severity: 'warning',
      title: 'No pulling movement',
      description: 'All exercises push. Add a row or pull-up to balance the session.',
    },
  ],
  optimizedExercises: [
    { name: 'Bench Press', sets: 4, reps: '6-8' },
    { name: 'Cable Row', sets: 3, reps: '10-12' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
    { name: 'Tricep Pushdown', sets: 3, reps: '12-15' },
  ],
  swaps: [
    {
      original: 'Incline Press',
      replacement: 'Cable Row',
      reason: 'Adds a pulling movement to balance push-dominant session.',
    },
  ],
  coachNotes: 'Great foundation — adding a pull movement makes this a balanced upper-body session.',
}

function makeClaudeResponse(analysis: WorkoutAnalysis): object {
  return {
    content: [{ type: 'text', text: JSON.stringify(analysis) }],
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHash.mockReturnValue('test-hash-abc')
  mockGetCache.mockResolvedValue(null)
  mockSetCache.mockResolvedValue(undefined)
})

describe('analyzeWorkout', () => {
  describe('cache hit', () => {
    it('returns cached result without calling the API', async () => {
      mockGetCache.mockResolvedValue(ANALYSIS)

      const result = await analyzeWorkout('bench press 4x8, incline press 3x10', PROFILE)

      expect(result).toEqual(ANALYSIS)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('cache miss — successful API call', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeClaudeResponse(ANALYSIS)),
      })
    })

    it('calls the Claude API when no cache exists', async () => {
      await analyzeWorkout('bench press 4x8, incline press 3x10', PROFILE)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('returns the parsed WorkoutAnalysis', async () => {
      const result = await analyzeWorkout('bench press 4x8, incline press 3x10', PROFILE)
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0].title).toBe('No pulling movement')
      expect(result.parsedExercises).toHaveLength(4)
      expect(result.optimizedExercises).toHaveLength(4)
      expect(result.swaps).toHaveLength(1)
      expect(result.coachNotes).toBeTruthy()
    })

    it('stores the result in cache after a successful call', async () => {
      await analyzeWorkout('bench press 4x8, incline press 3x10', PROFILE)
      expect(mockSetCache).toHaveBeenCalledWith('test-hash-abc', ANALYSIS, aiResultCache.TTL_7D)
    })

    it('includes user profile fields in the cache key', async () => {
      await analyzeWorkout('bench press 4x8', PROFILE)
      expect(mockHash).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.any(String),
          fitnessLevel: 'Intermediate',
          goals: expect.any(Array),
          sensitiveAreas: expect.any(Array),
        })
      )
    })

    it('normalizes description to lowercase for the cache key', async () => {
      await analyzeWorkout('BENCH PRESS 4x8', PROFILE)
      expect(mockHash).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'bench press 4x8' })
      )
    })
  })

  describe('API response parsing', () => {
    it('strips markdown code fences before parsing JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ type: 'text', text: '```json\n' + JSON.stringify(ANALYSIS) + '\n```' }],
          }),
      })

      const result = await analyzeWorkout('bench press 4x8', PROFILE)
      expect(result.issues).toHaveLength(1)
    })

    it('throws when the API returns a non-ok status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(analyzeWorkout('bench press 4x8', PROFILE)).rejects.toThrow()
    })

    it('throws when the response JSON is malformed', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ content: [{ type: 'text', text: 'not json at all' }] }),
      })

      await expect(analyzeWorkout('bench press 4x8', PROFILE)).rejects.toThrow()
    })

    it('does not write to cache on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
      })

      await expect(analyzeWorkout('bench press 4x8', PROFILE)).rejects.toThrow()
      expect(mockSetCache).not.toHaveBeenCalled()
    })
  })

  describe('API request structure', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(makeClaudeResponse(ANALYSIS)),
      })
    })

    it('sends a POST request with the workout description in the user message', async () => {
      await analyzeWorkout('bench press 4x8, squats 3x10', PROFILE)

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      const userMessage = body.messages[0].content
      expect(userMessage).toContain('bench press 4x8, squats 3x10')
    })

    it('includes the user profile context in the user message', async () => {
      await analyzeWorkout('bench press 4x8', PROFILE)

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      const userMessage = body.messages[0].content
      expect(userMessage).toContain('Intermediate')
    })

    it('uses prompt caching on the system prompt', async () => {
      await analyzeWorkout('bench press 4x8', PROFILE)

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      const systemBlock = body.system[0]
      expect(systemBlock.cache_control).toEqual({ type: 'ephemeral' })
    })

    it('sends sensitive areas in the user message when present', async () => {
      const profileWithInjury: UserProfile = { ...PROFILE, sensitiveAreas: ['Lower Back', 'Knees'] }
      await analyzeWorkout('deadlift 4x5', profileWithInjury)

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      const userMessage = body.messages[0].content
      expect(userMessage).toContain('Lower Back')
    })
  })
})

describe('video suggestions in swaps', () => {
  it('preserves videoSuggestion when API returns it in a swap', async () => {
    const analysisWithVideo: WorkoutAnalysis = {
      ...ANALYSIS,
      swaps: [
        {
          original: 'Incline Press',
          replacement: 'Cable Row',
          reason: 'Adds pulling movement.',
          videoSuggestion: {
            creator: 'Jeff Nippard',
            handle: 'jeffnippard',
            platform: 'youtube',
            url: 'https://youtube.com/@jeffnippard',
          },
        },
      ],
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeClaudeResponse(analysisWithVideo)),
    })
    const result = await analyzeWorkout('bench press 4x8', PROFILE)
    expect(result.swaps[0].videoSuggestion).toEqual({
      creator: 'Jeff Nippard',
      handle: 'jeffnippard',
      platform: 'youtube',
      url: 'https://youtube.com/@jeffnippard',
    })
  })

  it('works normally when swaps have no videoSuggestion', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeClaudeResponse(ANALYSIS)),
    })
    const result = await analyzeWorkout('bench press 4x8', PROFILE)
    expect(result.swaps[0].videoSuggestion).toBeUndefined()
  })
})

describe('buildEphemeralExecution', () => {
  it('returns a Routine and a WorkoutItem array', () => {
    const { routine, workouts } = buildEphemeralExecution(ANALYSIS)
    expect(routine).toBeTruthy()
    expect(Array.isArray(workouts)).toBe(true)
    expect(workouts).toHaveLength(1)
  })

  it('routine has a generated id and a sensible name', () => {
    const { routine } = buildEphemeralExecution(ANALYSIS)
    expect(routine.id).toBeTruthy()
    expect(routine.name).toBeTruthy()
  })

  it('routine has one item pointing to the workout', () => {
    const { routine, workouts } = buildEphemeralExecution(ANALYSIS)
    expect(routine.items).toHaveLength(1)
    expect(routine.items[0].workoutItemId).toBe(workouts[0].id)
    expect(routine.items[0].order).toBe(0)
  })

  it('workout exercises match the optimizedExercises from the analysis', () => {
    const { workouts } = buildEphemeralExecution(ANALYSIS)
    const exercises = workouts[0].exercises!
    expect(exercises).toHaveLength(ANALYSIS.optimizedExercises.length)
    expect(exercises[0].name).toBe(ANALYSIS.optimizedExercises[0].name)
    expect(exercises[0].sets).toBe(ANALYSIS.optimizedExercises[0].sets)
    expect(exercises[0].reps).toBe(ANALYSIS.optimizedExercises[0].reps)
  })

  it('workout has a non-empty title', () => {
    const { workouts } = buildEphemeralExecution(ANALYSIS)
    expect(workouts[0].title).toBeTruthy()
  })

  it('each call produces a unique routine id', () => {
    const first = buildEphemeralExecution(ANALYSIS)
    const second = buildEphemeralExecution(ANALYSIS)
    expect(first.routine.id).not.toBe(second.routine.id)
  })
})

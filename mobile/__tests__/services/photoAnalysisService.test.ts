import { analyzeWorkoutPhotos } from '../../services/photoAnalysisService'
import { PhotoAnalysisResult } from '../../types'

const mockFetch = jest.fn()
global.fetch = mockFetch

const MOCK_RESULT: PhotoAnalysisResult = {
  title: 'Upper Body Strength',
  bodyParts: ['Chest', 'Shoulders', 'Arms'],
  difficulty: 'Intermediate',
  exercises: [
    { name: 'Bench Press', sets: 4, reps: '8-10', weight: '135 lbs' },
    { name: 'Overhead Press', sets: 3, reps: '10', weight: '75 lbs' },
    { name: 'Tricep Dips', sets: 3, reps: '12' },
  ],
  notes: 'Rest 90 seconds between sets.',
}

function mockSuccess(result: PhotoAnalysisResult) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      content: [{ text: JSON.stringify(result) }],
    }),
  })
}

beforeEach(() => {
  mockFetch.mockReset()
  process.env.EXPO_PUBLIC_CLAUDE_API_KEY = 'test-key'
})

describe('analyzeWorkoutPhotos', () => {
  it('returns structured result from a single image', async () => {
    mockSuccess(MOCK_RESULT)
    const result = await analyzeWorkoutPhotos(['base64imagedata=='])
    expect(result).toEqual(MOCK_RESULT)
  })

  it('sends all provided images to the API', async () => {
    mockSuccess(MOCK_RESULT)
    await analyzeWorkoutPhotos(['img1==', 'img2==', 'img3=='])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const imageBlocks = body.messages[0].content.filter((c: any) => c.type === 'image')
    expect(imageBlocks).toHaveLength(3)
  })

  it('includes the correct media type in each image block', async () => {
    mockSuccess(MOCK_RESULT)
    await analyzeWorkoutPhotos(['imgdata=='])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const imageBlock = body.messages[0].content.find((c: any) => c.type === 'image')
    expect(imageBlock.source.type).toBe('base64')
    expect(imageBlock.source.media_type).toBe('image/jpeg')
    expect(imageBlock.source.data).toBe('imgdata==')
  })

  it('throws when the API returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    await expect(analyzeWorkoutPhotos(['img=='])).rejects.toThrow()
  })

  it('throws when the response JSON is malformed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: 'not json at all' }] }),
    })
    await expect(analyzeWorkoutPhotos(['img=='])).rejects.toThrow()
  })

  it('returns valid bodyParts from the allowed list', async () => {
    mockSuccess(MOCK_RESULT)
    const result = await analyzeWorkoutPhotos(['img=='])
    const validParts = ['Full Body','Chest','Back','Shoulders','Arms','Core','Legs','Glutes','Cardio','Mobility']
    result.bodyParts.forEach(p => expect(validParts).toContain(p))
  })

  it('includes exercises array in the result', async () => {
    mockSuccess(MOCK_RESULT)
    const result = await analyzeWorkoutPhotos(['img=='])
    expect(Array.isArray(result.exercises)).toBe(true)
    expect(result.exercises.length).toBeGreaterThan(0)
    expect(result.exercises[0]).toHaveProperty('name')
  })
})

// ─── prompt caching ───────────────────────────────────────────────────────────

describe('prompt caching', () => {
  it('sends analysis instructions as a cached system block', async () => {
    mockSuccess(MOCK_RESULT)
    await analyzeWorkoutPhotos(['base64data=='])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(Array.isArray(body.system)).toBe(true)
    expect(body.system[0]).toMatchObject({
      type: 'text',
      cache_control: { type: 'ephemeral' },
    })
    expect(body.system[0].text.length).toBeGreaterThan(100)
  })

  it('includes anthropic-beta prompt-caching header', async () => {
    mockSuccess(MOCK_RESULT)
    await analyzeWorkoutPhotos(['base64data=='])

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['anthropic-beta']).toBe('prompt-caching-2024-07-31')
  })

  it('still sends images in the user message after system-prompt refactor', async () => {
    mockSuccess(MOCK_RESULT)
    await analyzeWorkoutPhotos(['img1==', 'img2=='])

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const imageBlocks = body.messages[0].content.filter((c: any) => c.type === 'image')
    expect(imageBlocks).toHaveLength(2)
  })
})

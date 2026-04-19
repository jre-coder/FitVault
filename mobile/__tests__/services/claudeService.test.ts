import {
  fetchTopWorkouts,
  fetchSimilarWorkouts,
  fetchRecommendations,
  safeURL,
  suggestionToWorkoutItem,
} from '../../services/claudeService'
import { AIWorkoutSuggestion, WorkoutItem } from '../../types'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

function makeApiResponse(recommendations: object[]): Response {
  return {
    ok: true,
    json: async () => ({
      content: [{ text: JSON.stringify({ recommendations }) }],
    }),
  } as unknown as Response
}

function makeRecommendation(overrides: Partial<AIWorkoutSuggestion> = {}): object {
  return {
    rank: 1,
    title: 'Test Workout',
    creator: 'Test Creator',
    platform: 'youtube',
    targetMuscles: ['Full Body'],
    description: 'A test workout.',
    explanation: 'Good for testing.',
    durationMinutes: 30,
    difficulty: 'Intermediate',
    ...overrides,
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchTopWorkouts', () => {
  it('returns structured suggestions with generated URLs', async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse([makeRecommendation()]))

    const results = await fetchTopWorkouts('Legs', ['youtube'], ['any'])

    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Test Workout')
    expect(results[0].creator).toBe('Test Creator')
    expect(results[0].platform).toBe('youtube')
    expect(results[0].url).toContain('youtube.com/results')
    expect(results[0].id).toBeTruthy()
  })

  it('enforces allowed platforms — overrides wrong platform from model', async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse([makeRecommendation({ platform: 'youtube' })]),
    )

    const results = await fetchTopWorkouts('Full Body', ['tiktok'], ['any'])

    expect(results[0].platform).toBe('tiktok')
    expect(results[0].url).toContain('tiktok.com')
  })

  it('generates correct URL per platform', async () => {
    const platforms = ['youtube', 'tiktok', 'instagram', 'website'] as const
    const expectedUrlFragments: Record<string, string> = {
      youtube: 'youtube.com/results',
      tiktok: 'tiktok.com/search/video',
      instagram: 'google.com/search',
      website: 'google.com/search',
    }

    for (const platform of platforms) {
      mockFetch.mockResolvedValueOnce(
        makeApiResponse([makeRecommendation({ platform })]),
      )
      const results = await fetchTopWorkouts('Core', [platform], ['any'])
      expect(results[0].url).toContain(expectedUrlFragments[platform])
    }
  })

  it('includes creator name in search URL', async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse([makeRecommendation({ creator: 'Jeff Nippard', title: 'Chest Workout' })]),
    )

    const results = await fetchTopWorkouts('Chest', ['youtube'], ['any'])

    expect(decodeURIComponent(results[0].url)).toContain('Jeff Nippard')
    expect(decodeURIComponent(results[0].url)).toContain('Chest Workout')
  })

  it('handles code-fenced JSON from model', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          {
            text: '```json\n' + JSON.stringify({ recommendations: [makeRecommendation()] }) + '\n```',
          },
        ],
      }),
    } as unknown as Response)

    const results = await fetchTopWorkouts('Arms', ['youtube'], ['any'])
    expect(results).toHaveLength(1)
  })

  it('throws on non-ok API response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    await expect(fetchTopWorkouts('Back', ['youtube'], ['any'])).rejects.toThrow('Claude API error: 401')
  })
})

describe('fetchSimilarWorkouts', () => {
  const workout: WorkoutItem = {
    id: '1',
    title: 'My Leg Day',
    url: 'https://youtube.com/watch?v=test',
    sourceType: 'youtube',
    bodyParts: ['Legs', 'Glutes'],
    notes: 'Heavy compound movements',
    dateAdded: '2026-01-01',
    isFavorite: false,
  }

  it('returns suggestions based on a saved workout', async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse([makeRecommendation()]))

    const results = await fetchSimilarWorkouts(workout, ['youtube'], ['any'])
    expect(results).toHaveLength(1)
  })

  it('enforces platform on similar workouts', async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse([makeRecommendation({ platform: 'instagram' })]),
    )
    const results = await fetchSimilarWorkouts(workout, ['youtube'], ['any'])
    expect(results[0].platform).toBe('youtube')
  })
})

describe('fetchRecommendations', () => {
  const params = {
    goals: 'lose weight',
    fitnessLevel: 'Beginner',
    equipment: ['Bodyweight'],
    durationMinutes: 30,
    platforms: ['youtube'],
    workoutTypes: ['hiit'],
  }

  it('returns personalized recommendations', async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse([makeRecommendation()]))

    const results = await fetchRecommendations(params)
    expect(results).toHaveLength(1)
  })

  it('includes workout type filter in prompt when not "any"', async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse([makeRecommendation()]))

    await fetchRecommendations({ ...params, workoutTypes: ['dance', 'hiit'] })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages[0].content).toContain('dance')
    expect(body.messages[0].content).toContain('hiit')
  })

  it('omits workout type line when "any" is selected', async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse([makeRecommendation()]))

    await fetchRecommendations({ ...params, workoutTypes: ['any'] })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages[0].content).not.toContain('Workout style/type')
  })
})

describe('safeURL', () => {
  it('returns the suggestion url directly', () => {
    const suggestion = { url: 'https://example.com' } as AIWorkoutSuggestion
    expect(safeURL(suggestion)).toBe('https://example.com')
  })
})

describe('suggestionToWorkoutItem', () => {
  it('maps suggestion fields to WorkoutItem correctly', () => {
    const suggestion: AIWorkoutSuggestion = {
      id: 'test-id',
      rank: 1,
      title: 'Full Body Blast',
      creator: 'Chloe Ting',
      url: 'https://youtube.com/results?search_query=test',
      platform: 'youtube',
      targetMuscles: ['Full Body', 'Cardio'],
      description: 'A great workout.',
      explanation: 'Popular and effective.',
      durationMinutes: 30,
      difficulty: 'Beginner',
    }

    const item = suggestionToWorkoutItem(suggestion)

    expect(item.title).toBe('Full Body Blast')
    expect(item.sourceType).toBe('youtube')
    expect(item.bodyParts).toContain('Full Body')
    expect(item.bodyParts).toContain('Cardio')
    expect(item.notes).toBe('A great workout.')
    expect(item.isFavorite).toBe(false)
  })

  it('falls back to Full Body when no valid targetMuscles', () => {
    const suggestion: AIWorkoutSuggestion = {
      id: 'test-id',
      rank: 1,
      title: 'Test',
      creator: 'Creator',
      url: 'https://example.com',
      platform: 'youtube',
      targetMuscles: ['InvalidMuscle'],
      description: '',
      explanation: '',
      durationMinutes: 20,
      difficulty: 'Intermediate',
    }

    const item = suggestionToWorkoutItem(suggestion)
    expect(item.bodyParts).toEqual(['Full Body'])
  })

  it('falls back to "other" sourceType for unknown platform', () => {
    const suggestion: AIWorkoutSuggestion = {
      id: 'test-id',
      rank: 1,
      title: 'Test',
      creator: 'Creator',
      url: 'https://example.com',
      platform: 'unknown_platform',
      targetMuscles: ['Full Body'],
      description: '',
      explanation: '',
      durationMinutes: 20,
      difficulty: 'Intermediate',
    }

    const item = suggestionToWorkoutItem(suggestion)
    expect(item.sourceType).toBe('other')
  })
})

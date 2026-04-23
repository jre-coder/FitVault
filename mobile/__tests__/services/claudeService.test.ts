import {
  fetchTopWorkouts,
  fetchSimilarWorkouts,
  fetchRecommendations,
  safeURL,
  suggestionToWorkoutItem,
} from '../../services/claudeService'
import { AIWorkoutSuggestion, WorkoutItem } from '../../types'

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
    handle: '',
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

// ─── URL generation ──────────────────────────────────────────────────────────

describe('URL generation', () => {
  describe('YouTube', () => {
    it('links to channel page when handle is provided', async () => {
      mockFetch.mockResolvedValueOnce(
        makeApiResponse([makeRecommendation({ handle: '@jeffnippard', platform: 'youtube' })]),
      )
      const results = await fetchTopWorkouts('Chest', ['youtube'], ['any'])
      expect(results[0].url).toBe('https://www.youtube.com/@jeffnippard')
    })

    it('falls back to search with creator+title when handle is missing', async () => {
      mockFetch.mockResolvedValueOnce(
        makeApiResponse([makeRecommendation({ handle: '', creator: 'Jeff Nippard', title: 'Chest Workout', platform: 'youtube' })]),
      )
      const results = await fetchTopWorkouts('Chest', ['youtube'], ['any'])
      expect(results[0].url).toContain('youtube.com/results')
      expect(decodeURIComponent(results[0].url)).toContain('Jeff Nippard')
    })
  })

  describe('Instagram', () => {
    it('links to profile page when handle is provided', async () => {
      mockFetch.mockResolvedValueOnce(
        makeApiResponse([makeRecommendation({ handle: 'jeffnippard', platform: 'instagram' })]),
      )
      const results = await fetchTopWorkouts('Arms', ['instagram'], ['any'])
      expect(results[0].url).toBe('https://www.instagram.com/jeffnippard/')
    })

    it('falls back to google site search when handle is missing', async () => {
      mockFetch.mockResolvedValueOnce(
        makeApiResponse([makeRecommendation({ handle: '', creator: 'Kayla Itsines', platform: 'instagram' })]),
      )
      const results = await fetchTopWorkouts('Core', ['instagram'], ['any'])
      expect(results[0].url).toContain('google.com/search')
      expect(results[0].url).toContain('instagram.com')
    })
  })

  describe('TikTok', () => {
    it('links to profile page when handle is provided', async () => {
      mockFetch.mockResolvedValueOnce(
        makeApiResponse([makeRecommendation({ handle: '@chloeting', platform: 'tiktok' })]),
      )
      const results = await fetchTopWorkouts('Full Body', ['tiktok'], ['any'])
      expect(results[0].url).toBe('https://www.tiktok.com/@chloeting')
    })

    it('falls back to google site:tiktok.com search when handle is missing', async () => {
      mockFetch.mockResolvedValueOnce(
        makeApiResponse([makeRecommendation({ handle: '', creator: 'Chloe Ting', platform: 'tiktok' })]),
      )
      const results = await fetchTopWorkouts('Full Body', ['tiktok'], ['any'])
      expect(results[0].url).toContain('google.com/search')
      expect(results[0].url).toContain('tiktok.com')
    })
  })

  describe('Websites', () => {
    it('uses google search', async () => {
      mockFetch.mockResolvedValueOnce(
        makeApiResponse([makeRecommendation({ handle: '', platform: 'website' })]),
      )
      const results = await fetchTopWorkouts('Cardio', ['website'], ['any'])
      expect(results[0].url).toContain('google.com/search')
    })
  })
})

// ─── Platform enforcement ─────────────────────────────────────────────────────

describe('platform enforcement', () => {
  it('overrides platform returned by model if not in allowed list', async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse([makeRecommendation({ platform: 'youtube', handle: '@someone' })]),
    )
    const results = await fetchTopWorkouts('Full Body', ['tiktok'], ['any'])
    expect(results[0].platform).toBe('tiktok')
    expect(results[0].url).not.toContain('youtube.com')
  })

  it('keeps platform when it matches allowed list', async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse([makeRecommendation({ platform: 'youtube', handle: '@jeffnippard' })]),
    )
    const results = await fetchTopWorkouts('Legs', ['youtube'], ['any'])
    expect(results[0].platform).toBe('youtube')
    expect(results[0].url).toBe('https://www.youtube.com/@jeffnippard')
  })

  it('clears handle when platform is overridden (prevents mismatched handle+platform URL)', async () => {
    mockFetch.mockResolvedValueOnce(
      makeApiResponse([makeRecommendation({ platform: 'youtube', handle: '@jeffnippard' })]),
    )
    const results = await fetchTopWorkouts('Back', ['tiktok'], ['any'])
    // Handle was for YouTube but platform got overridden to tiktok — URL should be a search, not youtube.com
    expect(results[0].url).not.toContain('youtube.com')
  })
})

// ─── fetchTopWorkouts ─────────────────────────────────────────────────────────

describe('fetchTopWorkouts', () => {
  it('returns structured suggestions with id assigned', async () => {
    mockFetch.mockResolvedValueOnce(makeApiResponse([makeRecommendation()]))
    const results = await fetchTopWorkouts('Legs', ['youtube'], ['any'])
    expect(results).toHaveLength(1)
    expect(results[0].id).toBeTruthy()
    expect(results[0].title).toBe('Test Workout')
    expect(results[0].creator).toBe('Test Creator')
  })

  it('handles code-fenced JSON from model', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: '```json\n' + JSON.stringify({ recommendations: [makeRecommendation()] }) + '\n```' }],
      }),
    } as unknown as Response)
    const results = await fetchTopWorkouts('Arms', ['youtube'], ['any'])
    expect(results).toHaveLength(1)
  })

  it('throws on non-ok API response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' } as unknown as Response)
    await expect(fetchTopWorkouts('Back', ['youtube'], ['any'])).rejects.toThrow('Claude API error 401')
  })
})

// ─── fetchSimilarWorkouts ─────────────────────────────────────────────────────

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
      makeApiResponse([makeRecommendation({ platform: 'instagram', handle: '@someone' })]),
    )
    const results = await fetchSimilarWorkouts(workout, ['youtube'], ['any'])
    expect(results[0].platform).toBe('youtube')
  })
})

// ─── fetchRecommendations ─────────────────────────────────────────────────────

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

  it('includes workout type in prompt when not "any"', async () => {
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

// ─── safeURL ─────────────────────────────────────────────────────────────────

describe('safeURL', () => {
  it('returns the suggestion url directly', () => {
    const suggestion = { url: 'https://example.com' } as AIWorkoutSuggestion
    expect(safeURL(suggestion)).toBe('https://example.com')
  })
})

// ─── suggestionToWorkoutItem ──────────────────────────────────────────────────

describe('suggestionToWorkoutItem', () => {
  it('maps all fields correctly', () => {
    const suggestion: AIWorkoutSuggestion = {
      id: 'test-id',
      rank: 1,
      title: 'Full Body Blast',
      creator: 'Chloe Ting',
      handle: '@ChloeTing',
      url: 'https://www.youtube.com/@ChloeTing',
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
    expect(item.notes).toBe('A great workout.')
    expect(item.isFavorite).toBe(false)
  })

  it('falls back to Full Body when targetMuscles are all invalid', () => {
    const suggestion: AIWorkoutSuggestion = {
      id: 'x', rank: 1, title: 'Test', creator: 'X', handle: '',
      url: 'https://example.com', platform: 'youtube',
      targetMuscles: ['InvalidMuscle'], description: '', explanation: '',
      durationMinutes: 20, difficulty: 'Intermediate',
    }
    expect(suggestionToWorkoutItem(suggestion).bodyParts).toEqual(['Full Body'])
  })

  it('falls back to "other" sourceType for unknown platform', () => {
    const suggestion: AIWorkoutSuggestion = {
      id: 'x', rank: 1, title: 'Test', creator: 'X', handle: '',
      url: 'https://example.com', platform: 'unknown_platform',
      targetMuscles: ['Full Body'], description: '', explanation: '',
      durationMinutes: 20, difficulty: 'Intermediate',
    }
    expect(suggestionToWorkoutItem(suggestion).sourceType).toBe('other')
  })
})

import { identifyMachine } from '../../services/machineIdentificationService'
import { MachineIdentificationResult } from '../../types'
import AsyncStorage from '@react-native-async-storage/async-storage'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const MOCK_RESULT: MachineIdentificationResult = {
  recognized: true,
  machineName: 'Cable Row Machine',
  exercises: [
    { name: 'Seated Cable Row', sets: 3, reps: '10-12' },
    { name: 'Single-Arm Cable Row', sets: 3, reps: '10 each side' },
  ],
  bodyParts: ['Back', 'Arms'],
  confidence: 'high',
  notes: 'Adjust seat height so handles are at chest level.',
}

const MOCK_UNRECOGNIZED: MachineIdentificationResult = {
  recognized: false,
  machineName: 'Unknown Machine',
  exercises: [],
  bodyParts: [],
  confidence: 'low',
}

const MOCK_PROFILE = {
  goals: ['Muscle Growth'],
  fitnessLevel: 'Intermediate' as const,
  age: 35,
  sensitiveAreas: ['Lower Back'],
  equipment: ['cable machine'],
  preferredDuration: 60,
  preferredPlatforms: ['youtube'],
  preferredWorkoutTypes: [],
}

function mockSuccess(result: MachineIdentificationResult) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      content: [{ text: JSON.stringify(result) }],
    }),
  })
}

beforeEach(() => {
  mockFetch.mockReset()
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
  ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
  process.env.EXPO_PUBLIC_CLAUDE_API_KEY = 'test-key'
  delete process.env.EXPO_PUBLIC_PROXY_URL
})

// ─── basic identification ──────────────────────────────────────────────────────

describe('identifyMachine', () => {
  it('returns a structured MachineIdentificationResult for a recognized machine', async () => {
    mockSuccess(MOCK_RESULT)
    const result = await identifyMachine('base64imagedata==')
    expect(result).toMatchObject({
      recognized: true,
      machineName: 'Cable Row Machine',
      exercises: expect.arrayContaining([expect.objectContaining({ name: 'Seated Cable Row' })]),
      bodyParts: expect.arrayContaining(['Back']),
      confidence: expect.stringMatching(/^(high|medium|low)$/),
    })
  })

  it('returns recognized: false for unrecognized machines', async () => {
    mockSuccess(MOCK_UNRECOGNIZED)
    const result = await identifyMachine('blurry==')
    expect(result.recognized).toBe(false)
  })

  it('includes exercises array (may be empty for unrecognized)', async () => {
    mockSuccess(MOCK_UNRECOGNIZED)
    const result = await identifyMachine('blurry==')
    expect(Array.isArray(result.exercises)).toBe(true)
  })

  it('passes profile context when provided', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('base64==', MOCK_PROFILE)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const userText = body.messages[0].content.find(
      (c: { type: string; text?: string }) => c.type === 'text'
    )?.text ?? ''
    expect(userText).toMatch(/lower back/i)
  })

  it('calls the API without profile when profile is not provided', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('base64==')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

// ─── API request structure ─────────────────────────────────────────────────────

describe('API request structure', () => {
  it('sends the image as a base64 block in the user message', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('myimageb64==')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const imageBlock = body.messages[0].content.find(
      (c: { type: string }) => c.type === 'image'
    )
    expect(imageBlock).toBeDefined()
    expect(imageBlock.source.type).toBe('base64')
    expect(imageBlock.source.media_type).toBe('image/jpeg')
    expect(imageBlock.source.data).toBe('myimageb64==')
  })

  it('uses the system prompt as a cached block', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('img==')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(Array.isArray(body.system)).toBe(true)
    expect(body.system[0]).toMatchObject({
      type: 'text',
      cache_control: { type: 'ephemeral' },
    })
    expect(body.system[0].text.length).toBeGreaterThan(100)
  })

  it('sends prompt-caching beta header', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('img==')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['anthropic-beta']).toBe('prompt-caching-2024-07-31')
  })

  it('sends anthropic-version header', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('img==')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['anthropic-version']).toBe('2023-06-01')
  })

  it('sends x-api-key when not using proxy', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('img==')

    const headers = mockFetch.mock.calls[0][1].headers
    expect(headers['x-api-key']).toBe('test-key')
  })
})

// ─── caching ──────────────────────────────────────────────────────────────────

describe('caching', () => {
  it('returns a cached result without calling the API again', async () => {
    mockSuccess(MOCK_RESULT)
    const first = await identifyMachine('img==')

    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ value: first, expiresAt: Date.now() + 1_000_000 })
    )

    const second = await identifyMachine('img==')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('calls the API again when the cache is expired', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ value: MOCK_RESULT, expiresAt: Date.now() - 1 })
    )
    mockSuccess(MOCK_RESULT)

    await identifyMachine('img==')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('stores the result in AsyncStorage after a successful API call', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('img==')
    expect(AsyncStorage.setItem).toHaveBeenCalled()
  })

  it('uses different cache keys for different images', async () => {
    mockSuccess(MOCK_RESULT)
    mockSuccess(MOCK_RESULT)

    await identifyMachine('img1==')
    await identifyMachine('img2==')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('uses different cache keys for same image with different profiles', async () => {
    mockSuccess(MOCK_RESULT)
    mockSuccess(MOCK_RESULT)

    await identifyMachine('img==', MOCK_PROFILE)
    await identifyMachine('img==', { ...MOCK_PROFILE, fitnessLevel: 'Advanced' })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

// ─── error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws when the API returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(identifyMachine('img==')).rejects.toThrow()
  })

  it('throws when the response JSON is malformed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: 'not valid json {{{' }] }),
    })
    await expect(identifyMachine('img==')).rejects.toThrow()
  })

  it('throws when the network fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    await expect(identifyMachine('img==')).rejects.toThrow()
  })
})

// ─── proxy routing ─────────────────────────────────────────────────────────────

describe('backend proxy routing', () => {
  const PROXY = 'https://myproject.supabase.co/functions/v1/claude-proxy'

  beforeEach(() => {
    process.env.EXPO_PUBLIC_PROXY_URL = PROXY
  })
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_PROXY_URL
  })

  it('routes to the proxy URL when EXPO_PUBLIC_PROXY_URL is set', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('img==')
    expect(mockFetch.mock.calls[0][0]).toBe(PROXY)
  })

  it('omits x-api-key header in proxy mode', async () => {
    mockSuccess(MOCK_RESULT)
    await identifyMachine('img==')
    expect(mockFetch.mock.calls[0][1].headers['x-api-key']).toBeUndefined()
  })
})

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getCachedResults, setCachedResults, hashParams } from '../../services/aiResultCache'

const store: Record<string, string | undefined> = {}

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    store[key] = value
    return Promise.resolve()
  }),
  removeItem: jest.fn((key: string) => {
    delete store[key]
    return Promise.resolve()
  }),
}))

const mockGetItem = AsyncStorage.getItem as jest.Mock
const mockSetItem = AsyncStorage.setItem as jest.Mock
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
  jest.clearAllMocks()
})

// ─── hashParams ───────────────────────────────────────────────────────────────

describe('hashParams', () => {
  it('returns a non-empty string', () => {
    expect(typeof hashParams({ bodyPart: 'Legs', platforms: ['youtube'] })).toBe('string')
    expect(hashParams({ bodyPart: 'Legs', platforms: ['youtube'] }).length).toBeGreaterThan(0)
  })

  it('returns the same hash regardless of object key order', () => {
    const a = hashParams({ bodyPart: 'Legs', platforms: ['youtube'], workoutTypes: ['any'] })
    const b = hashParams({ workoutTypes: ['any'], platforms: ['youtube'], bodyPart: 'Legs' })
    expect(a).toBe(b)
  })

  it('sorts array values for determinism', () => {
    const a = hashParams({ platforms: ['tiktok', 'youtube'] })
    const b = hashParams({ platforms: ['youtube', 'tiktok'] })
    expect(a).toBe(b)
  })

  it('returns different hashes for different values', () => {
    const a = hashParams({ bodyPart: 'Legs', platforms: ['youtube'] })
    const b = hashParams({ bodyPart: 'Chest', platforms: ['youtube'] })
    expect(a).not.toBe(b)
  })

  it('returns different hashes for different platforms', () => {
    const a = hashParams({ bodyPart: 'Legs', platforms: ['youtube'] })
    const b = hashParams({ bodyPart: 'Legs', platforms: ['tiktok'] })
    expect(a).not.toBe(b)
  })
})

// ─── getCachedResults ─────────────────────────────────────────────────────────

describe('getCachedResults', () => {
  it('returns null when no entry exists', async () => {
    expect(await getCachedResults('missing')).toBeNull()
  })

  it('returns the stored value when the entry is fresh', async () => {
    await setCachedResults('fresh', [{ id: 'x', title: 'Test' }], 60_000)
    const result = await getCachedResults('fresh')
    expect(result).toEqual([{ id: 'x', title: 'Test' }])
  })

  it('returns null when the entry is expired', async () => {
    await setCachedResults('expired', ['stale data'], -1)
    const result = await getCachedResults('expired')
    expect(result).toBeNull()
  })

  it('removes the expired entry from AsyncStorage', async () => {
    await setCachedResults('expired2', 'data', -1)
    jest.clearAllMocks()
    await getCachedResults('expired2')
    expect(mockRemoveItem).toHaveBeenCalledWith('aiCache:expired2')
  })

  it('returns null when AsyncStorage contains malformed JSON', async () => {
    store['aiCache:bad'] = 'not valid json {'
    expect(await getCachedResults('bad')).toBeNull()
  })

  it('returns null when AsyncStorage.getItem throws', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage unavailable'))
    expect(await getCachedResults('boom')).toBeNull()
  })

  it('uses the aiCache: key prefix', async () => {
    await setCachedResults('mykey', 42, 60_000)
    expect(mockSetItem).toHaveBeenCalledWith(
      'aiCache:mykey',
      expect.any(String),
    )
  })
})

// ─── setCachedResults ─────────────────────────────────────────────────────────

describe('setCachedResults', () => {
  it('stores a value that getCachedResults can retrieve', async () => {
    await setCachedResults('round-trip', { foo: 'bar' }, 60_000)
    const result = await getCachedResults<{ foo: string }>('round-trip')
    expect(result?.foo).toBe('bar')
  })

  it('writes an entry with a future expiresAt', async () => {
    const before = Date.now()
    await setCachedResults('timing', 'value', 60_000)
    const raw = store['aiCache:timing']!
    const entry = JSON.parse(raw)
    expect(entry.expiresAt).toBeGreaterThanOrEqual(before + 60_000)
  })

  it('does not throw when AsyncStorage.setItem rejects', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('disk full'))
    await expect(setCachedResults('fail', 'value', 60_000)).resolves.not.toThrow()
  })
})

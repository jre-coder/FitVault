import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_PROFILE, loadProfile, saveProfile } from '../../services/profileStorage'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const mockGetItem = AsyncStorage.getItem as jest.Mock
const mockSetItem = AsyncStorage.setItem as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── DEFAULT_PROFILE ─────────────────────────────────────────────────────────

describe('DEFAULT_PROFILE', () => {
  it('has empty goals array', () => {
    expect(DEFAULT_PROFILE.goals).toEqual([])
  })

  it('has Intermediate fitness level', () => {
    expect(DEFAULT_PROFILE.fitnessLevel).toBe('Intermediate')
  })

  it('has undefined age', () => {
    expect(DEFAULT_PROFILE.age).toBeUndefined()
  })

  it('has empty sensitiveAreas array', () => {
    expect(DEFAULT_PROFILE.sensitiveAreas).toEqual([])
  })

  it('has Bodyweight as default equipment', () => {
    expect(DEFAULT_PROFILE.equipment).toEqual(['Bodyweight'])
  })

  it('has 30 as default duration', () => {
    expect(DEFAULT_PROFILE.preferredDuration).toBe(30)
  })

  it('has youtube as default platform', () => {
    expect(DEFAULT_PROFILE.preferredPlatforms).toEqual(['youtube'])
  })

  it('has any as default workout type', () => {
    expect(DEFAULT_PROFILE.preferredWorkoutTypes).toEqual(['any'])
  })
})

// ─── loadProfile ─────────────────────────────────────────────────────────────

describe('loadProfile', () => {
  it('returns DEFAULT_PROFILE when nothing stored', async () => {
    mockGetItem.mockResolvedValue(null)
    const result = await loadProfile()
    expect(result).toEqual(DEFAULT_PROFILE)
  })

  it('returns parsed profile when data is stored', async () => {
    const stored = {
      ...DEFAULT_PROFILE,
      goals: ['Strength', 'Fat Loss'],
      fitnessLevel: 'Advanced' as const,
      age: 32,
    }
    mockGetItem.mockResolvedValue(JSON.stringify(stored))
    const result = await loadProfile()
    expect(result).toEqual(stored)
  })

  it('returns DEFAULT_PROFILE on storage error', async () => {
    mockGetItem.mockRejectedValue(new Error('storage unavailable'))
    const result = await loadProfile()
    expect(result).toEqual(DEFAULT_PROFILE)
  })

  it('returns DEFAULT_PROFILE on malformed JSON', async () => {
    mockGetItem.mockResolvedValue('not valid json {{{')
    const result = await loadProfile()
    expect(result).toEqual(DEFAULT_PROFILE)
  })

  it('reads from the correct storage key', async () => {
    mockGetItem.mockResolvedValue(null)
    await loadProfile()
    expect(mockGetItem).toHaveBeenCalledWith('@fitvault:userProfile')
  })

  it('returns a copy of DEFAULT_PROFILE, not the reference', async () => {
    mockGetItem.mockResolvedValue(null)
    const result = await loadProfile()
    result.goals.push('Strength')
    expect(DEFAULT_PROFILE.goals).toEqual([])
  })
})

// ─── saveProfile ─────────────────────────────────────────────────────────────

describe('saveProfile', () => {
  it('serializes profile to the correct key', async () => {
    const profile = { ...DEFAULT_PROFILE, goals: ['Endurance'] }
    await saveProfile(profile)
    expect(mockSetItem).toHaveBeenCalledWith('@fitvault:userProfile', JSON.stringify(profile))
  })

  it('calls setItem exactly once', async () => {
    await saveProfile({ ...DEFAULT_PROFILE })
    expect(mockSetItem).toHaveBeenCalledTimes(1)
  })

  it('does not throw on storage error', async () => {
    mockSetItem.mockRejectedValue(new Error('disk full'))
    await expect(saveProfile({ ...DEFAULT_PROFILE })).resolves.not.toThrow()
  })
})

import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { ProfileProvider, useProfile } from '../../context/ProfileContext'
import * as profileStorage from '../../services/profileStorage'
import { UserProfile } from '../../types'

jest.mock('../../services/profileStorage', () => ({
  loadProfile: jest.fn(),
  saveProfile: jest.fn(),
  DEFAULT_PROFILE: {
    goals: [],
    fitnessLevel: 'Intermediate',
    age: undefined,
    sensitiveAreas: [],
    equipment: ['Bodyweight'],
    preferredDuration: 30,
    preferredPlatforms: ['youtube'],
    preferredWorkoutTypes: ['any'],
  },
}))

const mockLoad = profileStorage.loadProfile as jest.Mock
const mockSave = profileStorage.saveProfile as jest.Mock

const DEFAULT_PROFILE = profileStorage.DEFAULT_PROFILE as UserProfile

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProfileProvider>{children}</ProfileProvider>
)

const STORED_PROFILE: UserProfile = {
  goals: ['Strength', 'Fat Loss'],
  fitnessLevel: 'Advanced',
  age: 32,
  sensitiveAreas: ['Knees'],
  equipment: ['Dumbbells', 'Barbell'],
  preferredDuration: 45,
  preferredPlatforms: ['youtube', 'tiktok'],
  preferredWorkoutTypes: ['strength'],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLoad.mockResolvedValue({ ...DEFAULT_PROFILE })
  mockSave.mockResolvedValue(undefined)
})

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('isLoaded is false before mount completes', () => {
    mockLoad.mockImplementation(() => new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useProfile(), { wrapper })
    expect(result.current.isLoaded).toBe(false)
  })

  it('isLoaded becomes true after mount', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoaded).toBe(true)
  })

  it('loads profile from storage on mount', async () => {
    mockLoad.mockResolvedValue({ ...STORED_PROFILE })
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})
    expect(result.current.profile).toEqual(STORED_PROFILE)
  })

  it('uses DEFAULT_PROFILE shape when storage returns default', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})
    expect(result.current.profile.fitnessLevel).toBe('Intermediate')
    expect(result.current.profile.goals).toEqual([])
  })

  it('isLoaded becomes true even when loadProfile rejects', async () => {
    mockLoad.mockRejectedValue(new Error('storage error'))
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoaded).toBe(true)
  })

  it('profile falls back to DEFAULT_PROFILE shape when loadProfile rejects', async () => {
    mockLoad.mockRejectedValue(new Error('storage error'))
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})
    expect(result.current.profile.fitnessLevel).toBe('Intermediate')
    expect(result.current.profile.goals).toEqual([])
  })
})

// ─── updateProfile ────────────────────────────────────────────────────────────

describe('updateProfile', () => {
  it('merges partial update into existing profile', async () => {
    mockLoad.mockResolvedValue({ ...STORED_PROFILE })
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.updateProfile({ goals: ['Endurance'] })
    })

    expect(result.current.profile.goals).toEqual(['Endurance'])
  })

  it('preserves unrelated fields when updating one field', async () => {
    mockLoad.mockResolvedValue({ ...STORED_PROFILE })
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.updateProfile({ goals: ['Endurance'] })
    })

    expect(result.current.profile.fitnessLevel).toBe(STORED_PROFILE.fitnessLevel)
    expect(result.current.profile.age).toBe(STORED_PROFILE.age)
    expect(result.current.profile.equipment).toEqual(STORED_PROFILE.equipment)
    expect(result.current.profile.preferredDuration).toBe(STORED_PROFILE.preferredDuration)
  })

  it('persists updated profile via saveProfile', async () => {
    mockLoad.mockResolvedValue({ ...STORED_PROFILE })
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.updateProfile({ goals: ['Endurance'] })
    })

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ goals: ['Endurance'] }),
    )
  })

  it('calls saveProfile exactly once per updateProfile call', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.updateProfile({ fitnessLevel: 'Beginner' })
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('isLoaded remains true after updateProfile', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.updateProfile({ fitnessLevel: 'Beginner' })
    })

    expect(result.current.isLoaded).toBe(true)
  })

  it('multiple updates accumulate correctly', async () => {
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.updateProfile({ goals: ['Strength'] })
    })
    act(() => {
      result.current.updateProfile({ fitnessLevel: 'Advanced' })
    })

    expect(result.current.profile.goals).toEqual(['Strength'])
    expect(result.current.profile.fitnessLevel).toBe('Advanced')
  })

  it('can clear optional fields by setting them to undefined', async () => {
    mockLoad.mockResolvedValue({ ...STORED_PROFILE })
    const { result } = renderHook(() => useProfile(), { wrapper })
    await act(async () => {})

    act(() => {
      result.current.updateProfile({ age: undefined })
    })

    expect(result.current.profile.age).toBeUndefined()
  })
})

// ─── useProfile outside provider ─────────────────────────────────────────────

describe('useProfile outside provider', () => {
  it('throws when used outside ProfileProvider', () => {
    expect(() => renderHook(() => useProfile())).toThrow(
      'useProfile must be used within ProfileProvider',
    )
  })
})

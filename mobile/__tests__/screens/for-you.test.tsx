import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { UserProfile } from '../../types'

// Mocks must be declared before imports that depend on them
const mockUseProfile = jest.fn()
jest.mock('../../context/ProfileContext', () => ({
  useProfile: () => mockUseProfile(),
}))

const mockUseSubscription = jest.fn()
jest.mock('../../context/SubscriptionContext', () => ({
  useSubscription: () => mockUseSubscription(),
}))

const mockUseWorkouts = jest.fn()
jest.mock('../../context/WorkoutContext', () => ({
  useWorkouts: () => mockUseWorkouts(),
}))

jest.mock('../../services/claudeService', () => ({
  fetchRecommendations: jest.fn(),
  suggestionToWorkoutItem: jest.fn(),
}))

// AIResultDetailModal uses a Modal — mock it to avoid native presentation in tests
jest.mock('../../components/AIResultDetailModal', () => () => null)
jest.mock('../../components/PaywallModal', () => () => null)
jest.mock('../../components/LockedView', () => {
  const { Text, TouchableOpacity } = require('react-native')
  return ({ title, onUnlock }: { title: string; onUnlock: () => void }) => (
    <>
      <Text>{title}</Text>
      <TouchableOpacity onPress={onUnlock}><Text>Unlock</Text></TouchableOpacity>
    </>
  )
})

import ForYouScreen from '../../app/(tabs)/for-you'

const DEFAULT_PROFILE: UserProfile = {
  goals: [],
  fitnessLevel: 'Intermediate',
  age: undefined,
  sensitiveAreas: [],
  equipment: ['Bodyweight'],
  preferredDuration: 30,
  preferredPlatforms: ['youtube'],
  preferredWorkoutTypes: ['any'],
}

const mockUpdateProfile = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockUseProfile.mockReturnValue({
    profile: { ...DEFAULT_PROFILE },
    isLoaded: true,
    updateProfile: mockUpdateProfile,
  })
  mockUseSubscription.mockReturnValue({ isPremium: true })
  mockUseWorkouts.mockReturnValue({ addWorkout: jest.fn() })
})

// ─── Locked state ─────────────────────────────────────────────────────────────

describe('locked state', () => {
  beforeEach(() => {
    mockUseSubscription.mockReturnValue({ isPremium: false })
  })

  it('shows "Personalized For You" heading', () => {
    render(<ForYouScreen />)
    expect(screen.getByText('Personalized For You')).toBeTruthy()
  })

  it('shows unlock button', () => {
    render(<ForYouScreen />)
    expect(screen.getByText('Unlock')).toBeTruthy()
  })

  it('does not render goals chips when locked', () => {
    render(<ForYouScreen />)
    expect(screen.queryByText('Fat Loss')).toBeNull()
  })
})

// ─── Profile section — empty goals ────────────────────────────────────────────

describe('profile section — empty goals', () => {
  it('shows profile setup prompt when goals is empty', () => {
    render(<ForYouScreen />)
    expect(screen.getByText(/set up your profile/i)).toBeTruthy()
  })

  it('renders all goal option chips from GOAL_OPTIONS', () => {
    render(<ForYouScreen />)
    expect(screen.getByText('Fat Loss')).toBeTruthy()
    expect(screen.getByText('Muscle Growth')).toBeTruthy()
    // 'Strength' also appears in Workout Types — use getAllByText
    expect(screen.getAllByText('Strength').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('General Fitness')).toBeTruthy()
  })

  it('renders fitness level buttons', () => {
    render(<ForYouScreen />)
    expect(screen.getByText('Beginner')).toBeTruthy()
    expect(screen.getByText('Intermediate')).toBeTruthy()
    expect(screen.getByText('Advanced')).toBeTruthy()
  })

  it('renders age input', () => {
    render(<ForYouScreen />)
    expect(screen.getByPlaceholderText('—')).toBeTruthy()
  })
})

// ─── Profile section — populated ─────────────────────────────────────────────

describe('profile section — populated', () => {
  const POPULATED_PROFILE: UserProfile = {
    ...DEFAULT_PROFILE,
    goals: ['Strength', 'Glutes'],
    fitnessLevel: 'Advanced',
    age: 28,
  }

  beforeEach(() => {
    mockUseProfile.mockReturnValue({
      profile: { ...POPULATED_PROFILE },
      isLoaded: true,
      updateProfile: mockUpdateProfile,
    })
  })

  it('renders goal chips for all GOAL_OPTIONS', () => {
    render(<ForYouScreen />)
    // Profile section collapses when goals are set; toggle to expand
    fireEvent.press(screen.getByText('Your Profile'))
    // 'Strength' also appears in Workout Types — use getAllByText; 'Fat Loss' is goals-only
    expect(screen.getAllByText('Strength').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Fat Loss')).toBeTruthy()
  })

  it('fitness level buttons are rendered', () => {
    render(<ForYouScreen />)
    fireEvent.press(screen.getByText('Your Profile'))
    expect(screen.getByText('Beginner')).toBeTruthy()
    expect(screen.getByText('Advanced')).toBeTruthy()
  })

  it('age input is rendered', () => {
    render(<ForYouScreen />)
    fireEvent.press(screen.getByText('Your Profile'))
    expect(screen.getByPlaceholderText('—')).toBeTruthy()
  })
})

// ─── Sensitive areas ──────────────────────────────────────────────────────────

describe('sensitive areas', () => {
  it('shows sensitive areas toggle button', () => {
    render(<ForYouScreen />)
    expect(screen.getByText(/injuries/i)).toBeTruthy()
  })

  it('area chips are not visible before toggle is pressed', () => {
    render(<ForYouScreen />)
    expect(screen.queryByText('Knees')).toBeNull()
  })

  it('tapping toggle reveals area chips inline', () => {
    render(<ForYouScreen />)
    fireEvent.press(screen.getByText(/injuries/i))
    expect(screen.getByText('Knees')).toBeTruthy()
    expect(screen.getByText('Hips')).toBeTruthy()
    expect(screen.getByText('Shoulders')).toBeTruthy()
  })
})

// ─── Preferences section ──────────────────────────────────────────────────────

describe('preferences section', () => {
  it('renders equipment chips from profile.equipment', () => {
    render(<ForYouScreen />)
    // 'Bodyweight' appears in both Equipment chips and Workout Types chips
    expect(screen.getAllByText('Bodyweight').length).toBeGreaterThanOrEqual(1)
  })

  it('renders duration from profile.preferredDuration', () => {
    render(<ForYouScreen />)
    expect(screen.getByText('30 min')).toBeTruthy()
  })

  it('renders platform chips', () => {
    render(<ForYouScreen />)
    expect(screen.getByText('YouTube')).toBeTruthy()
  })

  it('renders workout type chips', () => {
    render(<ForYouScreen />)
    expect(screen.getByText('Any')).toBeTruthy()
  })
})

// ─── Recommend button ─────────────────────────────────────────────────────────

describe('recommend button', () => {
  it('is disabled when equipment is empty', () => {
    mockUseProfile.mockReturnValue({
      profile: { ...DEFAULT_PROFILE, equipment: [] },
      isLoaded: true,
      updateProfile: mockUpdateProfile,
    })
    render(<ForYouScreen />)
    const button = screen.getByText('Get My Recommendations')
    expect(button).toBeTruthy()
    // Button's parent TouchableOpacity should be disabled
    fireEvent.press(button)
    const { fetchRecommendations } = require('../../services/claudeService')
    expect(fetchRecommendations).not.toHaveBeenCalled()
  })

  it('is disabled when platforms is empty', () => {
    mockUseProfile.mockReturnValue({
      profile: { ...DEFAULT_PROFILE, preferredPlatforms: [] },
      isLoaded: true,
      updateProfile: mockUpdateProfile,
    })
    render(<ForYouScreen />)
    const button = screen.getByText('Get My Recommendations')
    fireEvent.press(button)
    const { fetchRecommendations } = require('../../services/claudeService')
    expect(fetchRecommendations).not.toHaveBeenCalled()
  })
})

// ─── Loading state ────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('does not crash when isLoaded is false', () => {
    mockUseProfile.mockReturnValue({
      profile: { ...DEFAULT_PROFILE },
      isLoaded: false,
      updateProfile: mockUpdateProfile,
    })
    expect(() => render(<ForYouScreen />)).not.toThrow()
  })
})

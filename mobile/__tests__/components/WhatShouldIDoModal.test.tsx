import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import WhatShouldIDoModal from '../../components/WhatShouldIDoModal'
import { TodayRecommendation } from '../../types'
import { Routine, WorkoutItem } from '../../types'

const mockIsPremium = { value: false }
const mockGetRecommendation = jest.fn()

jest.mock('../../context/SubscriptionContext', () => ({
  useSubscription: () => ({ isPremium: mockIsPremium.value }),
}))

jest.mock('../../context/WorkoutLogContext', () => ({
  useWorkoutLogs: () => ({ logs: [] }),
}))

jest.mock('../../context/WorkoutContext', () => ({
  useWorkouts: () => ({ workouts: [] }),
}))

jest.mock('../../context/RoutineContext', () => ({
  useRoutines: () => ({ routines: [] }),
}))

jest.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({
    profile: {
      goals: ['Muscle Growth'],
      fitnessLevel: 'Intermediate',
      age: 30,
      sensitiveAreas: [],
      equipment: ['barbell'],
      preferredDuration: 60,
      preferredPlatforms: ['youtube'],
      preferredWorkoutTypes: [],
    },
  }),
}))

jest.mock('../../services/todayRecommendationService', () => ({
  getRecommendation: (...args: unknown[]) => mockGetRecommendation(...args),
}))

const ROUTINE_REC: TodayRecommendation = {
  type: 'routine',
  routine: { id: 'r-push', name: 'Push', items: [], createdAt: '' },
  reason: 'Push muscles are fully recovered — 3 days since your last Push session.',
  readyMuscles: ['Chest', 'Shoulders', 'Arms'],
  fatiguedMuscles: ['Legs'],
  daysSinceLastWorkout: 1,
}

const REST_REC: TodayRecommendation = {
  type: 'rest',
  reason: 'All your muscle groups need more recovery time. Take the day off.',
  readyMuscles: [],
  fatiguedMuscles: ['Chest', 'Back', 'Legs'],
  daysSinceLastWorkout: 0,
}

const NO_ROUTINES_REC: TodayRecommendation = {
  type: 'no_routines',
  reason: 'Add routines to your plan to get daily recommendations.',
  readyMuscles: [],
  fatiguedMuscles: [],
  daysSinceLastWorkout: null,
}

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onRequestUpgrade: jest.fn(),
  onStartWorkout: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsPremium.value = false
  mockGetRecommendation.mockReturnValue(ROUTINE_REC)
})

describe('WhatShouldIDoModal', () => {
  describe('rendering', () => {
    it('renders the modal title', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText('What Should I Do Today?')).toBeTruthy()
    })

    it('does not render when visible is false', () => {
      render(<WhatShouldIDoModal {...defaultProps} visible={false} />)
      expect(screen.queryByText('What Should I Do Today?')).toBeNull()
    })

    it('calls onClose when Cancel is pressed', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Cancel'))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('free user — locked state', () => {
    beforeEach(() => { mockIsPremium.value = false })

    it('shows a locked/upgrade prompt for free users', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText(/unlock/i)).toBeTruthy()
    })

    it('does NOT compute or show a recommendation for free users', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.queryByText('Push')).toBeNull()
    })

    it('calls onRequestUpgrade when the unlock button is pressed', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      fireEvent.press(screen.getByText(/unlock/i))
      expect(defaultProps.onRequestUpgrade).toHaveBeenCalled()
    })
  })

  describe('premium user — routine recommendation', () => {
    beforeEach(() => {
      mockIsPremium.value = true
      mockGetRecommendation.mockReturnValue(ROUTINE_REC)
    })

    it('shows the recommended routine name', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText('Push')).toBeTruthy()
    })

    it('shows the recommendation reason', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText(ROUTINE_REC.reason)).toBeTruthy()
    })

    it('shows ready muscles', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText('Chest')).toBeTruthy()
      expect(screen.getByText('Shoulders')).toBeTruthy()
    })

    it('shows fatigued muscles', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText('Legs')).toBeTruthy()
    })

    it('shows days since last workout', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText(/1 day/i)).toBeTruthy()
    })

    it('shows a Start Workout button', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText(/start/i)).toBeTruthy()
    })

    it('calls onStartWorkout and onClose when Start is pressed', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      fireEvent.press(screen.getByText(/start/i))
      expect(defaultProps.onStartWorkout).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r-push' }),
        expect.any(Array)
      )
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('premium user — rest recommendation', () => {
    beforeEach(() => {
      mockIsPremium.value = true
      mockGetRecommendation.mockReturnValue(REST_REC)
    })

    it('shows a rest day message', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText(/rest/i)).toBeTruthy()
    })

    it('shows the rest reason', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText(REST_REC.reason)).toBeTruthy()
    })

    it('does NOT show a Start Workout button on rest day', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.queryByText(/start workout/i)).toBeNull()
    })
  })

  describe('premium user — no routines', () => {
    beforeEach(() => {
      mockIsPremium.value = true
      mockGetRecommendation.mockReturnValue(NO_ROUTINES_REC)
    })

    it('shows the no-routines message', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.getByText(NO_ROUTINES_REC.reason)).toBeTruthy()
    })

    it('does NOT show a Start Workout button', () => {
      render(<WhatShouldIDoModal {...defaultProps} />)
      expect(screen.queryByText(/start workout/i)).toBeNull()
    })
  })
})

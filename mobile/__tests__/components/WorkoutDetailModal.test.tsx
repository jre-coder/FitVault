import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import WorkoutDetailModal from '../../components/WorkoutDetailModal'
import { WorkoutItem } from '../../types'

// --- Mock history for progression ---
const mockGetExerciseHistory = jest.fn()
const mockGetProgressionSuggestion = jest.fn()

jest.mock('../../services/progressionService', () => ({
  getExerciseHistory: (...args: unknown[]) => mockGetExerciseHistory(...args),
  getProgressionSuggestion: (...args: unknown[]) => mockGetProgressionSuggestion(...args),
}))

jest.mock('../../context/WorkoutLogContext', () => ({
  useWorkoutLogs: () => ({ logs: [] }),
}))

jest.mock('../../context/WorkoutContext', () => ({
  useWorkouts: () => ({
    toggleFavorite: jest.fn(),
    deleteWorkout: jest.fn(),
    workouts: [],
  }),
}))

jest.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({
    profile: {
      goals: [],
      fitnessLevel: 'Intermediate',
      sensitiveAreas: [],
      equipment: [],
      preferredDuration: 60,
      preferredPlatforms: [],
      preferredWorkoutTypes: [],
    },
  }),
}))

const mockGetSeriesForWorkout = jest.fn()

jest.mock('../../context/WorkoutSeriesContext', () => ({
  useWorkoutSeries: () => ({
    getSeriesForWorkout: mockGetSeriesForWorkout,
  }),
}))

const WORKOUT_WITH_EXERCISES: WorkoutItem = {
  id: 'w1',
  title: 'Push Day',
  url: 'https://youtube.com/watch?v=abc',
  sourceType: 'youtube',
  bodyParts: ['Chest', 'Shoulders'],
  notes: '',
  dateAdded: '2026-05-01T00:00:00.000Z',
  isFavorite: false,
  exercises: [
    { name: 'Bench Press', sets: 3, reps: '5', weight: '80kg' },
    { name: 'Cable Row', sets: 3, reps: '10-12' },
  ],
}

const WORKOUT_NO_EXERCISES: WorkoutItem = {
  id: 'w2',
  title: 'Yoga Flow',
  url: 'https://youtube.com/watch?v=yoga',
  sourceType: 'youtube',
  bodyParts: ['Full Body'],
  notes: '',
  dateAdded: '2026-05-01T00:00:00.000Z',
  isFavorite: false,
  exercises: [],
}

const NO_HISTORY = []

const TWO_SESSION_HISTORY = [
  {
    date: '2026-05-01T10:00:00.000Z',
    setCount: 3,
    totalReps: 15,
    avgWeightKg: 80,
    minRepsPerSet: 5,
    maxRepsPerSet: 5,
  },
  {
    date: '2026-05-05T10:00:00.000Z',
    setCount: 3,
    totalReps: 15,
    avgWeightKg: 82.5,
    minRepsPerSet: 5,
    maxRepsPerSet: 5,
  },
]

const defaultProps = {
  workout: WORKOUT_WITH_EXERCISES,
  onClose: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSeriesForWorkout.mockReturnValue(null)
  mockGetExerciseHistory.mockReturnValue(NO_HISTORY)
  mockGetProgressionSuggestion.mockReturnValue({
    exerciseName: 'Bench Press',
    suggestedSets: null,
    suggestedReps: null,
    suggestedWeightKg: null,
    suggestedDurationSeconds: null,
    lastSessionSummary: null,
    trend: 'new' as const,
    rationale: 'First time logging this exercise.',
  })
})

describe('WorkoutDetailModal', () => {
  describe('rendering — basic', () => {
    it('shows the workout title', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getByText('Push Day')).toBeTruthy()
    })

    it('shows exercise names', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getByText('Bench Press')).toBeTruthy()
      expect(screen.getByText('Cable Row')).toBeTruthy()
    })

    it('calls onClose when close button is pressed', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      fireEvent.press(screen.getByTestId('close-button'))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('progress history — no history', () => {
    beforeEach(() => {
      mockGetExerciseHistory.mockReturnValue(NO_HISTORY)
    })

    it('does not show a sessions count when there is no history', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.queryByText(/session/i)).toBeNull()
    })

    it('does not show a personal best when there is no history', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.queryByText(/personal best/i)).toBeNull()
    })
  })

  describe('progress history — with history', () => {
    beforeEach(() => {
      mockGetExerciseHistory.mockReturnValue(TWO_SESSION_HISTORY)
      mockGetProgressionSuggestion.mockReturnValue({
        exerciseName: 'Bench Press',
        suggestedSets: 3,
        suggestedReps: null,
        suggestedWeightKg: 85,
        suggestedDurationSeconds: null,
        lastSessionSummary: '3×5 @ 82.5kg',
        trend: 'improving' as const,
        rationale: "You're progressing well.",
      })
    })

    it('shows the number of sessions logged', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getAllByText(/2 session/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows the personal best weight', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getAllByText(/82\.5\s*kg/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows the last session summary', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getAllByText(/3×5 @ 82\.5kg/).length).toBeGreaterThanOrEqual(1)
    })

    it('shows the trend label for improving exercises', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getAllByText(/improving/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows the suggested next weight', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getAllByText(/85\s*kg/i).length).toBeGreaterThanOrEqual(1)
    })

    it('renders one history section per exercise', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      // Both exercises should have history sections queried via getExerciseHistory
      expect(mockGetExerciseHistory).toHaveBeenCalledWith('Bench Press', expect.any(Array))
      expect(mockGetExerciseHistory).toHaveBeenCalledWith('Cable Row', expect.any(Array))
    })
  })

  describe('progress history — trend labels', () => {
    it('shows "plateau" trend label', () => {
      mockGetExerciseHistory.mockReturnValue(TWO_SESSION_HISTORY)
      mockGetProgressionSuggestion.mockReturnValue({
        exerciseName: 'Bench Press',
        suggestedSets: null,
        suggestedReps: null,
        suggestedWeightKg: 80,
        suggestedDurationSeconds: null,
        lastSessionSummary: '3×5 @ 80kg',
        trend: 'plateau' as const,
        rationale: 'Hold weight and focus on form.',
      })
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getAllByText(/plateau/i).length).toBeGreaterThanOrEqual(1)
    })

    it('shows "regressing" trend label', () => {
      mockGetExerciseHistory.mockReturnValue(TWO_SESSION_HISTORY)
      mockGetProgressionSuggestion.mockReturnValue({
        exerciseName: 'Bench Press',
        suggestedSets: null,
        suggestedReps: null,
        suggestedWeightKg: 77.5,
        suggestedDurationSeconds: null,
        lastSessionSummary: '3×5 @ 77.5kg',
        trend: 'regressing' as const,
        rationale: 'Performance dipped.',
      })
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getAllByText(/regressing/i).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('workout without exercises', () => {
    it('does not show progress section when workout has no exercises', () => {
      render(<WorkoutDetailModal workout={WORKOUT_NO_EXERCISES} onClose={jest.fn()} />)
      expect(mockGetExerciseHistory).not.toHaveBeenCalled()
    })
  })

  describe('safety flags', () => {
    it('shows a safety warning when the workout contains a universally risky exercise', () => {
      const riskyWorkout = {
        ...WORKOUT_WITH_EXERCISES,
        exercises: [{ name: 'Behind-the-Neck Press' }],
      }
      render(<WorkoutDetailModal workout={riskyWorkout} onClose={jest.fn()} />)
      expect(screen.getByTestId('safety-flags')).toBeTruthy()
    })

    it('shows the flagged exercise name in the safety section', () => {
      const riskyWorkout = {
        ...WORKOUT_WITH_EXERCISES,
        exercises: [{ name: 'Behind-the-Neck Press' }],
      }
      render(<WorkoutDetailModal workout={riskyWorkout} onClose={jest.fn()} />)
      expect(screen.getAllByText(/Behind-the-Neck Press/i).length).toBeGreaterThan(0)
    })

    it('does not show the safety section when no exercises are flagged', () => {
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.queryByTestId('safety-flags')).toBeNull()
    })

    it('does not show the safety section when the workout has no exercises', () => {
      render(<WorkoutDetailModal workout={WORKOUT_NO_EXERCISES} onClose={jest.fn()} />)
      expect(screen.queryByTestId('safety-flags')).toBeNull()
    })
  })

  describe('series membership', () => {
    const SERIES = { id: 'series-1', title: 'Jeff Nippard PPL', workoutIds: ['w1', 'w2'], createdAt: '' }

    it('shows series name when workout belongs to a series', () => {
      mockGetSeriesForWorkout.mockReturnValue(SERIES)
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.getByText(/Jeff Nippard PPL/)).toBeTruthy()
    })

    it('shows "Start Series" button when workout belongs to a series', () => {
      mockGetSeriesForWorkout.mockReturnValue(SERIES)
      render(<WorkoutDetailModal {...defaultProps} onStartSeries={jest.fn()} />)
      expect(screen.getByText('Start Series')).toBeTruthy()
    })

    it('calls onStartSeries with the series when Start Series pressed', () => {
      mockGetSeriesForWorkout.mockReturnValue(SERIES)
      const onStartSeries = jest.fn()
      render(<WorkoutDetailModal {...defaultProps} onStartSeries={onStartSeries} />)
      fireEvent.press(screen.getByText('Start Series'))
      expect(onStartSeries).toHaveBeenCalledWith(SERIES)
    })

    it('does not show series section when workout is not in any series', () => {
      mockGetSeriesForWorkout.mockReturnValue(null)
      render(<WorkoutDetailModal {...defaultProps} />)
      expect(screen.queryByText('Start Series')).toBeNull()
    })
  })
})

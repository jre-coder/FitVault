import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import WorkoutExecutionModal from '../../components/WorkoutExecutionModal'
import * as logStorage from '../../services/workoutLogStorage'
import { Routine, WorkoutItem } from '../../types'

// --- Mocks ---

const mockTimer = {
  stopwatchSeconds: 0,
  isStopwatchRunning: false,
  startStopwatch: jest.fn(),
  pauseStopwatch: jest.fn(),
  resetStopwatch: jest.fn(),
  restSecondsRemaining: 60,
  isRestActive: false,
  startRest: jest.fn(),
  cancelRest: jest.fn(),
  onRestComplete: jest.fn(),
}

jest.mock('../../hooks/useWorkoutTimer', () => ({
  useWorkoutTimer: () => mockTimer,
}))

jest.mock('../../services/workoutLogStorage', () => ({
  saveWorkoutLog: jest.fn(),
}))

import { Linking } from 'react-native'

// --- Fixtures ---

const EXERCISE_WORKOUT: WorkoutItem = {
  id: 'w1',
  title: 'Squat Day',
  url: 'https://youtube.com/watch?v=1',
  sourceType: 'youtube',
  bodyParts: ['Legs', 'Glutes'],
  notes: '',
  dateAdded: '2026-04-01T00:00:00.000Z',
  isFavorite: false,
  exercises: [
    { name: 'Barbell Squat', sets: 3, reps: '5', weight: '185 lbs' },
    { name: 'Lunge', sets: 2, reps: '10' },
  ],
}

const REFERENCE_WORKOUT: WorkoutItem = {
  id: 'w2',
  title: 'Yoga Flow',
  url: 'https://youtube.com/watch?v=yoga',
  sourceType: 'youtube',
  bodyParts: ['Full Body'],
  notes: '',
  dateAdded: '2026-04-01T00:00:00.000Z',
  isFavorite: false,
  exercises: [],
}

const SINGLE_EXERCISE_WORKOUT: WorkoutItem = {
  id: 'w3',
  title: 'Quick Core',
  url: 'https://youtube.com/watch?v=core',
  sourceType: 'youtube',
  bodyParts: ['Core'],
  notes: '',
  dateAdded: '2026-04-01T00:00:00.000Z',
  isFavorite: false,
  exercises: [
    { name: 'Plank', sets: 1, duration: '60 seconds' },
  ],
}

const ROUTINE: Routine = {
  id: 'r1',
  name: 'Glute Day',
  items: [
    { workoutItemId: 'w1', order: 0 },
    { workoutItemId: 'w2', order: 1 },
  ],
  createdAt: '2026-04-01T00:00:00.000Z',
}

const SINGLE_STEP_ROUTINE: Routine = {
  id: 'r2',
  name: 'Quick Core',
  items: [{ workoutItemId: 'w3', order: 0 }],
  createdAt: '2026-04-01T00:00:00.000Z',
}

const defaultProps = {
  visible: true,
  routine: ROUTINE,
  workouts: [EXERCISE_WORKOUT, REFERENCE_WORKOUT, SINGLE_EXERCISE_WORKOUT],
  onClose: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockTimer.stopwatchSeconds = 0
  mockTimer.isStopwatchRunning = false
  mockTimer.restSecondsRemaining = 60
  mockTimer.isRestActive = false
  ;(logStorage.saveWorkoutLog as jest.Mock).mockResolvedValue(undefined)
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
})

// Helper to capture and fire the onRestComplete callback
function fireRestComplete() {
  const cb = (mockTimer.onRestComplete as jest.Mock).mock.calls.at(-1)?.[0]
  if (!cb) throw new Error('onRestComplete callback not registered')
  act(() => cb())
}

describe('WorkoutExecutionModal', () => {
  describe('exercise phase — rendering', () => {
    it('shows routine name in header', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      expect(screen.getByText('Glute Day')).toBeTruthy()
    })

    it('shows exercise name for first step', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      expect(screen.getByText('Barbell Squat')).toBeTruthy()
    })

    it('shows sets/reps/weight metadata', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      expect(screen.getByText(/3 sets/)).toBeTruthy()
      expect(screen.getByText(/5 reps/)).toBeTruthy()
      expect(screen.getByText(/185 lbs/)).toBeTruthy()
    })

    it('shows Log Set button', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      expect(screen.getByText('Log Set')).toBeTruthy()
    })

    it('shows Skip button', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      expect(screen.getByText('Skip')).toBeTruthy()
    })

    it('shows exercise progress (Exercise X of N)', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      expect(screen.getByText(/Exercise 1 of 2/)).toBeTruthy()
    })

    it('shows workout progress (Workout X of Z)', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      expect(screen.getByText(/Workout 1 of 2/)).toBeTruthy()
    })

    it('shows set tracker with correct count', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      // 3 sets — first set indicator visible
      expect(screen.getByText(/Set 1 of 3/)).toBeTruthy()
    })

    it('starts stopwatch on mount', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      expect(mockTimer.startStopwatch).toHaveBeenCalled()
    })
  })

  describe('exercise phase — Log Set', () => {
    it('transitions to rest phase when Log Set is pressed (not last set)', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Log Set'))
      expect(mockTimer.pauseStopwatch).toHaveBeenCalled()
      expect(mockTimer.startRest).toHaveBeenCalled()
      // rest UI visible
      expect(screen.getByText('Rest')).toBeTruthy()
    })

    it('advances set counter after rest completes', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Log Set'))
      fireRestComplete()
      expect(screen.getByText(/Set 2 of 3/)).toBeTruthy()
    })

    it('resets and restarts stopwatch when returning from rest', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Log Set'))
      fireRestComplete()
      expect(mockTimer.resetStopwatch).toHaveBeenCalled()
      expect(mockTimer.startStopwatch).toHaveBeenCalledTimes(2)
    })

    it('advances to next exercise after all sets logged', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      // Log all 3 sets of Barbell Squat
      fireEvent.press(screen.getByText('Log Set'))   // set 1 → rest
      fireRestComplete()
      fireEvent.press(screen.getByText('Log Set'))   // set 2 → rest
      fireRestComplete()
      fireEvent.press(screen.getByText('Log Set'))   // set 3 (last) → rest
      fireRestComplete()
      // Now on Lunge (exercise 2 of 2 in Squat Day)
      expect(screen.getByText('Lunge')).toBeTruthy()
    })
  })

  describe('exercise phase — Skip', () => {
    it('advances to next step without logging', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Skip'))
      expect(screen.getByText('Lunge')).toBeTruthy()
      expect(logStorage.saveWorkoutLog).not.toHaveBeenCalled()
    })
  })

  describe('rest phase — rendering', () => {
    it('shows Rest label and seconds remaining', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Log Set'))
      expect(screen.getByText('Rest')).toBeTruthy()
      expect(screen.getByText('1:00')).toBeTruthy()
    })

    it('shows Skip Rest button', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Log Set'))
      expect(screen.getByText('Skip Rest')).toBeTruthy()
    })

    it('does not show Log Set during rest', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Log Set'))
      expect(screen.queryByText('Log Set')).toBeNull()
    })

    it('Skip Rest returns to exercise phase', () => {
      render(<WorkoutExecutionModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Log Set'))
      fireEvent.press(screen.getByText('Skip Rest'))
      expect(mockTimer.cancelRest).toHaveBeenCalled()
      expect(screen.getByText('Log Set')).toBeTruthy()
    })
  })

  describe('reference phase — rendering', () => {
    it('shows reference workout title', () => {
      // Routine that starts with a reference workout
      const refFirstRoutine: Routine = {
        id: 'r3',
        name: 'Yoga Only',
        items: [{ workoutItemId: 'w2', order: 0 }],
        createdAt: '2026-04-01T00:00:00.000Z',
      }
      render(
        <WorkoutExecutionModal
          {...defaultProps}
          routine={refFirstRoutine}
        />
      )
      expect(screen.getByText('Yoga Flow')).toBeTruthy()
    })

    it('shows Open Link button for reference step', () => {
      const refRoutine: Routine = {
        id: 'r3',
        name: 'Yoga Only',
        items: [{ workoutItemId: 'w2', order: 0 }],
        createdAt: '2026-04-01T00:00:00.000Z',
      }
      render(<WorkoutExecutionModal {...defaultProps} routine={refRoutine} />)
      expect(screen.getByText('Open Link')).toBeTruthy()
    })

    it('Open Link calls Linking.openURL', () => {
      const refRoutine: Routine = {
        id: 'r3',
        name: 'Yoga Only',
        items: [{ workoutItemId: 'w2', order: 0 }],
        createdAt: '2026-04-01T00:00:00.000Z',
      }
      render(<WorkoutExecutionModal {...defaultProps} routine={refRoutine} />)
      fireEvent.press(screen.getByText('Open Link'))
      expect(Linking.openURL).toHaveBeenCalledWith('https://youtube.com/watch?v=yoga')
    })

    it('shows Next button (not Log Set) for reference step', () => {
      const refRoutine: Routine = {
        id: 'r3',
        name: 'Yoga Only',
        items: [{ workoutItemId: 'w2', order: 0 }],
        createdAt: '2026-04-01T00:00:00.000Z',
      }
      render(<WorkoutExecutionModal {...defaultProps} routine={refRoutine} />)
      expect(screen.getByText('Done')).toBeTruthy()
      expect(screen.queryByText('Log Set')).toBeNull()
    })

    it('Next on last step goes to complete', () => {
      const refRoutine: Routine = {
        id: 'r3',
        name: 'Yoga Only',
        items: [{ workoutItemId: 'w2', order: 0 }],
        createdAt: '2026-04-01T00:00:00.000Z',
      }
      render(<WorkoutExecutionModal {...defaultProps} routine={refRoutine} />)
      fireEvent.press(screen.getByText('Done'))
      expect(screen.getByText('Workout Complete!')).toBeTruthy()
    })
  })

  describe('complete phase', () => {
    it('goes directly to complete on last set of last exercise (no rest)', () => {
      render(
        <WorkoutExecutionModal
          {...defaultProps}
          routine={SINGLE_STEP_ROUTINE}
        />
      )
      // Plank has 1 set — logging it is the final action
      fireEvent.press(screen.getByText('Log Set'))
      expect(screen.getByText('Workout Complete!')).toBeTruthy()
      expect(mockTimer.startRest).not.toHaveBeenCalled()
    })

    it('shows total sets logged on complete screen', () => {
      render(
        <WorkoutExecutionModal
          {...defaultProps}
          routine={SINGLE_STEP_ROUTINE}
        />
      )
      fireEvent.press(screen.getByText('Log Set'))
      expect(screen.getByText(/1 set/i)).toBeTruthy()
    })

    it('calls saveWorkoutLog exactly once on completion', () => {
      render(
        <WorkoutExecutionModal
          {...defaultProps}
          routine={SINGLE_STEP_ROUTINE}
        />
      )
      fireEvent.press(screen.getByText('Log Set'))
      expect(logStorage.saveWorkoutLog).toHaveBeenCalledTimes(1)
    })

    it('saves log with correct routineId and routineName', () => {
      render(
        <WorkoutExecutionModal
          {...defaultProps}
          routine={SINGLE_STEP_ROUTINE}
        />
      )
      fireEvent.press(screen.getByText('Log Set'))
      const saved = (logStorage.saveWorkoutLog as jest.Mock).mock.calls[0][0]
      expect(saved.routineId).toBe('r2')
      expect(saved.routineName).toBe('Quick Core')
    })

    it('saved log has correct totalSetsLogged', () => {
      render(
        <WorkoutExecutionModal
          {...defaultProps}
          routine={SINGLE_STEP_ROUTINE}
        />
      )
      fireEvent.press(screen.getByText('Log Set'))
      const saved = (logStorage.saveWorkoutLog as jest.Mock).mock.calls[0][0]
      expect(saved.totalSetsLogged).toBe(1)
    })

    it('Done button on complete calls onClose', () => {
      render(
        <WorkoutExecutionModal
          {...defaultProps}
          routine={SINGLE_STEP_ROUTINE}
        />
      )
      fireEvent.press(screen.getByText('Log Set'))
      fireEvent.press(screen.getAllByText('Done')[0])
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })
})

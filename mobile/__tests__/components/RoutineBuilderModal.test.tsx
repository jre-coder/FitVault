import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import RoutineBuilderModal from '../../components/RoutineBuilderModal'
import { WorkoutItem } from '../../types'

const WORKOUTS: WorkoutItem[] = [
  {
    id: 'w1',
    title: 'Squat Tutorial',
    url: 'https://youtube.com/watch?v=1',
    sourceType: 'youtube',
    bodyParts: ['Legs', 'Glutes'],
    notes: '',
    savedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'w2',
    title: 'Push Up Guide',
    url: 'https://youtube.com/watch?v=2',
    sourceType: 'youtube',
    bodyParts: ['Chest', 'Arms'],
    notes: '',
    savedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'w3',
    title: 'Hip Hinge Drill',
    url: 'https://youtube.com/watch?v=3',
    sourceType: 'youtube',
    bodyParts: ['Glutes'],
    notes: '',
    savedAt: '2026-04-01T00:00:00.000Z',
  },
]

jest.mock('../../context/WorkoutContext', () => ({
  useWorkouts: () => ({ workouts: WORKOUTS }),
}))

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onSave: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('RoutineBuilderModal', () => {
  describe('rendering', () => {
    it('shows "New Routine" title when no routine prop', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      expect(screen.getByText('New Routine')).toBeTruthy()
    })

    it('shows "Edit Routine" title when editing existing routine', () => {
      const routine = {
        id: 'r1',
        name: 'Glute Day',
        items: [{ workoutItemId: 'w1', order: 0 }],
        createdAt: '2026-04-01T00:00:00.000Z',
      }
      render(<RoutineBuilderModal {...defaultProps} routine={routine} />)
      expect(screen.getByText('Edit Routine')).toBeTruthy()
    })

    it('renders all workouts from library', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      expect(screen.getByText('Squat Tutorial')).toBeTruthy()
      expect(screen.getByText('Push Up Guide')).toBeTruthy()
      expect(screen.getByText('Hip Hinge Drill')).toBeTruthy()
    })

    it('pre-fills name when editing', () => {
      const routine = {
        id: 'r1',
        name: 'Glute Day',
        items: [],
        createdAt: '2026-04-01T00:00:00.000Z',
      }
      render(<RoutineBuilderModal {...defaultProps} routine={routine} />)
      expect(screen.getByDisplayValue('Glute Day')).toBeTruthy()
    })

    it('pre-selects items when editing', () => {
      const routine = {
        id: 'r1',
        name: 'Glute Day',
        items: [{ workoutItemId: 'w1', order: 0 }],
        createdAt: '2026-04-01T00:00:00.000Z',
      }
      render(<RoutineBuilderModal {...defaultProps} routine={routine} />)
      expect(screen.getByText('1 workout selected')).toBeTruthy()
    })
  })

  describe('name validation', () => {
    it('shows error when saving with empty name', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Save'))
      expect(screen.getByText('Please enter a routine name')).toBeTruthy()
      expect(defaultProps.onSave).not.toHaveBeenCalled()
    })

    it('clears error when user types in name field', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Save'))
      expect(screen.getByText('Please enter a routine name')).toBeTruthy()
      fireEvent.changeText(screen.getByPlaceholderText('Routine name (e.g. Glute Day)'), 'Push Day')
      expect(screen.queryByText('Please enter a routine name')).toBeNull()
    })
  })

  describe('workout selection', () => {
    it('shows selected count when workouts are picked', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Squat Tutorial'))
      expect(screen.getByText('1 workout selected')).toBeTruthy()
    })

    it('shows plural count for multiple selections', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Squat Tutorial'))
      fireEvent.press(screen.getByText('Push Up Guide'))
      expect(screen.getByText('2 workouts selected')).toBeTruthy()
    })

    it('deselects a workout when tapped again', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Squat Tutorial'))
      fireEvent.press(screen.getByText('Squat Tutorial'))
      expect(screen.queryByText(/workout[s]? selected/)).toBeNull()
    })
  })

  describe('search', () => {
    it('filters workouts by search query', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.changeText(screen.getByPlaceholderText('Search your library…'), 'squat')
      expect(screen.getByText('Squat Tutorial')).toBeTruthy()
      expect(screen.queryByText('Push Up Guide')).toBeNull()
    })

    it('shows empty state when no results', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.changeText(screen.getByPlaceholderText('Search your library…'), 'zzznomatch')
      expect(screen.getByText('No workouts match')).toBeTruthy()
    })
  })

  describe('body part filter', () => {
    it('filters workouts by body part', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      // 'Chest' only appears in filter chip (Push Up Guide meta shows "Chest, Arms")
      fireEvent.press(screen.getByText('Chest'))
      expect(screen.getByText('Push Up Guide')).toBeTruthy()
      expect(screen.queryByText('Squat Tutorial')).toBeNull()
      expect(screen.queryByText('Hip Hinge Drill')).toBeNull()
    })

    it('shows all workouts when "All" is selected', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Chest'))
      fireEvent.press(screen.getByText('All'))
      expect(screen.getByText('Squat Tutorial')).toBeTruthy()
      expect(screen.getByText('Push Up Guide')).toBeTruthy()
      expect(screen.getByText('Hip Hinge Drill')).toBeTruthy()
    })
  })

  describe('save', () => {
    it('calls onSave with name and selected items in order', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.changeText(screen.getByPlaceholderText('Routine name (e.g. Glute Day)'), 'Leg Day')
      fireEvent.press(screen.getByText('Squat Tutorial'))
      fireEvent.press(screen.getByText('Hip Hinge Drill'))
      fireEvent.press(screen.getByText('Save'))
      expect(defaultProps.onSave).toHaveBeenCalledWith(
        'Leg Day',
        [
          { workoutItemId: 'w1', order: 0 },
          { workoutItemId: 'w3', order: 1 },
        ]
      )
    })

    it('trims whitespace from name on save', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.changeText(screen.getByPlaceholderText('Routine name (e.g. Glute Day)'), '  Push Day  ')
      fireEvent.press(screen.getByText('Save'))
      expect(defaultProps.onSave).toHaveBeenCalledWith('Push Day', [])
    })
  })

  describe('cancel', () => {
    it('calls onClose when Cancel is pressed', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Cancel'))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('resets state on close', () => {
      render(<RoutineBuilderModal {...defaultProps} />)
      fireEvent.changeText(screen.getByPlaceholderText('Routine name (e.g. Glute Day)'), 'Temp Name')
      fireEvent.press(screen.getByText('Squat Tutorial'))
      fireEvent.press(screen.getByText('Cancel'))
      expect(screen.queryByDisplayValue('Temp Name')).toBeNull()
    })
  })
})

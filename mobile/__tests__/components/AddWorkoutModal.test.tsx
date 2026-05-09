import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import AddWorkoutModal from '../../components/AddWorkoutModal'
import { WorkoutSeries } from '../../types'

// ─── mocks ───────────────────────────────────────────────────────────────────

const mockAddWorkout = jest.fn()
const mockCreateSeries = jest.fn()
const mockAddWorkoutToSeries = jest.fn()

jest.mock('../../context/WorkoutContext', () => ({
  useWorkouts: () => ({ addWorkout: mockAddWorkout }),
}))

jest.mock('../../context/WorkoutSeriesContext', () => ({
  useWorkoutSeries: () => ({
    series: mockExistingSeries(),
    createSeries: mockCreateSeries,
    addWorkoutToSeries: mockAddWorkoutToSeries,
  }),
}))

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn().mockResolvedValue(''),
}))

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}))

// mutable series list for per-test control
let _existingSeries: WorkoutSeries[] = []
function mockExistingSeries() { return _existingSeries }

// ─── helpers ─────────────────────────────────────────────────────────────────

function renderModal(props?: Partial<React.ComponentProps<typeof AddWorkoutModal>>) {
  return render(
    <AddWorkoutModal
      visible={true}
      onClose={jest.fn()}
      {...props}
    />
  )
}

function fillAndSave(utils: ReturnType<typeof render>, title: string, url = 'https://youtube.com/watch?v=1') {
  fireEvent.changeText(utils.getByPlaceholderText('Workout title'), title)
  fireEvent.changeText(utils.getByPlaceholderText('https://'), url)
  fireEvent.press(utils.getByText('Save'))
}

// ─── setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  _existingSeries = []
  mockAddWorkout.mockReturnValue({
    id: 'new-workout-id',
    title: 'Chest Workout Part 1',
    url: 'https://youtube.com/watch?v=1',
    sourceType: 'youtube',
    bodyParts: [],
    notes: '',
    dateAdded: '2026-05-09T00:00:00Z',
    isFavorite: false,
  })
  mockCreateSeries.mockResolvedValue({ id: 'new-series-id', title: 'Chest Workout', workoutIds: ['new-workout-id'], createdAt: '' })
  mockAddWorkoutToSeries.mockResolvedValue(undefined)
})

// ─── basic save (non-series title) ───────────────────────────────────────────

describe('save without series detection', () => {
  it('saves a workout and closes when title has no series pattern', () => {
    const onClose = jest.fn()
    const { getByPlaceholderText, getByText, queryByText } = renderModal({ onClose })
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Upper Body Strength')
    expect(mockAddWorkout).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
    expect(queryByText(/series/i)).toBeNull()
  })
})

// ─── series prompt shown ──────────────────────────────────────────────────────

describe('series detection prompt', () => {
  it('shows a series prompt when title contains "Part N"', () => {
    const { getByPlaceholderText, getByText, queryByText, queryAllByText } = renderModal()
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 1')
    expect(queryAllByText(/series/i).length).toBeGreaterThan(0)
  })

  it('shows detected series name in the prompt', () => {
    const { getByPlaceholderText, getByText, queryByText, getByTestId } = renderModal()
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Jeff Nippard PPL Part 2')
    expect(queryByText(/Jeff Nippard PPL/i)).not.toBeNull()
  })

  it('shows part number in the prompt', () => {
    const { getByPlaceholderText, getByText, queryByText } = renderModal()
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 1')
    expect(queryByText(/part 1/i)).not.toBeNull()
  })

  it('does not call onClose immediately when series prompt shows', () => {
    const onClose = jest.fn()
    const { getByPlaceholderText, getByText, queryByText } = renderModal({ onClose })
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 1')
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ─── "Create New Series" ──────────────────────────────────────────────────────

describe('"Create New Series" action', () => {
  it('calls createSeries with detected name and new workout id', async () => {
    const { getByPlaceholderText, getByText, queryByText } = renderModal()
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 1')
    fireEvent.press(getByText('Create New Series'))
    await waitFor(() => expect(mockCreateSeries).toHaveBeenCalledWith('Chest Workout', ['new-workout-id']))
  })

  it('closes the modal after creating series', async () => {
    const onClose = jest.fn()
    const { getByPlaceholderText, getByText, queryByText } = renderModal({ onClose })
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 1')
    fireEvent.press(getByText('Create New Series'))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})

// ─── "Add to existing series" ─────────────────────────────────────────────────

describe('"Add to existing" action', () => {
  it('shows matching existing series as an option', () => {
    _existingSeries = [
      { id: 'series-1', title: 'Chest Workout', workoutIds: ['w0'], createdAt: '' }
    ]
    const { getByPlaceholderText, getByText, queryByText } = renderModal()
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 2')
    expect(queryByText(/Add to "Chest Workout"/i)).not.toBeNull()
  })

  it('calls addWorkoutToSeries when existing series selected', async () => {
    _existingSeries = [
      { id: 'series-1', title: 'Chest Workout', workoutIds: ['w0'], createdAt: '' }
    ]
    const { getByPlaceholderText, getByText, queryByText } = renderModal()
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 2')
    fireEvent.press(getByText(/Add to "Chest Workout"/i))
    await waitFor(() => expect(mockAddWorkoutToSeries).toHaveBeenCalledWith('series-1', 'new-workout-id'))
  })

  it('closes modal after adding to existing series', async () => {
    const onClose = jest.fn()
    _existingSeries = [
      { id: 'series-1', title: 'Chest Workout', workoutIds: ['w0'], createdAt: '' }
    ]
    const { getByPlaceholderText, getByText, queryByText } = renderModal({ onClose })
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 2')
    fireEvent.press(getByText(/Add to "Chest Workout"/i))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})

// ─── "Skip" ──────────────────────────────────────────────────────────────────

describe('"Skip" action', () => {
  it('closes modal without creating a series', async () => {
    const onClose = jest.fn()
    const { getByPlaceholderText, getByText, queryByText } = renderModal({ onClose })
    fillAndSave({ getByPlaceholderText, getByText, queryByText } as ReturnType<typeof render>, 'Chest Workout Part 1')
    fireEvent.press(getByText('Skip'))
    expect(mockCreateSeries).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

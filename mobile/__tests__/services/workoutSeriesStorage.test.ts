import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getSeries,
  createSeries,
  updateSeries,
  deleteSeries,
  addWorkoutToSeries,
  removeWorkoutFromSeries,
  getSeriesForWorkout,
} from '../../services/workoutSeriesStorage'
import { WorkoutSeries } from '../../types'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

const mockGetItem = AsyncStorage.getItem as jest.Mock
const mockSetItem = AsyncStorage.setItem as jest.Mock

function storedSeries(series: WorkoutSeries[]): void {
  mockGetItem.mockResolvedValue(JSON.stringify(series))
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetItem.mockResolvedValue(null)
  mockSetItem.mockResolvedValue(undefined)
})

// ─── getSeries ────────────────────────────────────────────────────────────────

describe('getSeries', () => {
  it('returns an empty array when no series exist', async () => {
    expect(await getSeries()).toEqual([])
  })

  it('returns stored series', async () => {
    const s: WorkoutSeries = { id: 's1', title: 'PPL Program', workoutIds: ['w1', 'w2'], createdAt: '2026-05-09T00:00:00Z' }
    storedSeries([s])
    expect(await getSeries()).toEqual([s])
  })

  it('returns empty array if storage is corrupted', async () => {
    mockGetItem.mockResolvedValue('not-json{')
    expect(await getSeries()).toEqual([])
  })
})

// ─── createSeries ─────────────────────────────────────────────────────────────

describe('createSeries', () => {
  it('returns a new series with generated id and createdAt', async () => {
    const s = await createSeries('My Program', ['w1', 'w2'])
    expect(s.id).toBeTruthy()
    expect(s.title).toBe('My Program')
    expect(s.workoutIds).toEqual(['w1', 'w2'])
    expect(s.createdAt).toBeTruthy()
  })

  it('persists the new series to AsyncStorage', async () => {
    await createSeries('My Program', ['w1'])
    expect(mockSetItem).toHaveBeenCalled()
    const [, raw] = mockSetItem.mock.calls[0]
    const stored = JSON.parse(raw) as WorkoutSeries[]
    expect(stored[0].title).toBe('My Program')
  })

  it('appends to existing series', async () => {
    const existing: WorkoutSeries = { id: 'existing', title: 'Old', workoutIds: [], createdAt: '' }
    storedSeries([existing])
    await createSeries('New', [])
    const [, raw] = mockSetItem.mock.calls[0]
    const stored = JSON.parse(raw) as WorkoutSeries[]
    expect(stored).toHaveLength(2)
  })
})

// ─── updateSeries ─────────────────────────────────────────────────────────────

describe('updateSeries', () => {
  it('updates the matching series by id', async () => {
    const s: WorkoutSeries = { id: 's1', title: 'Old Title', workoutIds: [], createdAt: '' }
    storedSeries([s])
    await updateSeries({ ...s, title: 'New Title' })
    const [, raw] = mockSetItem.mock.calls[0]
    const stored = JSON.parse(raw) as WorkoutSeries[]
    expect(stored[0].title).toBe('New Title')
  })

  it('does not change other series when updating', async () => {
    const s1: WorkoutSeries = { id: 's1', title: 'A', workoutIds: [], createdAt: '' }
    const s2: WorkoutSeries = { id: 's2', title: 'B', workoutIds: [], createdAt: '' }
    storedSeries([s1, s2])
    await updateSeries({ ...s1, title: 'A Updated' })
    const [, raw] = mockSetItem.mock.calls[0]
    const stored = JSON.parse(raw) as WorkoutSeries[]
    expect(stored.find(s => s.id === 's2')?.title).toBe('B')
  })
})

// ─── deleteSeries ─────────────────────────────────────────────────────────────

describe('deleteSeries', () => {
  it('removes the series with the given id', async () => {
    const s1: WorkoutSeries = { id: 's1', title: 'A', workoutIds: [], createdAt: '' }
    const s2: WorkoutSeries = { id: 's2', title: 'B', workoutIds: [], createdAt: '' }
    storedSeries([s1, s2])
    await deleteSeries('s1')
    const [, raw] = mockSetItem.mock.calls[0]
    const stored = JSON.parse(raw) as WorkoutSeries[]
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('s2')
  })
})

// ─── addWorkoutToSeries ───────────────────────────────────────────────────────

describe('addWorkoutToSeries', () => {
  it('appends a workout id to the series', async () => {
    const s: WorkoutSeries = { id: 's1', title: 'PPL', workoutIds: ['w1'], createdAt: '' }
    storedSeries([s])
    await addWorkoutToSeries('s1', 'w2')
    const [, raw] = mockSetItem.mock.calls[0]
    const stored = JSON.parse(raw) as WorkoutSeries[]
    expect(stored[0].workoutIds).toEqual(['w1', 'w2'])
  })

  it('does not add a duplicate workout id', async () => {
    const s: WorkoutSeries = { id: 's1', title: 'PPL', workoutIds: ['w1', 'w2'], createdAt: '' }
    storedSeries([s])
    await addWorkoutToSeries('s1', 'w1')
    const [, raw] = mockSetItem.mock.calls[0]
    const stored = JSON.parse(raw) as WorkoutSeries[]
    expect(stored[0].workoutIds).toEqual(['w1', 'w2'])
  })
})

// ─── removeWorkoutFromSeries ──────────────────────────────────────────────────

describe('removeWorkoutFromSeries', () => {
  it('removes the workout id from the series', async () => {
    const s: WorkoutSeries = { id: 's1', title: 'PPL', workoutIds: ['w1', 'w2', 'w3'], createdAt: '' }
    storedSeries([s])
    await removeWorkoutFromSeries('s1', 'w2')
    const [, raw] = mockSetItem.mock.calls[0]
    const stored = JSON.parse(raw) as WorkoutSeries[]
    expect(stored[0].workoutIds).toEqual(['w1', 'w3'])
  })
})

// ─── getSeriesForWorkout ──────────────────────────────────────────────────────

describe('getSeriesForWorkout', () => {
  it('returns the series that contains a given workout id', async () => {
    const s1: WorkoutSeries = { id: 's1', title: 'PPL', workoutIds: ['w1', 'w2'], createdAt: '' }
    const s2: WorkoutSeries = { id: 's2', title: 'Other', workoutIds: ['w3'], createdAt: '' }
    storedSeries([s1, s2])
    const result = await getSeriesForWorkout('w2')
    expect(result?.id).toBe('s1')
  })

  it('returns null if the workout is not in any series', async () => {
    const s: WorkoutSeries = { id: 's1', title: 'PPL', workoutIds: ['w1'], createdAt: '' }
    storedSeries([s])
    expect(await getSeriesForWorkout('w999')).toBeNull()
  })
})

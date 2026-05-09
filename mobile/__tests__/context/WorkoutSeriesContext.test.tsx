import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { WorkoutSeriesProvider, useWorkoutSeries } from '../../context/WorkoutSeriesContext'
import * as storage from '../../services/workoutSeriesStorage'
import { WorkoutSeries } from '../../types'

jest.mock('../../services/workoutSeriesStorage', () => ({
  getSeries: jest.fn(),
  createSeries: jest.fn(),
  updateSeries: jest.fn(),
  deleteSeries: jest.fn(),
  addWorkoutToSeries: jest.fn(),
  removeWorkoutFromSeries: jest.fn(),
  getSeriesForWorkout: jest.fn(),
}))

const mockGetSeries = storage.getSeries as jest.Mock
const mockCreateSeries = storage.createSeries as jest.Mock
const mockUpdateSeries = storage.updateSeries as jest.Mock
const mockDeleteSeries = storage.deleteSeries as jest.Mock
const mockAddWorkout = storage.addWorkoutToSeries as jest.Mock
const mockRemoveWorkout = storage.removeWorkoutFromSeries as jest.Mock

const SERIES: WorkoutSeries = {
  id: 's1',
  title: 'Jeff Nippard PPL',
  workoutIds: ['w1', 'w2'],
  createdAt: '2026-05-09T00:00:00Z',
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WorkoutSeriesProvider>{children}</WorkoutSeriesProvider>
)

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSeries.mockResolvedValue([])
  mockCreateSeries.mockImplementation(async (title: string, workoutIds: string[]) => ({
    id: 'new-id',
    title,
    workoutIds,
    createdAt: '2026-05-09T00:00:00Z',
  }))
  mockUpdateSeries.mockResolvedValue(undefined)
  mockDeleteSeries.mockResolvedValue(undefined)
  mockAddWorkout.mockResolvedValue(undefined)
  mockRemoveWorkout.mockResolvedValue(undefined)
})

// ─── initial state ────────────────────────────────────────────────────────────

describe('WorkoutSeriesContext initial state', () => {
  it('starts with empty series array', async () => {
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    expect(result.current.series).toEqual([])
  })

  it('loads series from storage on mount', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    expect(result.current.series).toEqual([SERIES])
  })

  it('sets isLoaded true after mount', async () => {
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoaded).toBe(true)
  })
})

// ─── createSeries ─────────────────────────────────────────────────────────────

describe('createSeries', () => {
  it('calls storage.createSeries with title and workoutIds', async () => {
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    await act(async () => {
      await result.current.createSeries('PPL', ['w1'])
    })
    expect(mockCreateSeries).toHaveBeenCalledWith('PPL', ['w1'])
  })

  it('adds the new series to context state', async () => {
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    await act(async () => {
      await result.current.createSeries('PPL', ['w1'])
    })
    expect(result.current.series).toHaveLength(1)
    expect(result.current.series[0].title).toBe('PPL')
  })

  it('returns the new series', async () => {
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    let created: WorkoutSeries | undefined
    await act(async () => {
      created = await result.current.createSeries('PPL', [])
    })
    expect(created?.id).toBe('new-id')
  })
})

// ─── updateSeries ─────────────────────────────────────────────────────────────

describe('updateSeries', () => {
  it('calls storage.updateSeries', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    const updated = { ...SERIES, title: 'New Name' }
    await act(async () => {
      await result.current.updateSeries(updated)
    })
    expect(mockUpdateSeries).toHaveBeenCalledWith(updated)
  })

  it('updates the series in context state', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    await act(async () => {
      await result.current.updateSeries({ ...SERIES, title: 'New Name' })
    })
    expect(result.current.series[0].title).toBe('New Name')
  })
})

// ─── deleteSeries ─────────────────────────────────────────────────────────────

describe('deleteSeries', () => {
  it('calls storage.deleteSeries with the id', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    await act(async () => {
      await result.current.deleteSeries('s1')
    })
    expect(mockDeleteSeries).toHaveBeenCalledWith('s1')
  })

  it('removes the series from context state', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    await act(async () => {
      await result.current.deleteSeries('s1')
    })
    expect(result.current.series).toHaveLength(0)
  })
})

// ─── addWorkoutToSeries ───────────────────────────────────────────────────────

describe('addWorkoutToSeries', () => {
  it('calls storage.addWorkoutToSeries and refreshes state', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    const refreshed = { ...SERIES, workoutIds: ['w1', 'w2', 'w3'] }
    mockGetSeries.mockResolvedValue([refreshed])
    await act(async () => {
      await result.current.addWorkoutToSeries('s1', 'w3')
    })
    expect(mockAddWorkout).toHaveBeenCalledWith('s1', 'w3')
    expect(result.current.series[0].workoutIds).toContain('w3')
  })
})

// ─── removeWorkoutFromSeries ──────────────────────────────────────────────────

describe('removeWorkoutFromSeries', () => {
  it('calls storage.removeWorkoutFromSeries and refreshes state', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    const refreshed = { ...SERIES, workoutIds: ['w2'] }
    mockGetSeries.mockResolvedValue([refreshed])
    await act(async () => {
      await result.current.removeWorkoutFromSeries('s1', 'w1')
    })
    expect(mockRemoveWorkout).toHaveBeenCalledWith('s1', 'w1')
    expect(result.current.series[0].workoutIds).not.toContain('w1')
  })
})

// ─── getSeriesForWorkout ──────────────────────────────────────────────────────

describe('getSeriesForWorkout', () => {
  it('returns the series containing the workout id', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    const found = result.current.getSeriesForWorkout('w1')
    expect(found?.id).toBe('s1')
  })

  it('returns null when no series contains the workout id', async () => {
    mockGetSeries.mockResolvedValue([SERIES])
    const { result } = renderHook(() => useWorkoutSeries(), { wrapper })
    await act(async () => {})
    expect(result.current.getSeriesForWorkout('w999')).toBeNull()
  })
})

// ─── hook guard ──────────────────────────────────────────────────────────────

describe('useWorkoutSeries guard', () => {
  it('throws when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useWorkoutSeries())).toThrow()
    consoleError.mockRestore()
  })
})

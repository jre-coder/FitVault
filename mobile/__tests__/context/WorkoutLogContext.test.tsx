import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { WorkoutLogProvider, useWorkoutLogs } from '../../context/WorkoutLogContext'
import * as logStorage from '../../services/workoutLogStorage'
import { WorkoutLog } from '../../types'

jest.mock('../../services/workoutLogStorage', () => ({
  loadWorkoutLogs: jest.fn(),
}))

const mockLoad = logStorage.loadWorkoutLogs as jest.Mock

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WorkoutLogProvider>{children}</WorkoutLogProvider>
)

// Helpers to construct logs on specific dates
function makeLog(overrides: Partial<WorkoutLog> & { date: string }): WorkoutLog {
  const { date, ...rest } = overrides
  return {
    id: `log-${date}`,
    routineId: 'r1',
    routineName: 'Test Routine',
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T10:45:00.000Z`,
    durationSeconds: 2700,
    workouts: [],
    totalSetsLogged: 9,
    ...rest,
  }
}

function toLocalDate(isoString: string): string {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const TODAY = toLocalDate(new Date().toISOString())

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalDate(d.toISOString())
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLoad.mockResolvedValue([])
})

describe('WorkoutLogContext', () => {
  describe('initial state', () => {
    it('starts with empty logs and zero stats', async () => {
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.logs).toEqual([])
      expect(result.current.stats.currentStreak).toBe(0)
      expect(result.current.stats.weeklyDurationSeconds).toBe(0)
      expect(result.current.stats.weeklySets).toBe(0)
      expect(result.current.stats.allTimeCount).toBe(0)
    })

    it('starts with empty completedDates', async () => {
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.completedDates.size).toBe(0)
    })

    it('isLoaded is false before load completes and true after', async () => {
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      expect(result.current.isLoaded).toBe(false)
      await act(async () => {})
      expect(result.current.isLoaded).toBe(true)
    })
  })

  describe('loading logs', () => {
    it('loads logs from storage on mount', async () => {
      const log = makeLog({ date: TODAY })
      mockLoad.mockResolvedValue([log])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.logs).toHaveLength(1)
      expect(result.current.logs[0].id).toBe(`log-${TODAY}`)
    })

    it('completedDates contains the date of a loaded log', async () => {
      mockLoad.mockResolvedValue([makeLog({ date: TODAY })])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.completedDates.has(TODAY)).toBe(true)
    })

    it('completedDates uses local calendar date from completedAt', async () => {
      const log = makeLog({ date: daysAgo(2) })
      mockLoad.mockResolvedValue([log])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.completedDates.has(daysAgo(2))).toBe(true)
    })
  })

  describe('streak calculation', () => {
    it('streak is 1 when only today has a log', async () => {
      mockLoad.mockResolvedValue([makeLog({ date: TODAY })])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.currentStreak).toBe(1)
    })

    it('streak is 0 when no logs exist', async () => {
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.currentStreak).toBe(0)
    })

    it('streak counts consecutive days ending today', async () => {
      mockLoad.mockResolvedValue([
        makeLog({ date: TODAY }),
        makeLog({ date: daysAgo(1) }),
        makeLog({ date: daysAgo(2) }),
      ])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.currentStreak).toBe(3)
    })

    it('streak breaks at a gap even if older logs exist', async () => {
      // today and 3 days ago, but 1-2 days ago missing → streak = 1
      mockLoad.mockResolvedValue([
        makeLog({ date: TODAY }),
        makeLog({ date: daysAgo(3) }),
      ])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.currentStreak).toBe(1)
    })

    it('streak is still active if yesterday has a log but today does not', async () => {
      mockLoad.mockResolvedValue([
        makeLog({ date: daysAgo(1) }),
        makeLog({ date: daysAgo(2) }),
      ])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.currentStreak).toBe(2)
    })

    it('streak is 0 if last log was 2+ days ago', async () => {
      mockLoad.mockResolvedValue([
        makeLog({ date: daysAgo(2) }),
        makeLog({ date: daysAgo(3) }),
      ])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.currentStreak).toBe(0)
    })

    it('multiple logs on same day count as a single streak day', async () => {
      mockLoad.mockResolvedValue([
        makeLog({ id: 'a', date: TODAY }),
        makeLog({ id: 'b', date: TODAY }),
        makeLog({ date: daysAgo(1) }),
      ])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.currentStreak).toBe(2)
    })
  })

  describe('weekly stats', () => {
    it('allTimeCount is total log count', async () => {
      mockLoad.mockResolvedValue([
        makeLog({ date: TODAY }),
        makeLog({ date: daysAgo(1) }),
      ])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.allTimeCount).toBe(2)
    })

    it('weeklyDurationSeconds sums logs from this week', async () => {
      mockLoad.mockResolvedValue([
        makeLog({ date: TODAY, durationSeconds: 1800 }),
        makeLog({ date: daysAgo(1), durationSeconds: 2700 }),
      ])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      // Both within the current week (assuming test runs Mon–Sun within one week)
      expect(result.current.stats.weeklyDurationSeconds).toBeGreaterThanOrEqual(1800)
    })

    it('weeklySets sums totalSetsLogged from this week', async () => {
      mockLoad.mockResolvedValue([
        makeLog({ date: TODAY, totalSetsLogged: 9 }),
        makeLog({ date: daysAgo(1), totalSetsLogged: 12 }),
      ])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.weeklySets).toBeGreaterThanOrEqual(9)
    })
  })

  describe('refreshLogs', () => {
    it('reloads logs from storage when called', async () => {
      mockLoad.mockResolvedValue([])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.logs).toHaveLength(0)

      const newLog = makeLog({ date: TODAY })
      mockLoad.mockResolvedValue([newLog])
      await act(async () => {
        await result.current.refreshLogs()
      })
      expect(result.current.logs).toHaveLength(1)
    })

    it('updates stats after refresh', async () => {
      mockLoad.mockResolvedValue([])
      const { result } = renderHook(() => useWorkoutLogs(), { wrapper })
      await act(async () => {})
      expect(result.current.stats.currentStreak).toBe(0)

      mockLoad.mockResolvedValue([makeLog({ date: TODAY })])
      await act(async () => {
        await result.current.refreshLogs()
      })
      expect(result.current.stats.currentStreak).toBe(1)
    })
  })
})

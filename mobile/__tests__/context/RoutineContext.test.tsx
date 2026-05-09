import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { RoutineProvider, useRoutines } from '../../context/RoutineContext'
import * as routineStorage from '../../services/routineStorage'
import { Routine, WeeklySchedule } from '../../types'

jest.mock('../../services/routineStorage', () => ({
  loadRoutines: jest.fn(),
  saveRoutines: jest.fn(),
  loadWeeklySchedule: jest.fn(),
  saveWeeklySchedule: jest.fn(),
  DEFAULT_WEEKLY_SCHEDULE: {
    monday: null, tuesday: null, wednesday: null,
    thursday: null, friday: null, saturday: null, sunday: null,
  },
}))

const mockLoad = routineStorage.loadRoutines as jest.Mock
const mockSave = routineStorage.saveRoutines as jest.Mock
const mockLoadSchedule = routineStorage.loadWeeklySchedule as jest.Mock
const mockSaveSchedule = routineStorage.saveWeeklySchedule as jest.Mock

const DEFAULT_SCHEDULE = routineStorage.DEFAULT_WEEKLY_SCHEDULE

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RoutineProvider>{children}</RoutineProvider>
)

const ROUTINE: Routine = {
  id: 'r1',
  name: 'Glute Day',
  items: [{ workoutItemId: 'w1', order: 0 }],
  createdAt: '2026-04-22T10:00:00.000Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLoad.mockResolvedValue([])
  mockSave.mockResolvedValue(undefined)
  mockLoadSchedule.mockResolvedValue({ ...DEFAULT_SCHEDULE })
  mockSaveSchedule.mockResolvedValue(undefined)
})

describe('RoutineContext', () => {
  describe('initial state', () => {
    it('starts with empty routines', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      expect(result.current.routines).toEqual([])
    })

    it('starts with default weekly schedule', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      expect(result.current.weeklySchedule).toEqual(DEFAULT_SCHEDULE)
    })

    it('loads routines from storage on mount', async () => {
      mockLoad.mockResolvedValue([ROUTINE])
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      expect(result.current.routines).toEqual([ROUTINE])
    })
  })

  describe('addRoutine', () => {
    it('adds a routine with generated id and createdAt', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.addRoutine({ name: 'Push Day', items: [] })
      })
      expect(result.current.routines).toHaveLength(1)
      expect(result.current.routines[0].name).toBe('Push Day')
      expect(result.current.routines[0].id).toBeTruthy()
      expect(result.current.routines[0].createdAt).toBeTruthy()
    })

    it('persists to storage after add', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.addRoutine({ name: 'Push Day', items: [] })
      })
      expect(mockSave).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Push Day' })])
      )
    })
  })

  describe('updateRoutine', () => {
    it('updates an existing routine', async () => {
      mockLoad.mockResolvedValue([ROUTINE])
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.updateRoutine({ ...ROUTINE, name: 'Updated Glute Day' })
      })
      expect(result.current.routines[0].name).toBe('Updated Glute Day')
    })

    it('persists update to storage', async () => {
      mockLoad.mockResolvedValue([ROUTINE])
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.updateRoutine({ ...ROUTINE, name: 'Updated' })
      })
      expect(mockSave).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Updated' })])
      )
    })
  })

  describe('deleteRoutine', () => {
    it('removes the routine', async () => {
      mockLoad.mockResolvedValue([ROUTINE])
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.deleteRoutine('r1')
      })
      expect(result.current.routines).toHaveLength(0)
    })

    it('clears the routine from the schedule when deleted', async () => {
      mockLoad.mockResolvedValue([ROUTINE])
      mockLoadSchedule.mockResolvedValue({ ...DEFAULT_SCHEDULE, monday: 'r1', wednesday: 'r1' })
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.deleteRoutine('r1')
      })
      expect(result.current.weeklySchedule.monday).toBeNull()
      expect(result.current.weeklySchedule.wednesday).toBeNull()
    })
  })

  describe('setDaySchedule', () => {
    it('assigns a routine to a day', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.setDaySchedule('monday', 'r1')
      })
      expect(result.current.weeklySchedule.monday).toBe('r1')
    })

    it('sets a day as rest', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.setDaySchedule('tuesday', 'rest')
      })
      expect(result.current.weeklySchedule.tuesday).toBe('rest')
    })

    it('clears a day when set to null', async () => {
      mockLoadSchedule.mockResolvedValue({ ...DEFAULT_SCHEDULE, friday: 'r1' })
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.setDaySchedule('friday', null)
      })
      expect(result.current.weeklySchedule.friday).toBeNull()
    })

    it('persists schedule to storage', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.setDaySchedule('monday', 'r1')
      })
      expect(mockSaveSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ monday: 'r1' })
      )
    })
  })

  describe('addRoutinesBatch', () => {
    it('adds multiple routines at once', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.addRoutinesBatch([
          { name: 'Push', items: [] },
          { name: 'Pull', items: [] },
          { name: 'Legs', items: [] },
        ])
      })
      expect(result.current.routines).toHaveLength(3)
      expect(result.current.routines.map(r => r.name)).toEqual(
        expect.arrayContaining(['Push', 'Pull', 'Legs'])
      )
    })

    it('returns the created Routine objects with generated ids', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      let created: Routine[] = []
      await act(async () => {
        created = result.current.addRoutinesBatch([
          { name: 'Upper', items: [] },
          { name: 'Lower', items: [] },
        ])
      })
      expect(created).toHaveLength(2)
      expect(created[0].id).toBeTruthy()
      expect(created[1].id).toBeTruthy()
      expect(created[0].id).not.toBe(created[1].id)
      expect(created[0].name).toBe('Upper')
      expect(created[1].name).toBe('Lower')
    })

    it('persists all routines to storage in a single save call', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      await act(async () => {
        result.current.addRoutinesBatch([
          { name: 'A', items: [] },
          { name: 'B', items: [] },
        ])
      })
      // Only one save call for the batch
      expect(mockSave).toHaveBeenCalledTimes(1)
      expect(mockSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'A' }),
          expect.objectContaining({ name: 'B' }),
        ])
      )
    })

    it('handles empty batch without error', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      let created: Routine[] = []
      await act(async () => {
        created = result.current.addRoutinesBatch([])
      })
      expect(created).toEqual([])
      expect(result.current.routines).toHaveLength(0)
    })
  })

  describe('getTodayRoutine', () => {
    it('returns the routine scheduled for today', async () => {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklySchedule
      mockLoad.mockResolvedValue([ROUTINE])
      mockLoadSchedule.mockResolvedValue({ ...DEFAULT_SCHEDULE, [today]: 'r1' })
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      expect(result.current.getTodayRoutine()).toEqual(ROUTINE)
    })

    it('returns null when today has no routine', async () => {
      const { result } = renderHook(() => useRoutines(), { wrapper })
      await act(async () => {})
      expect(result.current.getTodayRoutine()).toBeNull()
    })
  })
})

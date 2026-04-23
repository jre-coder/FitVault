import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  clearWorkoutLogs,
  loadWorkoutLogs,
  saveWorkoutLog,
} from '../../services/workoutLogStorage'
import { WorkoutLog } from '../../types'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

const mockGet = AsyncStorage.getItem as jest.Mock
const mockSet = AsyncStorage.setItem as jest.Mock
const mockRemove = AsyncStorage.removeItem as jest.Mock

const LOG_A: WorkoutLog = {
  id: 'log-a',
  routineId: 'r1',
  routineName: 'Glute Day',
  startedAt: '2026-04-22T10:00:00.000Z',
  completedAt: '2026-04-22T10:45:00.000Z',
  durationSeconds: 2700,
  workouts: [],
  totalSetsLogged: 9,
}

const LOG_B: WorkoutLog = {
  id: 'log-b',
  routineId: 'r2',
  routineName: 'Push Day',
  startedAt: '2026-04-21T09:00:00.000Z',
  completedAt: '2026-04-21T09:50:00.000Z',
  durationSeconds: 3000,
  workouts: [],
  totalSetsLogged: 12,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSet.mockResolvedValue(undefined)
  mockRemove.mockResolvedValue(undefined)
})

describe('workoutLogStorage', () => {
  describe('loadWorkoutLogs', () => {
    it('returns empty array when nothing stored', async () => {
      mockGet.mockResolvedValue(null)
      const result = await loadWorkoutLogs()
      expect(result).toEqual([])
    })

    it('returns parsed logs', async () => {
      mockGet.mockResolvedValue(JSON.stringify([LOG_A, LOG_B]))
      const result = await loadWorkoutLogs()
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('log-a')
      expect(result[1].id).toBe('log-b')
    })

    it('returns empty array on parse error', async () => {
      mockGet.mockResolvedValue('not valid json{{{')
      const result = await loadWorkoutLogs()
      expect(result).toEqual([])
    })

    it('returns empty array on storage error', async () => {
      mockGet.mockRejectedValue(new Error('storage unavailable'))
      const result = await loadWorkoutLogs()
      expect(result).toEqual([])
    })
  })

  describe('saveWorkoutLog', () => {
    it('saves the first log when storage is empty', async () => {
      mockGet.mockResolvedValue(null)
      await saveWorkoutLog(LOG_A)
      expect(mockSet).toHaveBeenCalledWith(
        '@fitvault:workoutLogs',
        JSON.stringify([LOG_A])
      )
    })

    it('prepends new log to existing list (newest first)', async () => {
      mockGet.mockResolvedValue(JSON.stringify([LOG_B]))
      await saveWorkoutLog(LOG_A)
      const saved = JSON.parse((mockSet.mock.calls[0][1] as string))
      expect(saved[0].id).toBe('log-a')
      expect(saved[1].id).toBe('log-b')
    })

    it('does not throw on storage setItem error', async () => {
      mockGet.mockResolvedValue(null)
      mockSet.mockRejectedValue(new Error('disk full'))
      await expect(saveWorkoutLog(LOG_A)).resolves.not.toThrow()
    })

    it('does not throw on storage getItem error', async () => {
      mockGet.mockRejectedValue(new Error('read error'))
      await expect(saveWorkoutLog(LOG_A)).resolves.not.toThrow()
    })
  })

  describe('clearWorkoutLogs', () => {
    it('removes the storage key', async () => {
      await clearWorkoutLogs()
      expect(mockRemove).toHaveBeenCalledWith('@fitvault:workoutLogs')
    })

    it('does not throw on storage error', async () => {
      mockRemove.mockRejectedValue(new Error('remove failed'))
      await expect(clearWorkoutLogs()).resolves.not.toThrow()
    })
  })
})

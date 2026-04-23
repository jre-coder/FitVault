import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  loadRoutines,
  saveRoutines,
  loadWeeklySchedule,
  saveWeeklySchedule,
  DEFAULT_WEEKLY_SCHEDULE,
} from '../../services/routineStorage'
import { Routine, WeeklySchedule } from '../../types'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const mockGet = AsyncStorage.getItem as jest.Mock
const mockSet = AsyncStorage.setItem as jest.Mock

const ROUTINE: Routine = {
  id: 'r1',
  name: 'Glute Day',
  items: [{ workoutItemId: 'w1', order: 0 }, { workoutItemId: 'w2', order: 1 }],
  createdAt: '2026-04-22T10:00:00.000Z',
}

beforeEach(() => jest.clearAllMocks())

describe('loadRoutines', () => {
  it('returns empty array when nothing stored', async () => {
    mockGet.mockResolvedValue(null)
    expect(await loadRoutines()).toEqual([])
  })

  it('returns parsed routines', async () => {
    mockGet.mockResolvedValue(JSON.stringify([ROUTINE]))
    expect(await loadRoutines()).toEqual([ROUTINE])
  })

  it('returns empty array on storage error', async () => {
    mockGet.mockRejectedValue(new Error('disk error'))
    expect(await loadRoutines()).toEqual([])
  })
})

describe('saveRoutines', () => {
  it('serializes routines to storage', async () => {
    mockSet.mockResolvedValue(undefined)
    await saveRoutines([ROUTINE])
    expect(mockSet).toHaveBeenCalledWith('@fitvault:routines', JSON.stringify([ROUTINE]))
  })

  it('does not throw on storage error', async () => {
    mockSet.mockRejectedValue(new Error('disk full'))
    await expect(saveRoutines([ROUTINE])).resolves.not.toThrow()
  })
})

describe('loadWeeklySchedule', () => {
  it('returns default schedule when nothing stored', async () => {
    mockGet.mockResolvedValue(null)
    expect(await loadWeeklySchedule()).toEqual(DEFAULT_WEEKLY_SCHEDULE)
  })

  it('returns stored schedule', async () => {
    const schedule: WeeklySchedule = { ...DEFAULT_WEEKLY_SCHEDULE, monday: 'r1', wednesday: 'rest' }
    mockGet.mockResolvedValue(JSON.stringify(schedule))
    expect(await loadWeeklySchedule()).toEqual(schedule)
  })

  it('returns default schedule on storage error', async () => {
    mockGet.mockRejectedValue(new Error('disk error'))
    expect(await loadWeeklySchedule()).toEqual(DEFAULT_WEEKLY_SCHEDULE)
  })
})

describe('saveWeeklySchedule', () => {
  it('serializes schedule to storage', async () => {
    mockSet.mockResolvedValue(undefined)
    const schedule: WeeklySchedule = { ...DEFAULT_WEEKLY_SCHEDULE, monday: 'r1' }
    await saveWeeklySchedule(schedule)
    expect(mockSet).toHaveBeenCalledWith('@fitvault:weeklySchedule', JSON.stringify(schedule))
  })

  it('does not throw on storage error', async () => {
    mockSet.mockRejectedValue(new Error('disk full'))
    await expect(saveWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE)).resolves.not.toThrow()
  })
})

describe('DEFAULT_WEEKLY_SCHEDULE', () => {
  it('has all seven days set to null', () => {
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    days.forEach(d => expect(DEFAULT_WEEKLY_SCHEDULE[d as keyof WeeklySchedule]).toBeNull())
  })
})

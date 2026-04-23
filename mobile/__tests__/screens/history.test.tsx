import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { WorkoutLog } from '../../types'

// Mock before any imports that depend on it
const mockUseWorkoutLogs = jest.fn()
jest.mock('../../context/WorkoutLogContext', () => ({
  useWorkoutLogs: () => mockUseWorkoutLogs(),
}))

import HistoryScreen from '../../app/(tabs)/history'

function makeLog(overrides: Partial<WorkoutLog> & { daysAgo?: number } = {}): WorkoutLog {
  const { daysAgo = 0, ...rest } = overrides
  const base = new Date()
  base.setDate(base.getDate() - daysAgo)
  return {
    id: `log-${Math.random()}`,
    routineId: 'r1',
    routineName: 'Glute Day',
    startedAt: base.toISOString(),
    completedAt: base.toISOString(),
    durationSeconds: 2700,
    workouts: [],
    totalSetsLogged: 9,
    ...rest,
  }
}

const FULL_STATS = {
  currentStreak: 5,
  weeklyDurationSeconds: 5400,
  weeklySets: 21,
  allTimeCount: 12,
}

const ZERO_STATS = {
  currentStreak: 0,
  weeklyDurationSeconds: 0,
  weeklySets: 0,
  allTimeCount: 0,
}

beforeEach(() => {
  mockUseWorkoutLogs.mockReturnValue({
    logs: [
      makeLog({ daysAgo: 0, routineName: 'Glute Day', durationSeconds: 2700, totalSetsLogged: 9 }),
      makeLog({ daysAgo: 1, routineName: 'Push Day', durationSeconds: 3000, totalSetsLogged: 12 }),
    ],
    stats: FULL_STATS,
    completedDates: new Set(),
    refreshLogs: jest.fn(),
    isLoaded: true,
  })
})

describe('HistoryScreen', () => {
  describe('header', () => {
    it('shows the Activity title', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('Activity')).toBeTruthy()
    })
  })

  describe('stats cards', () => {
    it('shows current streak value', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('5')).toBeTruthy()
      expect(screen.getByText(/streak/i)).toBeTruthy()
    })

    it('shows this-week duration formatted as hours and minutes', () => {
      render(<HistoryScreen />)
      // 5400s = 1h 30min
      expect(screen.getByText('1h 30m')).toBeTruthy()
    })

    it('shows weekly sets count', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('21')).toBeTruthy()
      expect(screen.getByText(/sets this week/i)).toBeTruthy()
    })

    it('shows all-time workout count', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('12')).toBeTruthy()
      expect(screen.getByText(/all.time/i)).toBeTruthy()
    })
  })

  describe('log entries', () => {
    it('shows routine name for each log', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('Glute Day')).toBeTruthy()
      expect(screen.getByText('Push Day')).toBeTruthy()
    })

    it('shows "Today" label for log from today', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('Today')).toBeTruthy()
    })

    it('shows "Yesterday" label for log from yesterday', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('Yesterday')).toBeTruthy()
    })

    it('shows duration formatted for each log', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('45 min')).toBeTruthy()  // 2700s
      expect(screen.getByText('50 min')).toBeTruthy()  // 3000s
    })

    it('shows sets logged for each entry', () => {
      render(<HistoryScreen />)
      expect(screen.getByText('9 sets')).toBeTruthy()
      expect(screen.getByText('12 sets')).toBeTruthy()
    })
  })

  describe('empty state', () => {
    it('shows motivational empty state when no logs', () => {
      mockUseWorkoutLogs.mockReturnValue({
        logs: [],
        stats: ZERO_STATS,
        completedDates: new Set(),
        refreshLogs: jest.fn(),
        isLoaded: true,
      })
      render(<HistoryScreen />)
      expect(screen.getByText(/no workouts yet/i)).toBeTruthy()
    })
  })
})

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { WorkoutLog } from '../types'
import { loadWorkoutLogs } from '../services/workoutLogStorage'

interface WorkoutStats {
  currentStreak: number
  weeklyDurationSeconds: number
  weeklySets: number
  allTimeCount: number
}

interface WorkoutLogContextValue {
  logs: WorkoutLog[]
  stats: WorkoutStats
  completedDates: Set<string>
  refreshLogs: () => Promise<void>
  isLoaded: boolean
}

const ZERO_STATS: WorkoutStats = {
  currentStreak: 0,
  weeklyDurationSeconds: 0,
  weeklySets: 0,
  allTimeCount: 0,
}

const WorkoutLogContext = createContext<WorkoutLogContextValue | null>(null)

function toLocalDateString(isoString: string): string {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay() // 0=Sun
  d.setDate(d.getDate() - ((dow + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

function computeStats(logs: WorkoutLog[]): { stats: WorkoutStats; completedDates: Set<string> } {
  if (logs.length === 0) {
    return { stats: { ...ZERO_STATS }, completedDates: new Set() }
  }

  const completedDates = new Set<string>()
  logs.forEach(log => {
    completedDates.add(toLocalDateString(log.completedAt))
  })

  // Streak: walk backwards from today (or yesterday if today has no log)
  const todayStr = toLocalDateString(new Date().toISOString())
  const anchor = new Date()
  if (!completedDates.has(todayStr)) {
    anchor.setDate(anchor.getDate() - 1)
  }

  let streak = 0
  const cursor = new Date(anchor)
  cursor.setHours(12, 0, 0, 0)
  while (true) {
    const dateStr = toLocalDateString(cursor.toISOString())
    if (!completedDates.has(dateStr)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  // Weekly stats (Mon–Sun of current week)
  const monday = getMondayOfWeek(new Date())
  const sundayEnd = new Date(monday)
  sundayEnd.setDate(monday.getDate() + 7)

  let weeklyDurationSeconds = 0
  let weeklySets = 0
  logs.forEach(log => {
    const completedAt = new Date(log.completedAt)
    if (completedAt >= monday && completedAt < sundayEnd) {
      weeklyDurationSeconds += log.durationSeconds
      weeklySets += log.totalSetsLogged
    }
  })

  return {
    stats: {
      currentStreak: streak,
      weeklyDurationSeconds,
      weeklySets,
      allTimeCount: logs.length,
    },
    completedDates,
  }
}

export function WorkoutLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [stats, setStats] = useState<WorkoutStats>({ ...ZERO_STATS })
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  const loadAndCompute = useCallback(async () => {
    const loaded = await loadWorkoutLogs()
    const { stats: computed, completedDates: dates } = computeStats(loaded)
    setLogs(loaded)
    setStats(computed)
    setCompletedDates(dates)
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    loadAndCompute()
  }, [loadAndCompute])

  const refreshLogs = useCallback(async () => {
    await loadAndCompute()
  }, [loadAndCompute])

  return (
    <WorkoutLogContext.Provider value={{ logs, stats, completedDates, refreshLogs, isLoaded }}>
      {children}
    </WorkoutLogContext.Provider>
  )
}

export function useWorkoutLogs(): WorkoutLogContextValue {
  const ctx = useContext(WorkoutLogContext)
  if (!ctx) throw new Error('useWorkoutLogs must be used within WorkoutLogProvider')
  return ctx
}

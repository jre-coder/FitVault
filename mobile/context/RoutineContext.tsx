import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DayOfWeek, DaySchedule, Routine, RoutineItem, WeeklySchedule } from '../types'
import {
  DEFAULT_WEEKLY_SCHEDULE,
  loadRoutines,
  loadWeeklySchedule,
  saveRoutines,
  saveWeeklySchedule,
} from '../services/routineStorage'

interface RoutineContextValue {
  routines: Routine[]
  weeklySchedule: WeeklySchedule
  isLoaded: boolean
  addRoutine: (data: { name: string; items: RoutineItem[] }) => void
  addRoutinesBatch: (data: Array<{ name: string; items: RoutineItem[] }>) => Routine[]
  updateRoutine: (routine: Routine) => void
  deleteRoutine: (id: string) => void
  setDaySchedule: (day: DayOfWeek, value: DaySchedule) => void
  getTodayRoutine: () => Routine | null
}

const RoutineContext = createContext<RoutineContextValue | null>(null)

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function RoutineProvider({ children }: { children: React.ReactNode }) {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({ ...DEFAULT_WEEKLY_SCHEDULE })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    Promise.all([loadRoutines(), loadWeeklySchedule()]).then(([r, s]) => {
      setRoutines(r)
      setWeeklySchedule(s)
      setIsLoaded(true)
    })
  }, [])

  const addRoutine = useCallback((data: { name: string; items: RoutineItem[] }) => {
    const routine: Routine = {
      id: generateId(),
      name: data.name,
      items: data.items,
      createdAt: new Date().toISOString(),
    }
    setRoutines(prev => {
      const next = [...prev, routine]
      saveRoutines(next)
      return next
    })
  }, [])

  const addRoutinesBatch = useCallback((data: Array<{ name: string; items: RoutineItem[] }>): Routine[] => {
    if (data.length === 0) return []
    const created: Routine[] = data.map(d => ({
      id: generateId(),
      name: d.name,
      items: d.items,
      createdAt: new Date().toISOString(),
    }))
    setRoutines(prev => {
      const next = [...prev, ...created]
      saveRoutines(next)
      return next
    })
    return created
  }, [])

  const updateRoutine = useCallback((routine: Routine) => {
    setRoutines(prev => {
      const next = prev.map(r => (r.id === routine.id ? routine : r))
      saveRoutines(next)
      return next
    })
  }, [])

  const deleteRoutine = useCallback((id: string) => {
    setRoutines(prev => {
      const next = prev.filter(r => r.id !== id)
      saveRoutines(next)
      return next
    })
    setWeeklySchedule(prev => {
      const next = { ...prev }
      const days = Object.keys(next) as DayOfWeek[]
      days.forEach(day => {
        if (next[day] === id) next[day] = null
      })
      saveWeeklySchedule(next)
      return next
    })
  }, [])

  const setDaySchedule = useCallback((day: DayOfWeek, value: DaySchedule) => {
    setWeeklySchedule(prev => {
      const next = { ...prev, [day]: value }
      saveWeeklySchedule(next)
      return next
    })
  }, [])

  const getTodayRoutine = useCallback((): Routine | null => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek
    const routineId = weeklySchedule[day]
    if (!routineId || routineId === 'rest') return null
    return routines.find(r => r.id === routineId) ?? null
  }, [routines, weeklySchedule])

  return (
    <RoutineContext.Provider
      value={{ routines, weeklySchedule, isLoaded, addRoutine, addRoutinesBatch, updateRoutine, deleteRoutine, setDaySchedule, getTodayRoutine }}
    >
      {children}
    </RoutineContext.Provider>
  )
}

export function useRoutines(): RoutineContextValue {
  const ctx = useContext(RoutineContext)
  if (!ctx) throw new Error('useRoutines must be used within RoutineProvider')
  return ctx
}

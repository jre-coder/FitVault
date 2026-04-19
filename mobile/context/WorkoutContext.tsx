import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { WorkoutItem } from '../types'
import { loadWorkouts, saveWorkouts } from '../services/storage'

interface WorkoutContextValue {
  workouts: WorkoutItem[]
  isLoaded: boolean
  addWorkout: (data: Omit<WorkoutItem, 'id' | 'dateAdded'>) => void
  updateWorkout: (id: string, updates: Partial<Omit<WorkoutItem, 'id'>>) => void
  deleteWorkout: (id: string) => void
  toggleFavorite: (id: string) => void
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null)

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    loadWorkouts().then((loaded) => {
      setWorkouts(loaded)
      setIsLoaded(true)
    })
  }, [])

  const addWorkout = useCallback(
    (data: Omit<WorkoutItem, 'id' | 'dateAdded'>) => {
      const newItem: WorkoutItem = {
        ...data,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        dateAdded: new Date().toISOString(),
      }
      setWorkouts((prev) => {
        const updated = [newItem, ...prev]
        saveWorkouts(updated)
        return updated
      })
    },
    [],
  )

  const updateWorkout = useCallback(
    (id: string, updates: Partial<Omit<WorkoutItem, 'id'>>) => {
      setWorkouts((prev) => {
        const updated = prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
        saveWorkouts(updated)
        return updated
      })
    },
    [],
  )

  const deleteWorkout = useCallback((id: string) => {
    setWorkouts((prev) => {
      const updated = prev.filter((w) => w.id !== id)
      saveWorkouts(updated)
      return updated
    })
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setWorkouts((prev) => {
      const updated = prev.map((w) =>
        w.id === id ? { ...w, isFavorite: !w.isFavorite } : w,
      )
      saveWorkouts(updated)
      return updated
    })
  }, [])

  return (
    <WorkoutContext.Provider
      value={{ workouts, isLoaded, addWorkout, updateWorkout, deleteWorkout, toggleFavorite }}
    >
      {children}
    </WorkoutContext.Provider>
  )
}

export function useWorkouts(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext)
  if (!ctx) throw new Error('useWorkouts must be used within WorkoutProvider')
  return ctx
}

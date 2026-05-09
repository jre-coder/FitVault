import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { WorkoutSeries } from '../types'
import {
  getSeries,
  createSeries as storageCreate,
  updateSeries as storageUpdate,
  deleteSeries as storageDelete,
  addWorkoutToSeries as storageAdd,
  removeWorkoutFromSeries as storageRemove,
} from '../services/workoutSeriesStorage'

interface WorkoutSeriesContextValue {
  series: WorkoutSeries[]
  isLoaded: boolean
  createSeries: (title: string, workoutIds: string[]) => Promise<WorkoutSeries>
  updateSeries: (updated: WorkoutSeries) => Promise<void>
  deleteSeries: (id: string) => Promise<void>
  addWorkoutToSeries: (seriesId: string, workoutId: string) => Promise<void>
  removeWorkoutFromSeries: (seriesId: string, workoutId: string) => Promise<void>
  getSeriesForWorkout: (workoutId: string) => WorkoutSeries | null
}

const WorkoutSeriesContext = createContext<WorkoutSeriesContextValue | null>(null)

export function WorkoutSeriesProvider({ children }: { children: React.ReactNode }) {
  const [series, setSeries] = useState<WorkoutSeries[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    getSeries().then(loaded => {
      setSeries(loaded)
      setIsLoaded(true)
    })
  }, [])

  const createSeries = useCallback(async (title: string, workoutIds: string[]): Promise<WorkoutSeries> => {
    const created = await storageCreate(title, workoutIds)
    setSeries(prev => [...prev, created])
    return created
  }, [])

  const updateSeries = useCallback(async (updated: WorkoutSeries): Promise<void> => {
    await storageUpdate(updated)
    setSeries(prev => prev.map(s => s.id === updated.id ? updated : s))
  }, [])

  const deleteSeries = useCallback(async (id: string): Promise<void> => {
    await storageDelete(id)
    setSeries(prev => prev.filter(s => s.id !== id))
  }, [])

  const addWorkoutToSeries = useCallback(async (seriesId: string, workoutId: string): Promise<void> => {
    await storageAdd(seriesId, workoutId)
    const refreshed = await getSeries()
    setSeries(refreshed)
  }, [])

  const removeWorkoutFromSeries = useCallback(async (seriesId: string, workoutId: string): Promise<void> => {
    await storageRemove(seriesId, workoutId)
    const refreshed = await getSeries()
    setSeries(refreshed)
  }, [])

  const getSeriesForWorkout = useCallback((workoutId: string): WorkoutSeries | null => {
    return series.find(s => s.workoutIds.includes(workoutId)) ?? null
  }, [series])

  return (
    <WorkoutSeriesContext.Provider value={{
      series, isLoaded,
      createSeries, updateSeries, deleteSeries,
      addWorkoutToSeries, removeWorkoutFromSeries,
      getSeriesForWorkout,
    }}>
      {children}
    </WorkoutSeriesContext.Provider>
  )
}

export function useWorkoutSeries(): WorkoutSeriesContextValue {
  const ctx = useContext(WorkoutSeriesContext)
  if (!ctx) throw new Error('useWorkoutSeries must be used within WorkoutSeriesProvider')
  return ctx
}

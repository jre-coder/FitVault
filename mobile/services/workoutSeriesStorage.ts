import AsyncStorage from '@react-native-async-storage/async-storage'
import { WorkoutSeries } from '../types'

const SERIES_KEY = '@fitvault:workoutSeries'

export async function getSeries(): Promise<WorkoutSeries[]> {
  try {
    const json = await AsyncStorage.getItem(SERIES_KEY)
    if (!json) return []
    return JSON.parse(json) as WorkoutSeries[]
  } catch {
    return []
  }
}

async function saveSeries(series: WorkoutSeries[]): Promise<void> {
  await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(series))
}

export async function createSeries(title: string, workoutIds: string[]): Promise<WorkoutSeries> {
  const all = await getSeries()
  const series: WorkoutSeries = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    workoutIds,
    createdAt: new Date().toISOString(),
  }
  await saveSeries([...all, series])
  return series
}

export async function updateSeries(updated: WorkoutSeries): Promise<void> {
  const all = await getSeries()
  await saveSeries(all.map(s => s.id === updated.id ? updated : s))
}

export async function deleteSeries(id: string): Promise<void> {
  const all = await getSeries()
  await saveSeries(all.filter(s => s.id !== id))
}

export async function addWorkoutToSeries(seriesId: string, workoutId: string): Promise<void> {
  const all = await getSeries()
  await saveSeries(all.map(s => {
    if (s.id !== seriesId) return s
    if (s.workoutIds.includes(workoutId)) return s
    return { ...s, workoutIds: [...s.workoutIds, workoutId] }
  }))
}

export async function removeWorkoutFromSeries(seriesId: string, workoutId: string): Promise<void> {
  const all = await getSeries()
  await saveSeries(all.map(s => {
    if (s.id !== seriesId) return s
    return { ...s, workoutIds: s.workoutIds.filter(id => id !== workoutId) }
  }))
}

export async function getSeriesForWorkout(workoutId: string): Promise<WorkoutSeries | null> {
  const all = await getSeries()
  return all.find(s => s.workoutIds.includes(workoutId)) ?? null
}

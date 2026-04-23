import AsyncStorage from '@react-native-async-storage/async-storage'
import { WorkoutLog } from '../types'

const LOGS_KEY = '@fitvault:workoutLogs'

export async function loadWorkoutLogs(): Promise<WorkoutLog[]> {
  try {
    const json = await AsyncStorage.getItem(LOGS_KEY)
    if (!json) return []
    return JSON.parse(json) as WorkoutLog[]
  } catch {
    return []
  }
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  try {
    const existing = await loadWorkoutLogs()
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify([log, ...existing]))
  } catch {
    // storage error silently ignored
  }
}

export async function clearWorkoutLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOGS_KEY)
  } catch {
    // storage error silently ignored
  }
}

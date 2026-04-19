import AsyncStorage from '@react-native-async-storage/async-storage'
import { WorkoutItem } from '../types'

const STORAGE_KEY = '@fitvault:workouts'

export async function loadWorkouts(): Promise<WorkoutItem[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY)
    if (!json) return []
    return JSON.parse(json) as WorkoutItem[]
  } catch {
    return []
  }
}

export async function saveWorkouts(workouts: WorkoutItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(workouts))
  } catch {
    // storage error silently ignored
  }
}

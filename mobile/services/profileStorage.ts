import AsyncStorage from '@react-native-async-storage/async-storage'
import { UserProfile } from '../types'

const KEY = '@fitvault:userProfile'

export const DEFAULT_PROFILE: UserProfile = {
  goals: [],
  fitnessLevel: 'Intermediate',
  age: undefined,
  sensitiveAreas: [],
  equipment: ['Bodyweight'],
  preferredDuration: 30,
  preferredPlatforms: ['youtube'],
  preferredWorkoutTypes: ['any'],
}

export async function loadProfile(): Promise<UserProfile> {
  try {
    const json = await AsyncStorage.getItem(KEY)
    if (!json) return JSON.parse(JSON.stringify(DEFAULT_PROFILE)) as UserProfile
    return JSON.parse(json) as UserProfile
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_PROFILE)) as UserProfile
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // storage error silently ignored
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage'
import { Routine, WeeklySchedule } from '../types'

const ROUTINES_KEY = '@fitvault:routines'
const SCHEDULE_KEY = '@fitvault:weeklySchedule'

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
}

export async function loadRoutines(): Promise<Routine[]> {
  try {
    const json = await AsyncStorage.getItem(ROUTINES_KEY)
    if (!json) return []
    return JSON.parse(json) as Routine[]
  } catch {
    return []
  }
}

export async function saveRoutines(routines: Routine[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines))
  } catch {
    // storage error silently ignored
  }
}

export async function loadWeeklySchedule(): Promise<WeeklySchedule> {
  try {
    const json = await AsyncStorage.getItem(SCHEDULE_KEY)
    if (!json) return { ...DEFAULT_WEEKLY_SCHEDULE }
    return JSON.parse(json) as WeeklySchedule
  } catch {
    return { ...DEFAULT_WEEKLY_SCHEDULE }
  }
}

export async function saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
  try {
    await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule))
  } catch {
    // storage error silently ignored
  }
}

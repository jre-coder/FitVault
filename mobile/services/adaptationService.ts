import { WorkoutLog } from '../types'

export type GuidanceLevel = 'full' | 'reduced' | 'minimal'

const REDUCED_THRESHOLD = 4   // sessions before reducing guidance
const MINIMAL_THRESHOLD = 10  // sessions before minimal guidance
const PLATEAU_WINDOW = 4      // sessions to inspect for plateau

function sessionCount(exerciseName: string, logs: WorkoutLog[]): number {
  const nameLower = exerciseName.toLowerCase()
  return logs.filter(log =>
    log.workouts.some(w =>
      !w.skipped &&
      w.setsLogged.some(s => s.exerciseName.toLowerCase() === nameLower)
    )
  ).length
}

export function getGuidanceLevel(exerciseName: string, logs: WorkoutLog[]): GuidanceLevel {
  const count = sessionCount(exerciseName, logs)
  if (count >= MINIMAL_THRESHOLD) return 'minimal'
  if (count >= REDUCED_THRESHOLD) return 'reduced'
  return 'full'
}

export function detectPlateau(exerciseName: string, logs: WorkoutLog[]): boolean {
  const nameLower = exerciseName.toLowerCase()

  // Collect sessions that have weight data for this exercise, sorted oldest → newest
  const sessions = logs
    .filter(log =>
      log.workouts.some(w =>
        !w.skipped &&
        w.setsLogged.some(s => s.exerciseName.toLowerCase() === nameLower && s.weightKg !== undefined)
      )
    )
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())

  if (sessions.length < PLATEAU_WINDOW) return false

  const recent = sessions.slice(-PLATEAU_WINDOW)

  // Extract the max weight logged per session for this exercise
  function maxWeightInSession(log: WorkoutLog): number {
    let max = 0
    for (const w of log.workouts) {
      for (const s of w.setsLogged) {
        if (s.exerciseName.toLowerCase() === nameLower && s.weightKg !== undefined) {
          max = Math.max(max, s.weightKg)
        }
      }
    }
    return max
  }

  const weights = recent.map(maxWeightInSession)
  const firstWeight = weights[0]
  return weights.every(w => w === firstWeight)
}

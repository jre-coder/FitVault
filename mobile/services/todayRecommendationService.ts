import { Routine, TodayRecommendation, UserProfile, WorkoutItem, WorkoutLog } from '../types'

const FATIGUE_THRESHOLD_MS = 48 * 60 * 60 * 1000

function getMuscleLastTrainedMs(
  muscle: string,
  logs: WorkoutLog[],
  workoutMap: Map<string, WorkoutItem>
): number | null {
  let latest: number | null = null
  for (const log of logs) {
    for (const entry of log.workouts) {
      const item = workoutMap.get(entry.workoutItemId)
      if (!item) continue
      if (item.bodyParts.includes(muscle as WorkoutItem['bodyParts'][number])) {
        const ts = new Date(log.completedAt).getTime()
        if (latest === null || ts > latest) latest = ts
      }
    }
  }
  return latest
}

function isFatigued(lastTrainedMs: number | null, now: number): boolean {
  if (lastTrainedMs === null) return false
  return now - lastTrainedMs < FATIGUE_THRESHOLD_MS
}

function getRoutineLastDoneMs(routineId: string, logs: WorkoutLog[]): number | null {
  let latest: number | null = null
  for (const log of logs) {
    if (log.routineId === routineId) {
      const ts = new Date(log.completedAt).getTime()
      if (latest === null || ts > latest) latest = ts
    }
  }
  return latest
}

function getRoutineMuscles(routine: Routine, workoutMap: Map<string, WorkoutItem>): string[] {
  const muscles = new Set<string>()
  for (const item of routine.items) {
    const workout = workoutMap.get(item.workoutItemId)
    if (workout) {
      for (const bp of workout.bodyParts) muscles.add(bp)
    }
  }
  return Array.from(muscles)
}

function buildWorkoutMap(workouts: WorkoutItem[]): Map<string, WorkoutItem> {
  return new Map(workouts.map(w => [w.id, w]))
}

function allMuscleSets(routines: Routine[], workoutMap: Map<string, WorkoutItem>): Set<string> {
  const all = new Set<string>()
  for (const r of routines) {
    for (const m of getRoutineMuscles(r, workoutMap)) all.add(m)
  }
  return all
}

function buildReasonForRoutine(routine: Routine, daysSince: number | null): string {
  if (daysSince === null) {
    return `Start with ${routine.name} — it's your first workout.`
  }
  return `${routine.name} muscles are fully recovered — ${daysSince} day${daysSince === 1 ? '' : 's'} since your last ${routine.name} session.`
}

export function getRecommendation(
  logs: WorkoutLog[],
  workouts: WorkoutItem[],
  routines: Routine[],
  _profile: UserProfile
): TodayRecommendation {
  const now = Date.now()
  const workoutMap = buildWorkoutMap(workouts)

  if (routines.length === 0) {
    return {
      type: 'no_routines',
      reason: 'Add routines to your plan to get daily recommendations.',
      readyMuscles: [],
      fatiguedMuscles: [],
      daysSinceLastWorkout: null,
    }
  }

  // Calculate global daysSinceLastWorkout
  let latestLogMs: number | null = null
  for (const log of logs) {
    const ts = new Date(log.completedAt).getTime()
    if (latestLogMs === null || ts > latestLogMs) latestLogMs = ts
  }
  const daysSinceLastWorkout =
    latestLogMs === null ? null : Math.round((now - latestLogMs) / (24 * 60 * 60 * 1000))

  // Determine global fatigued/ready muscles across all routines
  const allMuscles = allMuscleSets(routines, workoutMap)
  const fatiguedMuscles: string[] = []
  const readyMuscles: string[] = []
  for (const muscle of allMuscles) {
    const lastMs = getMuscleLastTrainedMs(muscle, logs, workoutMap)
    if (isFatigued(lastMs, now)) {
      fatiguedMuscles.push(muscle)
    } else {
      readyMuscles.push(muscle)
    }
  }

  // Score each routine
  // A routine is eligible if at least one of its muscles is NOT fatigued
  // Score = number of ready muscles (higher = better)
  // Tiebreak = longer time since last done (or never done = highest priority)
  type ScoredRoutine = { routine: Routine; readyCount: number; lastDoneMs: number | null }
  const scored: ScoredRoutine[] = []

  for (const routine of routines) {
    const muscles = getRoutineMuscles(routine, workoutMap)
    const routineReady = muscles.filter(m => !isFatigued(getMuscleLastTrainedMs(m, logs, workoutMap), now))
    if (routineReady.length === 0 && muscles.length > 0) continue // all fatigued
    scored.push({
      routine,
      readyCount: routineReady.length,
      lastDoneMs: getRoutineLastDoneMs(routine.id, logs),
    })
  }

  if (scored.length === 0) {
    return {
      type: 'rest',
      reason: 'All your muscle groups need more recovery time. Rest up and come back stronger.',
      readyMuscles,
      fatiguedMuscles,
      daysSinceLastWorkout,
    }
  }

  // Sort: never done first, then most ready muscles, then least recently done
  scored.sort((a, b) => {
    if (a.lastDoneMs === null && b.lastDoneMs !== null) return -1
    if (a.lastDoneMs !== null && b.lastDoneMs === null) return 1
    if (b.readyCount !== a.readyCount) return b.readyCount - a.readyCount
    // Both done — prefer done less recently
    return (a.lastDoneMs ?? 0) - (b.lastDoneMs ?? 0)
  })

  const best = scored[0]
  const routineDaysSince =
    best.lastDoneMs === null
      ? null
      : Math.round((now - best.lastDoneMs) / (24 * 60 * 60 * 1000))

  return {
    type: 'routine',
    routine: best.routine,
    reason: buildReasonForRoutine(best.routine, routineDaysSince),
    readyMuscles,
    fatiguedMuscles,
    daysSinceLastWorkout,
  }
}

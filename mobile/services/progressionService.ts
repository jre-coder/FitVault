import { LoggedSet, ProgressionSuggestion, ProgressionTrend, UserProfile, WorkoutLog } from '../types'

// --- Weight increment tables (kg) ---
const WEIGHT_INCREMENT: Record<string, number> = {
  Beginner: 5,
  Intermediate: 2.5,
  Advanced: 1.25,
}

const AGE_FACTOR = (age?: number): number =>
  age !== undefined && age >= 50 ? 0.5 : 1

// --- Per-session summary for one exercise ---
export interface ExerciseSessionEntry {
  date: string
  setCount: number
  totalReps: number | null
  avgWeightKg: number | null
  minRepsPerSet: number | null
  maxRepsPerSet: number | null
}

function extractSetsForExercise(logs: WorkoutLog[], exerciseName: string): Map<string, LoggedSet[]> {
  // key = log.completedAt (session identifier), value = sets for this exercise
  const bySession = new Map<string, LoggedSet[]>()
  for (const log of logs) {
    for (const lw of log.workouts) {
      for (const s of lw.setsLogged) {
        if (s.exerciseName !== exerciseName) continue
        const key = log.completedAt
        if (!bySession.has(key)) bySession.set(key, [])
        bySession.get(key)!.push(s)
      }
    }
  }
  return bySession
}

export function getExerciseHistory(exerciseName: string, logs: WorkoutLog[]): ExerciseSessionEntry[] {
  const bySession = extractSetsForExercise(logs, exerciseName)
  const entries: ExerciseSessionEntry[] = []

  for (const [date, sets] of bySession) {
    const repsValues = sets.map(s => s.repsCompleted).filter((r): r is number => r !== undefined)
    const weightValues = sets.map(s => s.weightKg).filter((w): w is number => w !== undefined)

    entries.push({
      date,
      setCount: sets.length,
      totalReps: repsValues.length > 0 ? repsValues.reduce((a, b) => a + b, 0) : null,
      avgWeightKg: weightValues.length > 0
        ? Math.round((weightValues.reduce((a, b) => a + b, 0) / weightValues.length) * 100) / 100
        : null,
      minRepsPerSet: repsValues.length > 0 ? Math.min(...repsValues) : null,
      maxRepsPerSet: repsValues.length > 0 ? Math.max(...repsValues) : null,
    })
  }

  return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// --- Trend detection ---
function detectTrend(history: ExerciseSessionEntry[]): ProgressionTrend {
  if (history.length <= 1) return 'new'

  const weightSessions = history.filter(h => h.avgWeightKg !== null)
  if (weightSessions.length >= 2) {
    const last = weightSessions[weightSessions.length - 1].avgWeightKg!
    const prev = weightSessions[weightSessions.length - 2].avgWeightKg!
    if (last > prev) return 'improving'
    if (last < prev) return 'regressing'
    // Check for plateau (3+ sessions at same weight)
    if (weightSessions.length >= 3) {
      const thirdLast = weightSessions[weightSessions.length - 3].avgWeightKg!
      if (last === prev && prev === thirdLast) return 'plateau'
    }
    return 'plateau'
  }

  const repsSessions = history.filter(h => h.totalReps !== null)
  if (repsSessions.length >= 2) {
    const last = repsSessions[repsSessions.length - 1].totalReps!
    const prev = repsSessions[repsSessions.length - 2].totalReps!
    if (last > prev) return 'improving'
    if (last < prev) return 'regressing'
    return 'plateau'
  }

  return 'new'
}

// --- Last session summary string ---
function buildSummary(session: ExerciseSessionEntry): string | null {
  const { setCount, totalReps, avgWeightKg } = session
  if (totalReps === null && avgWeightKg === null) return null
  if (avgWeightKg !== null && totalReps !== null) {
    const repsPerSet = Math.round(totalReps / setCount)
    return `${setCount}×${repsPerSet} @ ${avgWeightKg}kg`
  }
  if (totalReps !== null) {
    const repsPerSet = Math.round(totalReps / setCount)
    return `${setCount} sets × ${repsPerSet} reps`
  }
  return `${setCount} sets`
}

// --- Progression suggestion logic ---
function suggestWeight(
  lastSession: ExerciseSessionEntry,
  profile: UserProfile
): number | null {
  if (lastSession.avgWeightKg === null) return null
  const base = lastSession.avgWeightKg

  // Without reps data we can't confirm the session was completed — don't progress
  if (lastSession.totalReps === null) return base

  // Detect struggle: large range between best and worst set (>33% drop)
  if (lastSession.minRepsPerSet !== null && lastSession.maxRepsPerSet !== null) {
    const range = lastSession.maxRepsPerSet - lastSession.minRepsPerSet
    const dropRatio = lastSession.maxRepsPerSet > 0 ? range / lastSession.maxRepsPerSet : 0
    if (dropRatio > 0.33) return base // reps dropped significantly → hold weight
  }

  const increment = WEIGHT_INCREMENT[profile.fitnessLevel] ?? 2.5
  const ageFactor = AGE_FACTOR(profile.age)
  return Math.round((base + increment * ageFactor) * 100) / 100
}

function suggestReps(lastSession: ExerciseSessionEntry): string | null {
  if (lastSession.totalReps === null || lastSession.setCount === 0) return null
  const repsPerSet = Math.round(lastSession.totalReps / lastSession.setCount)
  return String(repsPerSet + 1)
}

function buildRationale(trend: ProgressionTrend, hasWeight: boolean): string {
  switch (trend) {
    case 'new': return 'First time logging this exercise — start conservatively and track your weights.'
    case 'improving': return hasWeight
      ? 'You\'re progressing well. Keep adding weight each session.'
      : 'Your reps are increasing — great progress.'
    case 'plateau': return 'You\'ve hit a plateau. Consider a deload week or technique adjustment before adding load.'
    case 'regressing': return 'Performance dipped last session. Hold your current weight and focus on form.'
  }
}

export function getProgressionSuggestion(
  exerciseName: string,
  logs: WorkoutLog[],
  profile: UserProfile
): ProgressionSuggestion {
  const history = getExerciseHistory(exerciseName, logs)
  const trend = detectTrend(history)

  if (history.length === 0) {
    return {
      exerciseName,
      suggestedSets: null,
      suggestedReps: null,
      suggestedWeightKg: null,
      suggestedDurationSeconds: null,
      lastSessionSummary: null,
      trend: 'new',
      rationale: buildRationale('new', false),
    }
  }

  const lastSession = history[history.length - 1]
  const hasWeight = lastSession.avgWeightKg !== null
  const rationale = buildRationale(trend, hasWeight)

  let suggestedWeightKg: number | null = null
  let suggestedReps: string | null = null

  if (trend === 'regressing') {
    suggestedWeightKg = hasWeight ? lastSession.avgWeightKg : null
  } else if (hasWeight) {
    suggestedWeightKg = suggestWeight(lastSession, profile)
  } else {
    suggestedReps = suggestReps(lastSession)
  }

  return {
    exerciseName,
    suggestedSets: lastSession.setCount || null,
    suggestedReps,
    suggestedWeightKg,
    suggestedDurationSeconds: null,
    lastSessionSummary: buildSummary(lastSession),
    trend,
    rationale,
  }
}

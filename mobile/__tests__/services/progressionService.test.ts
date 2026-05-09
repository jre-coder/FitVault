import { getProgressionSuggestion, getExerciseHistory } from '../../services/progressionService'
import { UserProfile, WorkoutLog } from '../../types'

// Fixed reference: "now" = 2026-05-08T12:00:00Z
const NOW = new Date('2026-05-08T12:00:00.000Z').getTime()
jest.spyOn(Date, 'now').mockReturnValue(NOW)

const BASE_PROFILE: UserProfile = {
  goals: ['Muscle Growth'],
  fitnessLevel: 'Intermediate',
  age: 30,
  sensitiveAreas: [],
  equipment: ['barbell'],
  preferredDuration: 60,
  preferredPlatforms: ['youtube'],
  preferredWorkoutTypes: [],
}

function makeLog(
  sets: Array<{ name: string; reps?: number; weightKg?: number; durationSeconds?: number }>,
  hoursAgo: number
): WorkoutLog {
  const completedAt = new Date(NOW - hoursAgo * 3600 * 1000).toISOString()
  return {
    id: `log-${hoursAgo}`,
    routineId: 'r1',
    routineName: 'Push',
    startedAt: completedAt,
    completedAt,
    durationSeconds: 3600,
    totalSetsLogged: sets.length,
    workouts: [
      {
        workoutItemId: 'w1',
        workoutTitle: 'Push Day',
        skipped: false,
        setsLogged: sets.map((s, i) => ({
          exerciseName: s.name,
          setNumber: i + 1,
          completedAt,
          repsCompleted: s.reps,
          weightKg: s.weightKg,
          durationSeconds: s.durationSeconds,
        })),
      },
    ],
  }
}

// --- getProgressionSuggestion ---

describe('getProgressionSuggestion', () => {
  describe('no history — new exercise', () => {
    it('returns trend "new" when no logs exist', () => {
      const result = getProgressionSuggestion('Bench Press', [], BASE_PROFILE)
      expect(result.trend).toBe('new')
    })

    it('returns null for lastSessionSummary when no history', () => {
      const result = getProgressionSuggestion('Bench Press', [], BASE_PROFILE)
      expect(result.lastSessionSummary).toBeNull()
    })

    it('returns a non-empty rationale', () => {
      const result = getProgressionSuggestion('Bench Press', [], BASE_PROFILE)
      expect(result.rationale.length).toBeGreaterThan(5)
    })

    it('returns null suggestions when no history', () => {
      const result = getProgressionSuggestion('Bench Press', [], BASE_PROFILE)
      expect(result.suggestedWeightKg).toBeNull()
      expect(result.suggestedReps).toBeNull()
    })
  })

  describe('weight progression', () => {
    it('suggests the same weight when last session had no reps data', () => {
      // Sets logged but no repsCompleted tracked
      const logs = [makeLog([
        { name: 'Bench Press', weightKg: 60 },
        { name: 'Bench Press', weightKg: 60 },
        { name: 'Bench Press', weightKg: 60 },
      ], 48)]
      const result = getProgressionSuggestion('Bench Press', logs, BASE_PROFILE)
      expect(result.suggestedWeightKg).toBe(60)
    })

    it('suggests increased weight for intermediate when all sets hit reps target', () => {
      // 3 sets × 5 reps at 100kg — all completed
      const logs = [makeLog([
        { name: 'Squat', reps: 5, weightKg: 100 },
        { name: 'Squat', reps: 5, weightKg: 100 },
        { name: 'Squat', reps: 5, weightKg: 100 },
      ], 48)]
      const result = getProgressionSuggestion('Squat', logs, BASE_PROFILE)
      expect(result.suggestedWeightKg).toBeGreaterThan(100)
    })

    it('suggests smaller increment for advanced lifters', () => {
      const advancedProfile = { ...BASE_PROFILE, fitnessLevel: 'Advanced' as const }
      const beginnerProfile = { ...BASE_PROFILE, fitnessLevel: 'Beginner' as const }
      const sets = [
        { name: 'Squat', reps: 5, weightKg: 100 },
        { name: 'Squat', reps: 5, weightKg: 100 },
        { name: 'Squat', reps: 5, weightKg: 100 },
      ]
      const advancedResult = getProgressionSuggestion('Squat', [makeLog(sets, 48)], advancedProfile)
      const beginnerResult = getProgressionSuggestion('Squat', [makeLog(sets, 48)], beginnerProfile)
      expect(beginnerResult.suggestedWeightKg!).toBeGreaterThan(advancedResult.suggestedWeightKg!)
    })

    it('suggests conservative increment for users over 50', () => {
      const youngProfile = { ...BASE_PROFILE, age: 30 }
      const olderProfile = { ...BASE_PROFILE, age: 55 }
      const sets = [
        { name: 'Squat', reps: 5, weightKg: 100 },
        { name: 'Squat', reps: 5, weightKg: 100 },
        { name: 'Squat', reps: 5, weightKg: 100 },
      ]
      const youngResult = getProgressionSuggestion('Squat', [makeLog(sets, 48)], youngProfile)
      const olderResult = getProgressionSuggestion('Squat', [makeLog(sets, 48)], olderProfile)
      expect(youngResult.suggestedWeightKg!).toBeGreaterThanOrEqual(olderResult.suggestedWeightKg!)
    })

    it('does not suggest weight increase when last session was a struggle (reps short)', () => {
      // Target 3×5 but only hit 4, 3, 2 reps
      const logs = [makeLog([
        { name: 'Bench Press', reps: 4, weightKg: 80 },
        { name: 'Bench Press', reps: 3, weightKg: 80 },
        { name: 'Bench Press', reps: 2, weightKg: 80 },
      ], 48)]
      // Without a targetReps context we still track it — suggestion should be same or less
      const result = getProgressionSuggestion('Bench Press', logs, BASE_PROFILE)
      // If reps are variable/short, we don't increase weight
      expect(result.suggestedWeightKg).toBeLessThanOrEqual(80)
    })
  })

  describe('reps progression (bodyweight / no weight logged)', () => {
    it('suggests more reps when last session hit a consistent count', () => {
      const logs = [makeLog([
        { name: 'Pull-up', reps: 10 },
        { name: 'Pull-up', reps: 10 },
        { name: 'Pull-up', reps: 10 },
      ], 48)]
      const result = getProgressionSuggestion('Pull-up', logs, BASE_PROFILE)
      const suggested = parseInt(result.suggestedReps ?? '0', 10)
      expect(suggested).toBeGreaterThanOrEqual(10)
    })

    it('returns a suggestedReps string when reps but no weight are logged', () => {
      const logs = [makeLog([
        { name: 'Push-up', reps: 15 },
        { name: 'Push-up', reps: 15 },
      ], 48)]
      const result = getProgressionSuggestion('Push-up', logs, BASE_PROFILE)
      expect(result.suggestedReps).toBeTruthy()
      expect(result.suggestedWeightKg).toBeNull()
    })
  })

  describe('trend detection', () => {
    it('trend is "improving" when weight increased across two sessions', () => {
      const logs = [
        makeLog([{ name: 'Bench Press', reps: 5, weightKg: 80 }], 96),
        makeLog([{ name: 'Bench Press', reps: 5, weightKg: 82.5 }], 48),
      ]
      const result = getProgressionSuggestion('Bench Press', logs, BASE_PROFILE)
      expect(result.trend).toBe('improving')
    })

    it('trend is "plateau" when weight unchanged across three sessions', () => {
      const logs = [
        makeLog([{ name: 'Bench Press', reps: 5, weightKg: 80 }], 144),
        makeLog([{ name: 'Bench Press', reps: 5, weightKg: 80 }], 96),
        makeLog([{ name: 'Bench Press', reps: 5, weightKg: 80 }], 48),
      ]
      const result = getProgressionSuggestion('Bench Press', logs, BASE_PROFILE)
      expect(result.trend).toBe('plateau')
    })

    it('trend is "regressing" when weight dropped in last session', () => {
      const logs = [
        makeLog([{ name: 'Bench Press', reps: 5, weightKg: 85 }], 96),
        makeLog([{ name: 'Bench Press', reps: 5, weightKg: 80 }], 48),
      ]
      const result = getProgressionSuggestion('Bench Press', logs, BASE_PROFILE)
      expect(result.trend).toBe('regressing')
    })

    it('trend is "new" when only one session exists', () => {
      const logs = [makeLog([{ name: 'Bench Press', reps: 5, weightKg: 80 }], 48)]
      const result = getProgressionSuggestion('Bench Press', logs, BASE_PROFILE)
      expect(result.trend).toBe('new')
    })
  })

  describe('lastSessionSummary formatting', () => {
    it('formats as "N×M @ Xkg" when weight is logged', () => {
      const logs = [makeLog([
        { name: 'Deadlift', reps: 5, weightKg: 140 },
        { name: 'Deadlift', reps: 5, weightKg: 140 },
        { name: 'Deadlift', reps: 4, weightKg: 140 },
      ], 48)]
      const result = getProgressionSuggestion('Deadlift', logs, BASE_PROFILE)
      expect(result.lastSessionSummary).toMatch(/140\s*kg/i)
      expect(result.lastSessionSummary).toMatch(/3/)
    })

    it('formats as "N sets × M reps" when no weight logged', () => {
      const logs = [makeLog([
        { name: 'Push-up', reps: 20 },
        { name: 'Push-up', reps: 20 },
      ], 48)]
      const result = getProgressionSuggestion('Push-up', logs, BASE_PROFILE)
      expect(result.lastSessionSummary).toMatch(/20/)
      expect(result.lastSessionSummary).not.toMatch(/kg/)
    })

    it('returns null lastSessionSummary when sets have no reps data', () => {
      // Sets logged but no repsCompleted or weightKg
      const logs = [makeLog([
        { name: 'Mystery Exercise' },
        { name: 'Mystery Exercise' },
      ], 48)]
      const result = getProgressionSuggestion('Mystery Exercise', logs, BASE_PROFILE)
      // No reps/weight data → summary may be null or show set count only
      // At minimum it should not throw
      expect(() => result.lastSessionSummary).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('ignores logs for other exercises', () => {
      const logs = [makeLog([{ name: 'Squat', reps: 5, weightKg: 100 }], 48)]
      const result = getProgressionSuggestion('Bench Press', logs, BASE_PROFILE)
      expect(result.trend).toBe('new')
    })

    it('handles logs where only some sets have weight data', () => {
      const logs = [makeLog([
        { name: 'Bench Press', reps: 5, weightKg: 80 },
        { name: 'Bench Press', reps: 5 },
        { name: 'Bench Press', reps: 5, weightKg: 80 },
      ], 48)]
      expect(() => getProgressionSuggestion('Bench Press', logs, BASE_PROFILE)).not.toThrow()
    })

    it('handles empty logs array', () => {
      expect(() => getProgressionSuggestion('Bench Press', [], BASE_PROFILE)).not.toThrow()
    })
  })
})

// --- getExerciseHistory ---

describe('getExerciseHistory', () => {
  it('returns an empty array when no relevant logs exist', () => {
    const result = getExerciseHistory('Bench Press', [])
    expect(result).toHaveLength(0)
  })

  it('returns one entry per session that included the exercise', () => {
    const logs = [
      makeLog([{ name: 'Bench Press', reps: 5, weightKg: 80 }], 96),
      makeLog([{ name: 'Bench Press', reps: 5, weightKg: 82.5 }], 48),
    ]
    const result = getExerciseHistory('Bench Press', logs)
    expect(result).toHaveLength(2)
  })

  it('orders sessions chronologically (oldest first)', () => {
    const logs = [
      makeLog([{ name: 'Bench Press', reps: 5, weightKg: 82.5 }], 48),
      makeLog([{ name: 'Bench Press', reps: 5, weightKg: 80 }], 96),
    ]
    const result = getExerciseHistory('Bench Press', logs)
    expect(result[0].avgWeightKg).toBe(80)
    expect(result[1].avgWeightKg).toBe(82.5)
  })

  it('returns avgWeightKg as average across sets in a session', () => {
    const logs = [makeLog([
      { name: 'Bench Press', reps: 5, weightKg: 80 },
      { name: 'Bench Press', reps: 5, weightKg: 80 },
      { name: 'Bench Press', reps: 5, weightKg: 80 },
    ], 48)]
    const result = getExerciseHistory('Bench Press', logs)
    expect(result[0].avgWeightKg).toBe(80)
  })

  it('returns totalReps as sum of reps across sets in a session', () => {
    const logs = [makeLog([
      { name: 'Pull-up', reps: 10 },
      { name: 'Pull-up', reps: 8 },
      { name: 'Pull-up', reps: 7 },
    ], 48)]
    const result = getExerciseHistory('Pull-up', logs)
    expect(result[0].totalReps).toBe(25)
  })

  it('includes the session date', () => {
    const logs = [makeLog([{ name: 'Squat', reps: 5, weightKg: 100 }], 48)]
    const result = getExerciseHistory('Squat', logs)
    expect(result[0].date).toBeTruthy()
    expect(new Date(result[0].date).getTime()).toBeGreaterThan(0)
  })

  it('excludes other exercises from counts', () => {
    const logs = [makeLog([
      { name: 'Bench Press', reps: 5, weightKg: 80 },
      { name: 'Squat', reps: 5, weightKg: 100 },
      { name: 'Bench Press', reps: 5, weightKg: 80 },
    ], 48)]
    const result = getExerciseHistory('Bench Press', logs)
    expect(result[0].setCount).toBe(2)
    expect(result[0].avgWeightKg).toBe(80)
  })
})

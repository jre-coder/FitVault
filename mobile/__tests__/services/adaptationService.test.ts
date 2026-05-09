import { getGuidanceLevel, detectPlateau, GuidanceLevel } from '../../services/adaptationService'
import { WorkoutLog } from '../../types'

function makeLog(exerciseName: string, sets: number, weightKg?: number, date = '2026-05-01T10:00:00Z'): WorkoutLog {
  return {
    id: `log-${Math.random()}`,
    routineId: 'r1',
    routineName: 'Test Routine',
    startedAt: date,
    completedAt: date,
    durationSeconds: 3600,
    totalSetsLogged: sets,
    workouts: [
      {
        workoutItemId: 'w1',
        workoutTitle: 'Test Workout',
        skipped: false,
        setsLogged: Array.from({ length: sets }, (_, i) => ({
          exerciseName,
          setNumber: i + 1,
          completedAt: date,
          repsCompleted: 8,
          weightKg,
        })),
      },
    ],
  }
}

// ─── getGuidanceLevel ─────────────────────────────────────────────────────────

describe('getGuidanceLevel', () => {
  it('returns "full" when exercise has never been logged', () => {
    expect(getGuidanceLevel('Bench Press', [])).toBe<GuidanceLevel>('full')
  })

  it('returns "full" when exercise has fewer than 4 sessions', () => {
    const logs = [
      makeLog('Bench Press', 3),
      makeLog('Bench Press', 3),
      makeLog('Bench Press', 3),
    ]
    expect(getGuidanceLevel('Bench Press', logs)).toBe<GuidanceLevel>('full')
  })

  it('returns "reduced" when exercise has 4–9 sessions', () => {
    const logs = Array.from({ length: 5 }, () => makeLog('Bench Press', 3))
    expect(getGuidanceLevel('Bench Press', logs)).toBe<GuidanceLevel>('reduced')
  })

  it('returns "minimal" when exercise has 10 or more sessions', () => {
    const logs = Array.from({ length: 10 }, () => makeLog('Bench Press', 3))
    expect(getGuidanceLevel('Bench Press', logs)).toBe<GuidanceLevel>('minimal')
  })

  it('counts only sessions that include the given exercise', () => {
    const logs = [
      makeLog('Bench Press', 3),
      makeLog('Squat', 3),
      makeLog('Bench Press', 3),
    ]
    expect(getGuidanceLevel('Bench Press', logs)).toBe<GuidanceLevel>('full')
    expect(getGuidanceLevel('Squat', logs)).toBe<GuidanceLevel>('full')
  })

  it('is case-insensitive for exercise name matching', () => {
    const logs = Array.from({ length: 5 }, () => makeLog('bench press', 3))
    expect(getGuidanceLevel('Bench Press', logs)).toBe<GuidanceLevel>('reduced')
  })

  it('counts each log session once even if it has multiple sets', () => {
    const logs = Array.from({ length: 5 }, () => makeLog('Bench Press', 5))
    expect(getGuidanceLevel('Bench Press', logs)).toBe<GuidanceLevel>('reduced')
  })

  it('skips skipped workouts when counting sessions', () => {
    const logs: WorkoutLog[] = [
      {
        id: 'log-1',
        routineId: 'r1',
        routineName: 'Test',
        startedAt: '2026-05-01T10:00:00Z',
        completedAt: '2026-05-01T10:00:00Z',
        durationSeconds: 0,
        totalSetsLogged: 0,
        workouts: [{ workoutItemId: 'w1', workoutTitle: 'Test', skipped: true, setsLogged: [] }],
      },
      ...Array.from({ length: 3 }, () => makeLog('Bench Press', 3)),
    ]
    expect(getGuidanceLevel('Bench Press', logs)).toBe<GuidanceLevel>('full')
  })
})

// ─── detectPlateau ────────────────────────────────────────────────────────────

describe('detectPlateau', () => {
  it('returns false when fewer than 4 sessions exist', () => {
    const logs = [
      makeLog('Bench Press', 3, 80),
      makeLog('Bench Press', 3, 80),
    ]
    expect(detectPlateau('Bench Press', logs)).toBe(false)
  })

  it('returns false when exercise has never been logged', () => {
    expect(detectPlateau('Bench Press', [])).toBe(false)
  })

  it('returns true when weight has not increased over the last 4 sessions', () => {
    const logs = Array.from({ length: 4 }, () => makeLog('Bench Press', 3, 80))
    expect(detectPlateau('Bench Press', logs)).toBe(true)
  })

  it('returns false when weight increased in the last 4 sessions', () => {
    const logs = [
      makeLog('Bench Press', 3, 80, '2026-04-01T10:00:00Z'),
      makeLog('Bench Press', 3, 82.5, '2026-04-08T10:00:00Z'),
      makeLog('Bench Press', 3, 82.5, '2026-04-15T10:00:00Z'),
      makeLog('Bench Press', 3, 85, '2026-04-22T10:00:00Z'),
    ]
    expect(detectPlateau('Bench Press', logs)).toBe(false)
  })

  it('returns false when exercise has no weight data (bodyweight exercises)', () => {
    const logs = Array.from({ length: 4 }, () => makeLog('Push Up', 3, undefined))
    expect(detectPlateau('Push Up', logs)).toBe(false)
  })

  it('returns true when weight increased then stalled for 4 sessions', () => {
    const logs = [
      makeLog('Bench Press', 3, 80, '2026-03-01T10:00:00Z'),
      makeLog('Bench Press', 3, 82.5, '2026-03-08T10:00:00Z'),
      makeLog('Bench Press', 3, 82.5, '2026-04-01T10:00:00Z'),
      makeLog('Bench Press', 3, 82.5, '2026-04-08T10:00:00Z'),
      makeLog('Bench Press', 3, 82.5, '2026-04-15T10:00:00Z'),
      makeLog('Bench Press', 3, 82.5, '2026-04-22T10:00:00Z'),
    ]
    expect(detectPlateau('Bench Press', logs)).toBe(true)
  })

  it('only looks at the 4 most recent sessions', () => {
    // Older sessions stalled; recent ones show progress
    const logs = [
      makeLog('Bench Press', 3, 80, '2026-03-01T10:00:00Z'),
      makeLog('Bench Press', 3, 80, '2026-03-08T10:00:00Z'),
      makeLog('Bench Press', 3, 80, '2026-03-15T10:00:00Z'),
      makeLog('Bench Press', 3, 80, '2026-03-22T10:00:00Z'),
      makeLog('Bench Press', 3, 82.5, '2026-04-01T10:00:00Z'),
      makeLog('Bench Press', 3, 85, '2026-04-08T10:00:00Z'),
    ]
    expect(detectPlateau('Bench Press', logs)).toBe(false)
  })
})

import { getRecommendation } from '../../services/todayRecommendationService'
import { Routine, UserProfile, WorkoutItem, WorkoutLog } from '../../types'

// Fixed reference point: "now" for all tests = 2026-05-08T12:00:00Z
const NOW = new Date('2026-05-08T12:00:00.000Z').getTime()
jest.spyOn(Date, 'now').mockReturnValue(NOW)

const PROFILE: UserProfile = {
  goals: ['Muscle Growth'],
  fitnessLevel: 'Intermediate',
  age: 30,
  sensitiveAreas: [],
  equipment: ['barbell', 'dumbbells'],
  preferredDuration: 60,
  preferredPlatforms: ['youtube'],
  preferredWorkoutTypes: [],
}

// Workouts in the user's library
const PUSH_WORKOUT: WorkoutItem = {
  id: 'w-push', title: 'Push Day', url: '', sourceType: 'other',
  bodyParts: ['Chest', 'Shoulders', 'Arms'], notes: '', dateAdded: '', isFavorite: false,
}
const PULL_WORKOUT: WorkoutItem = {
  id: 'w-pull', title: 'Pull Day', url: '', sourceType: 'other',
  bodyParts: ['Back', 'Arms'], notes: '', dateAdded: '', isFavorite: false,
}
const LEGS_WORKOUT: WorkoutItem = {
  id: 'w-legs', title: 'Legs', url: '', sourceType: 'other',
  bodyParts: ['Legs', 'Glutes'], notes: '', dateAdded: '', isFavorite: false,
}

// Routines
const PUSH_ROUTINE: Routine = {
  id: 'r-push', name: 'Push', items: [{ workoutItemId: 'w-push', order: 0 }],
  createdAt: '',
}
const PULL_ROUTINE: Routine = {
  id: 'r-pull', name: 'Pull', items: [{ workoutItemId: 'w-pull', order: 0 }],
  createdAt: '',
}
const LEGS_ROUTINE: Routine = {
  id: 'r-legs', name: 'Legs', items: [{ workoutItemId: 'w-legs', order: 0 }],
  createdAt: '',
}

const ALL_WORKOUTS = [PUSH_WORKOUT, PULL_WORKOUT, LEGS_WORKOUT]
const ALL_ROUTINES = [PUSH_ROUTINE, PULL_ROUTINE, LEGS_ROUTINE]

function makeLog(routineId: string, workoutItemIds: string[], hoursAgo: number): WorkoutLog {
  const completedAt = new Date(NOW - hoursAgo * 60 * 60 * 1000).toISOString()
  return {
    id: `log-${routineId}-${hoursAgo}`,
    routineId,
    routineName: routineId,
    startedAt: completedAt,
    completedAt,
    durationSeconds: 3600,
    totalSetsLogged: 12,
    workouts: workoutItemIds.map(id => ({
      workoutItemId: id,
      workoutTitle: id,
      setsLogged: [],
      skipped: false,
    })),
  }
}

describe('getRecommendation', () => {
  describe('no routines case', () => {
    it('returns no_routines type when routine list is empty', () => {
      const result = getRecommendation([], ALL_WORKOUTS, [], PROFILE)
      expect(result.type).toBe('no_routines')
    })

    it('provides a reason explaining how to get started', () => {
      const result = getRecommendation([], ALL_WORKOUTS, [], PROFILE)
      expect(result.reason).toBeTruthy()
      expect(result.reason.length).toBeGreaterThan(10)
    })
  })

  describe('no workout history', () => {
    it('recommends a routine when there is no history', () => {
      const result = getRecommendation([], ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.type).toBe('routine')
      expect(result.routine).toBeDefined()
    })

    it('daysSinceLastWorkout is null when no history', () => {
      const result = getRecommendation([], ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.daysSinceLastWorkout).toBeNull()
    })

    it('all muscles are in readyMuscles when never trained', () => {
      const result = getRecommendation([], ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.fatiguedMuscles).toHaveLength(0)
    })
  })

  describe('muscle recovery logic', () => {
    it('marks muscles trained within 48h as fatigued', () => {
      const logs = [makeLog('r-push', ['w-push'], 24)] // Push trained 24h ago
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.fatiguedMuscles).toEqual(
        expect.arrayContaining(['Chest', 'Shoulders', 'Arms'])
      )
    })

    it('marks muscles trained 48h+ ago as ready', () => {
      const logs = [makeLog('r-push', ['w-push'], 72)] // Push trained 72h ago
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.fatiguedMuscles).not.toContain('Chest')
    })

    it('uses exactly 48h as the fatigue boundary', () => {
      const justInsideFatigue = [makeLog('r-push', ['w-push'], 47)]
      const justOutsideFatigue = [makeLog('r-push', ['w-push'], 49)]

      const inside = getRecommendation(justInsideFatigue, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      const outside = getRecommendation(justOutsideFatigue, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)

      expect(inside.fatiguedMuscles).toContain('Chest')
      expect(outside.fatiguedMuscles).not.toContain('Chest')
    })
  })

  describe('routine recommendation', () => {
    it('recommends the routine whose muscles are most recovered', () => {
      // Push trained 24h ago (fatigued), Pull and Legs not trained
      const logs = [makeLog('r-push', ['w-push'], 24)]
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.type).toBe('routine')
      expect(['r-pull', 'r-legs']).toContain(result.routine!.id)
      expect(result.routine!.id).not.toBe('r-push')
    })

    it('avoids routines where ALL target muscles are fatigued', () => {
      // Push trained 24h ago
      const logs = [makeLog('r-push', ['w-push'], 24)]
      const result = getRecommendation(logs, ALL_WORKOUTS, [PUSH_ROUTINE], PROFILE)
      // Only Push routine available, and it's fatigued → recommend rest
      expect(result.type).toBe('rest')
    })

    it('prefers the routine done least recently', () => {
      // Push done 5 days ago, Pull done 2 days ago, Legs never done
      const logs = [
        makeLog('r-push', ['w-push'], 5 * 24),
        makeLog('r-pull', ['w-pull'], 2 * 24),
      ]
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.routine!.id).toBe('r-legs')
    })

    it('prefers a never-done routine over a recently-done one', () => {
      // Push done 3 days ago, Pull never done, Legs never done
      const logs = [makeLog('r-push', ['w-push'], 3 * 24)]
      const result = getRecommendation(logs, ALL_WORKOUTS, [PUSH_ROUTINE, PULL_ROUTINE], PROFILE)
      expect(result.routine!.id).toBe('r-pull')
    })
  })

  describe('rest recommendation', () => {
    it('recommends rest when all routines target only fatigued muscles', () => {
      // Train every available muscle group within 24h
      const logs = [
        makeLog('r-all', ['w-push', 'w-pull', 'w-legs'], 12),
      ]
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.type).toBe('rest')
    })

    it('rest recommendation has a non-empty reason', () => {
      const logs = [makeLog('r-all', ['w-push', 'w-pull', 'w-legs'], 12)]
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.reason.length).toBeGreaterThan(10)
    })
  })

  describe('daysSinceLastWorkout', () => {
    it('returns 1 when the last workout was ~24h ago', () => {
      const logs = [makeLog('r-push', ['w-push'], 24)]
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.daysSinceLastWorkout).toBe(1)
    })

    it('returns 3 when the last workout was ~72h ago', () => {
      const logs = [makeLog('r-push', ['w-push'], 72)]
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.daysSinceLastWorkout).toBe(3)
    })

    it('returns null when there are no logs', () => {
      const result = getRecommendation([], ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.daysSinceLastWorkout).toBeNull()
    })
  })

  describe('reason string', () => {
    it('routine recommendation includes the routine name', () => {
      const result = getRecommendation([], ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      const routineName = result.routine!.name
      expect(result.reason).toContain(routineName)
    })

    it('rest recommendation mentions recovery', () => {
      const logs = [makeLog('r-all', ['w-push', 'w-pull', 'w-legs'], 12)]
      const result = getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)
      expect(result.reason.toLowerCase()).toMatch(/rest|recover/)
    })

    it('no_routines reason mentions adding routines', () => {
      const result = getRecommendation([], ALL_WORKOUTS, [], PROFILE)
      expect(result.reason.toLowerCase()).toMatch(/routine|plan/)
    })
  })

  describe('edge cases', () => {
    it('handles logs referencing workout ids not in the library', () => {
      const logs = [makeLog('r-unknown', ['w-nonexistent'], 24)]
      expect(() => getRecommendation(logs, ALL_WORKOUTS, ALL_ROUTINES, PROFILE)).not.toThrow()
    })

    it('handles routines referencing workout ids not in the library', () => {
      const ghostRoutine: Routine = {
        id: 'r-ghost', name: 'Ghost', items: [{ workoutItemId: 'w-ghost', order: 0 }], createdAt: '',
      }
      expect(() => getRecommendation([], ALL_WORKOUTS, [ghostRoutine], PROFILE)).not.toThrow()
    })

    it('handles empty workout logs array gracefully', () => {
      expect(() => getRecommendation([], [], ALL_ROUTINES, PROFILE)).not.toThrow()
    })
  })
})

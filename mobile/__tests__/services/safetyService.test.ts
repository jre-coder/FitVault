import { scoreWorkoutSafety, SafetyLevel } from '../../services/safetyService'
import { Exercise, UserProfile } from '../../types'

const BASE_PROFILE: UserProfile = {
  goals: ['General Fitness'],
  fitnessLevel: 'Intermediate',
  sensitiveAreas: [],
  equipment: [],
  preferredDuration: 60,
  preferredPlatforms: [],
  preferredWorkoutTypes: [],
}

function profile(overrides: Partial<UserProfile>): UserProfile {
  return { ...BASE_PROFILE, ...overrides }
}

function ex(name: string): Exercise {
  return { name }
}

// ─── clean workout ────────────────────────────────────────────────────────────

describe('clean workout', () => {
  it('returns safe when no exercises conflict with profile', () => {
    const result = scoreWorkoutSafety(
      [ex('Bench Press'), ex('Cable Row'), ex('Squat')],
      BASE_PROFILE
    )
    expect(result.level).toBe('safe')
    expect(result.flags).toHaveLength(0)
  })

  it('returns safe for empty exercise list', () => {
    const result = scoreWorkoutSafety([], BASE_PROFILE)
    expect(result.level).toBe('safe')
  })
})

// ─── injury flag filtering ────────────────────────────────────────────────────

describe('injury flag filtering', () => {
  it('flags deadlift for Lower Back sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Deadlift')],
      profile({ sensitiveAreas: ['Lower Back'] })
    )
    expect(result.flags.some(f => /deadlift/i.test(f.exerciseName))).toBe(true)
  })

  it('flags good mornings for Lower Back sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Good Mornings')],
      profile({ sensitiveAreas: ['Lower Back'] })
    )
    expect(result.flags.some(f => /good morning/i.test(f.exerciseName))).toBe(true)
  })

  it('flags squat for Knees sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Squat')],
      profile({ sensitiveAreas: ['Knees'] })
    )
    expect(result.flags.some(f => /squat/i.test(f.exerciseName))).toBe(true)
  })

  it('flags jump squats for Knees sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Jump Squats')],
      profile({ sensitiveAreas: ['Knees'] })
    )
    expect(result.flags.some(f => /squat/i.test(f.exerciseName))).toBe(true)
  })

  it('flags behind-neck press for Shoulders sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Behind-the-Neck Press')],
      profile({ sensitiveAreas: ['Shoulders'] })
    )
    expect(result.flags.some(f => /neck press/i.test(f.exerciseName))).toBe(true)
  })

  it('flags upright rows for Shoulders sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Upright Row')],
      profile({ sensitiveAreas: ['Shoulders'] })
    )
    expect(result.flags.some(f => /upright row/i.test(f.exerciseName))).toBe(true)
  })

  it('flags barbell curl for Wrists sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Barbell Curl')],
      profile({ sensitiveAreas: ['Wrists'] })
    )
    expect(result.flags.some(f => /curl/i.test(f.exerciseName))).toBe(true)
  })

  it('flags box jumps for Ankles sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Box Jumps')],
      profile({ sensitiveAreas: ['Ankles'] })
    )
    expect(result.flags.some(f => /box jump/i.test(f.exerciseName))).toBe(true)
  })

  it('flags hip thrust for Hips sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Hip Thrust')],
      profile({ sensitiveAreas: ['Hips'] })
    )
    expect(result.flags.some(f => /hip thrust/i.test(f.exerciseName))).toBe(true)
  })

  it('flags behind-neck press for Neck sensitive area', () => {
    const result = scoreWorkoutSafety(
      [ex('Behind-the-Neck Press')],
      profile({ sensitiveAreas: ['Neck'] })
    )
    expect(result.flags.some(f => /neck/i.test(f.exerciseName))).toBe(true)
  })

  it('does not flag safe exercises when sensitive areas are set', () => {
    const result = scoreWorkoutSafety(
      [ex('Bench Press'), ex('Cable Row')],
      profile({ sensitiveAreas: ['Lower Back'] })
    )
    expect(result.flags).toHaveLength(0)
  })

  it('only flags exercises that match the user sensitive areas, not others', () => {
    const result = scoreWorkoutSafety(
      [ex('Deadlift'), ex('Upright Row')],
      profile({ sensitiveAreas: ['Lower Back'] })
    )
    // Deadlift flagged for lower back, upright row should NOT be (no shoulder flag)
    const names = result.flags.map(f => f.exerciseName.toLowerCase())
    expect(names.some(n => n.includes('deadlift'))).toBe(true)
    expect(names.some(n => n.includes('upright'))).toBe(false)
  })
})

// ─── age-appropriate filtering ────────────────────────────────────────────────

describe('age-appropriate filtering', () => {
  it('flags high-impact plyometrics for users 50+', () => {
    const result = scoreWorkoutSafety(
      [ex('Box Jumps')],
      profile({ age: 52 })
    )
    expect(result.flags.some(f => /box jump/i.test(f.exerciseName))).toBe(true)
  })

  it('flags burpees for users 50+', () => {
    const result = scoreWorkoutSafety(
      [ex('Burpees')],
      profile({ age: 55 })
    )
    expect(result.flags.some(f => /burpee/i.test(f.exerciseName))).toBe(true)
  })

  it('flags jump squats for users 50+', () => {
    const result = scoreWorkoutSafety(
      [ex('Jump Squats')],
      profile({ age: 60 })
    )
    expect(result.flags.some(f => /squat/i.test(f.exerciseName))).toBe(true)
  })

  it('does NOT flag box jumps for users under 50 with no knee issues', () => {
    const result = scoreWorkoutSafety(
      [ex('Box Jumps')],
      profile({ age: 30 })
    )
    expect(result.flags).toHaveLength(0)
  })

  it('does NOT flag plyometrics when age is not provided', () => {
    const result = scoreWorkoutSafety(
      [ex('Box Jumps')],
      BASE_PROFILE
    )
    expect(result.flags).toHaveLength(0)
  })
})

// ─── universally risky exercises ─────────────────────────────────────────────

describe('universally risky exercises (flagged for any profile)', () => {
  it('flags behind-the-neck press regardless of profile', () => {
    const result = scoreWorkoutSafety(
      [ex('Behind-the-Neck Press')],
      BASE_PROFILE
    )
    expect(result.flags.some(f => /neck press/i.test(f.exerciseName))).toBe(true)
  })

  it('flags upright rows for users with Shoulders sensitivity', () => {
    const result = scoreWorkoutSafety(
      [ex('Upright Row')],
      profile({ sensitiveAreas: ['Shoulders'] })
    )
    expect(result.flags.some(f => /upright row/i.test(f.exerciseName))).toBe(true)
  })

  it('flags kipping pull-ups regardless of profile', () => {
    const result = scoreWorkoutSafety(
      [ex('Kipping Pull-Up')],
      BASE_PROFILE
    )
    expect(result.flags.some(f => /kipping/i.test(f.exerciseName))).toBe(true)
  })
})

// ─── severity and overall level ──────────────────────────────────────────────

describe('severity and overall level', () => {
  it('overall level is the worst flag severity', () => {
    const result = scoreWorkoutSafety(
      [ex('Behind-the-Neck Press'), ex('Bench Press')],
      BASE_PROFILE
    )
    expect(result.level).not.toBe('safe')
  })

  it('returns caution level when only info-level flags exist', () => {
    const result = scoreWorkoutSafety(
      [ex('Upright Row')],
      profile({ sensitiveAreas: ['Shoulders'] })
    )
    expect(['caution', 'warning'] as SafetyLevel[]).toContain(result.level)
  })

  it('each flag includes an exerciseName, reason, and severity', () => {
    const result = scoreWorkoutSafety(
      [ex('Behind-the-Neck Press')],
      BASE_PROFILE
    )
    const flag = result.flags[0]
    expect(flag.exerciseName).toBeTruthy()
    expect(flag.reason).toBeTruthy()
    expect(['caution', 'warning'] as SafetyLevel[]).toContain(flag.severity)
  })

  it('does not duplicate flags for the same exercise', () => {
    const result = scoreWorkoutSafety(
      [ex('Deadlift')],
      profile({ sensitiveAreas: ['Lower Back', 'Hips'] })
    )
    const deadliftFlags = result.flags.filter(f => /deadlift/i.test(f.exerciseName))
    expect(deadliftFlags).toHaveLength(1)
  })
})

// ─── case-insensitive matching ────────────────────────────────────────────────

describe('case-insensitive exercise name matching', () => {
  it('flags "deadlift" (lowercase)', () => {
    const result = scoreWorkoutSafety(
      [ex('deadlift')],
      profile({ sensitiveAreas: ['Lower Back'] })
    )
    expect(result.flags.length).toBeGreaterThan(0)
  })

  it('flags "UPRIGHT ROW" (uppercase) for shoulder sensitivity', () => {
    const result = scoreWorkoutSafety(
      [ex('UPRIGHT ROW')],
      profile({ sensitiveAreas: ['Shoulders'] })
    )
    expect(result.flags.length).toBeGreaterThan(0)
  })
})

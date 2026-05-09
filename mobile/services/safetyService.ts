import { Exercise, UserProfile } from '../types'

export type SafetyLevel = 'safe' | 'caution' | 'warning'

export interface SafetyFlag {
  exerciseName: string
  reason: string
  severity: SafetyLevel
}

export interface SafetyResult {
  level: SafetyLevel
  flags: SafetyFlag[]
}

// ─── rule types ───────────────────────────────────────────────────────────────

interface Rule {
  pattern: RegExp
  sensitiveAreas?: string[]   // flag when user has any of these
  minAge?: number             // flag when user.age >= this
  universal?: boolean         // flag regardless of profile
  severity: SafetyLevel
  reason: string
}

// ─── rule table ───────────────────────────────────────────────────────────────

const RULES: Rule[] = [
  // ── Lower Back ──
  {
    pattern: /\bdeadlift\b/i,
    sensitiveAreas: ['Lower Back', 'Hips'],
    severity: 'warning',
    reason: 'Heavy spinal loading — use a hex bar or Romanian deadlift to reduce lumbar stress.',
  },
  {
    pattern: /\bgood morning/i,
    sensitiveAreas: ['Lower Back'],
    severity: 'warning',
    reason: 'High shear force on the lumbar spine — avoid or use very light weight.',
  },
  {
    pattern: /\bhyperextension\b/i,
    sensitiveAreas: ['Lower Back'],
    severity: 'caution',
    reason: 'Repeated lumbar hyperextension can aggravate lower back sensitivity.',
  },

  // ── Knees ──
  {
    pattern: /\bsquat\b/i,
    sensitiveAreas: ['Knees'],
    severity: 'caution',
    reason: 'Deep knee flexion under load — limit depth or switch to box squats.',
  },
  {
    pattern: /\bleg press\b/i,
    sensitiveAreas: ['Knees'],
    severity: 'caution',
    reason: 'Avoid deep range of motion on leg press to reduce patellar stress.',
  },
  {
    pattern: /\blunge\b/i,
    sensitiveAreas: ['Knees'],
    severity: 'caution',
    reason: 'Forward knee travel under load — consider step-ups or reverse lunges.',
  },
  {
    pattern: /\bjump squat/i,
    sensitiveAreas: ['Knees'],
    severity: 'warning',
    reason: 'Plyometric loading through the knee joint — high risk with knee sensitivity.',
  },

  // ── Shoulders ──
  {
    pattern: /\bbehind.?(the.)?neck (press|pull)/i,
    sensitiveAreas: ['Shoulders', 'Neck'],
    severity: 'warning',
    reason: 'Extreme shoulder external rotation — high impingement and instability risk.',
  },
  {
    pattern: /\bupright row\b/i,
    sensitiveAreas: ['Shoulders'],
    severity: 'caution',
    reason: 'Internal rotation under load narrows the subacromial space — use a wider grip or cable face pulls instead.',
  },
  {
    pattern: /\bdip\b/i,
    sensitiveAreas: ['Shoulders'],
    severity: 'caution',
    reason: 'Deep dip position places significant stress on the anterior shoulder capsule.',
  },

  // ── Wrists ──
  {
    pattern: /\bbarbell curl\b/i,
    sensitiveAreas: ['Wrists'],
    severity: 'caution',
    reason: 'Fixed wrist position under load — switch to an EZ-bar or dumbbells for neutral grip.',
  },
  {
    pattern: /\bwrist curl\b/i,
    sensitiveAreas: ['Wrists'],
    severity: 'caution',
    reason: 'Direct wrist loading — use with very light weight only.',
  },

  // ── Ankles ──
  {
    pattern: /\bbox jump/i,
    sensitiveAreas: ['Ankles'],
    severity: 'warning',
    reason: 'High ankle impact on landing — consider step-ups instead.',
  },
  {
    pattern: /\bjump rope\b/i,
    sensitiveAreas: ['Ankles'],
    severity: 'caution',
    reason: 'Repetitive ankle dorsiflexion — reduce volume or switch to cycling.',
  },

  // ── Hips ──
  {
    pattern: /\bhip thrust\b/i,
    sensitiveAreas: ['Hips'],
    severity: 'caution',
    reason: 'Hip extension at end range under load — monitor for impingement.',
  },

  // ── Neck ──
  {
    pattern: /\bbehind.?(the.)?neck/i,
    sensitiveAreas: ['Neck'],
    severity: 'warning',
    reason: 'Forces cervical spine into extreme flexion under load.',
  },
  {
    pattern: /\bshrug\b/i,
    sensitiveAreas: ['Neck'],
    severity: 'caution',
    reason: 'Repeated cervical loading — reduce weight and avoid neck tension.',
  },

  // ── Age-related (50+) ──
  {
    pattern: /\bbox jump/i,
    minAge: 50,
    severity: 'caution',
    reason: 'High-impact landing — joint recovery slows with age; consider step-ups.',
  },
  {
    pattern: /\bjump squat/i,
    minAge: 50,
    severity: 'caution',
    reason: 'Plyometric loading increases joint stress — reduce or substitute.',
  },
  {
    pattern: /\bburpee/i,
    minAge: 50,
    severity: 'caution',
    reason: 'High-impact full-body movement — consider mountain climbers or modified burpees.',
  },
  {
    pattern: /\bjump rope\b/i,
    minAge: 50,
    severity: 'caution',
    reason: 'Repetitive impact — switch to cycling or rowing for similar cardio benefit.',
  },

  // ── Universally risky ──
  {
    pattern: /\bbehind.?(the.)?neck press/i,
    universal: true,
    severity: 'warning',
    reason: 'High shoulder impingement risk for most people — replace with seated overhead press.',
  },
  {
    pattern: /\bkipping (pull.up|pullup)/i,
    universal: true,
    severity: 'caution',
    reason: 'Requires shoulder stability most people lack — use strict pull-ups to build base strength first.',
  },
]

// ─── severity ordering ────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<SafetyLevel, number> = { safe: 0, caution: 1, warning: 2 }

function worse(a: SafetyLevel, b: SafetyLevel): SafetyLevel {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b
}

// ─── main export ──────────────────────────────────────────────────────────────

export function scoreWorkoutSafety(
  exercises: Exercise[],
  profile: UserProfile
): SafetyResult {
  const flagMap = new Map<string, SafetyFlag>()

  for (const exercise of exercises) {
    const name = exercise.name
    const nameLower = name.toLowerCase()

    for (const rule of RULES) {
      if (!rule.pattern.test(nameLower)) continue

      const triggeredByArea =
        rule.sensitiveAreas &&
        rule.sensitiveAreas.some(area => profile.sensitiveAreas.includes(area))
      const triggeredByAge =
        rule.minAge !== undefined &&
        profile.age !== undefined &&
        profile.age >= rule.minAge
      const triggeredUniversal = rule.universal === true

      if (!triggeredByArea && !triggeredByAge && !triggeredUniversal) continue

      // Deduplicate per exercise name — keep worst severity
      const existing = flagMap.get(name)
      if (!existing || SEVERITY_ORDER[rule.severity] > SEVERITY_ORDER[existing.severity]) {
        flagMap.set(name, { exerciseName: name, reason: rule.reason, severity: rule.severity })
      }
    }
  }

  const flags = Array.from(flagMap.values())
  const level = flags.reduce<SafetyLevel>(
    (worst, f) => worse(worst, f.severity),
    'safe'
  )

  return { level, flags }
}

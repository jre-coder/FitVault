import { BodyPart, DayOfWeek, DAYS_OF_WEEK, DaySchedule, Routine, WeeklySchedule } from '../types'

export interface SplitTemplateRoutineDef {
  name: string
  suggestedBodyParts: BodyPart[]
}

export interface SplitTemplate {
  id: string
  name: string
  description: string
  daysPerWeek: number
  routines: SplitTemplateRoutineDef[]
  weeklyPattern: Record<DayOfWeek, string | 'rest' | null>
}

export const SPLIT_TEMPLATES: SplitTemplate[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Separate pushing, pulling, and leg movements across 6 days for maximum frequency.',
    daysPerWeek: 6,
    routines: [
      { name: 'Push', suggestedBodyParts: ['Chest', 'Shoulders', 'Arms'] },
      { name: 'Pull', suggestedBodyParts: ['Back', 'Arms'] },
      { name: 'Legs', suggestedBodyParts: ['Legs', 'Glutes'] },
    ],
    weeklyPattern: {
      monday: 'Push',
      tuesday: 'Pull',
      wednesday: 'Legs',
      thursday: 'Push',
      friday: 'Pull',
      saturday: 'Legs',
      sunday: 'rest',
    },
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    description: 'Alternate upper and lower body days 4 times per week for balanced development.',
    daysPerWeek: 4,
    routines: [
      { name: 'Upper', suggestedBodyParts: ['Chest', 'Back', 'Shoulders', 'Arms'] },
      { name: 'Lower', suggestedBodyParts: ['Legs', 'Glutes', 'Core'] },
    ],
    weeklyPattern: {
      monday: 'Upper',
      tuesday: 'Lower',
      wednesday: 'rest',
      thursday: 'Upper',
      friday: 'Lower',
      saturday: 'rest',
      sunday: 'rest',
    },
  },
  {
    id: 'bro-split',
    name: 'Bro Split',
    description: 'One muscle group focus per session over 5 days — classic bodybuilding structure.',
    daysPerWeek: 5,
    routines: [
      { name: 'Chest + Triceps', suggestedBodyParts: ['Chest', 'Arms'] },
      { name: 'Back + Biceps', suggestedBodyParts: ['Back', 'Arms'] },
      { name: 'Legs + Shoulders', suggestedBodyParts: ['Legs', 'Glutes', 'Shoulders'] },
    ],
    weeklyPattern: {
      monday: 'Chest + Triceps',
      tuesday: 'Back + Biceps',
      wednesday: 'Legs + Shoulders',
      thursday: 'rest',
      friday: 'Chest + Triceps',
      saturday: 'Back + Biceps',
      sunday: 'rest',
    },
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description: 'Train every muscle group each session, 3 days per week. Great for beginners.',
    daysPerWeek: 3,
    routines: [
      { name: 'Full Body', suggestedBodyParts: ['Full Body'] },
    ],
    weeklyPattern: {
      monday: 'Full Body',
      tuesday: 'rest',
      wednesday: 'Full Body',
      thursday: 'rest',
      friday: 'Full Body',
      saturday: 'rest',
      sunday: 'rest',
    },
  },
]

export function getSplitTemplate(id: string): SplitTemplate | undefined {
  return SPLIT_TEMPLATES.find(t => t.id === id)
}

export function buildScheduleFromTemplate(
  template: SplitTemplate,
  createdRoutines: Routine[]
): Record<DayOfWeek, DaySchedule> {
  const nameToId = new Map(createdRoutines.map(r => [r.name, r.id]))

  const result = {} as Record<DayOfWeek, DaySchedule>
  DAYS_OF_WEEK.forEach(day => {
    const pattern = template.weeklyPattern[day]
    if (pattern === 'rest') {
      result[day] = 'rest'
    } else if (pattern === null || pattern === undefined) {
      result[day] = null
    } else {
      result[day] = nameToId.get(pattern) ?? null
    }
  })
  return result
}

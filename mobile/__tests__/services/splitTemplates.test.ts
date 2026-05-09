import {
  SPLIT_TEMPLATES,
  getSplitTemplate,
  buildScheduleFromTemplate,
  SplitTemplate,
} from '../../services/splitTemplates'
import { Routine, DayOfWeek, DAYS_OF_WEEK } from '../../types'

const makeRoutine = (id: string, name: string): Routine => ({
  id,
  name,
  items: [],
  createdAt: '2026-05-07T10:00:00.000Z',
})

describe('SPLIT_TEMPLATES', () => {
  it('exports exactly 4 templates', () => {
    expect(SPLIT_TEMPLATES).toHaveLength(4)
  })

  it('every template has required fields', () => {
    for (const t of SPLIT_TEMPLATES) {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(typeof t.daysPerWeek).toBe('number')
      expect(t.daysPerWeek).toBeGreaterThan(0)
      expect(Array.isArray(t.routines)).toBe(true)
      expect(t.routines.length).toBeGreaterThan(0)
      expect(t.weeklyPattern).toBeTruthy()
    }
  })

  it('every template has a valid weeklyPattern covering all 7 days', () => {
    for (const t of SPLIT_TEMPLATES) {
      DAYS_OF_WEEK.forEach(day => {
        expect(Object.keys(t.weeklyPattern)).toContain(day)
      })
    }
  })

  it('weeklyPattern values are either null, "rest", or a routine name from the template', () => {
    for (const t of SPLIT_TEMPLATES) {
      const names = new Set(t.routines.map(r => r.name))
      DAYS_OF_WEEK.forEach(day => {
        const val = t.weeklyPattern[day]
        if (val !== null && val !== 'rest') {
          expect(names.has(val)).toBe(true)
        }
      })
    }
  })

  describe('Push / Pull / Legs template', () => {
    let ppl: SplitTemplate

    beforeEach(() => {
      ppl = SPLIT_TEMPLATES.find(t => t.id === 'ppl')!
      expect(ppl).toBeDefined()
    })

    it('has 3 routines: Push, Pull, Legs', () => {
      const names = ppl.routines.map(r => r.name)
      expect(names).toContain('Push')
      expect(names).toContain('Pull')
      expect(names).toContain('Legs')
    })

    it('daysPerWeek is 6', () => {
      expect(ppl.daysPerWeek).toBe(6)
    })
  })

  describe('Upper / Lower template', () => {
    let ul: SplitTemplate

    beforeEach(() => {
      ul = SPLIT_TEMPLATES.find(t => t.id === 'upper-lower')!
      expect(ul).toBeDefined()
    })

    it('has 2 routines: Upper, Lower', () => {
      const names = ul.routines.map(r => r.name)
      expect(names).toContain('Upper')
      expect(names).toContain('Lower')
    })

    it('daysPerWeek is 4', () => {
      expect(ul.daysPerWeek).toBe(4)
    })
  })

  describe('Bro Split template', () => {
    let bro: SplitTemplate

    beforeEach(() => {
      bro = SPLIT_TEMPLATES.find(t => t.id === 'bro-split')!
      expect(bro).toBeDefined()
    })

    it('has 3 routines', () => {
      expect(bro.routines).toHaveLength(3)
    })

    it('daysPerWeek is 5', () => {
      expect(bro.daysPerWeek).toBe(5)
    })
  })

  describe('Full Body template', () => {
    let fb: SplitTemplate

    beforeEach(() => {
      fb = SPLIT_TEMPLATES.find(t => t.id === 'full-body')!
      expect(fb).toBeDefined()
    })

    it('has 1 routine named Full Body', () => {
      expect(fb.routines).toHaveLength(1)
      expect(fb.routines[0].name).toBe('Full Body')
    })

    it('daysPerWeek is 3', () => {
      expect(fb.daysPerWeek).toBe(3)
    })
  })
})

describe('getSplitTemplate', () => {
  it('returns a template by id', () => {
    const t = getSplitTemplate('ppl')
    expect(t).toBeDefined()
    expect(t!.id).toBe('ppl')
  })

  it('returns undefined for unknown id', () => {
    expect(getSplitTemplate('nonexistent')).toBeUndefined()
  })
})

describe('buildScheduleFromTemplate', () => {
  it('maps routine names in the pattern to the created routine ids', () => {
    const template = SPLIT_TEMPLATES.find(t => t.id === 'full-body')!
    const routines: Routine[] = [makeRoutine('id-fb', 'Full Body')]

    const schedule = buildScheduleFromTemplate(template, routines)

    DAYS_OF_WEEK.forEach(day => {
      const pattern = template.weeklyPattern[day]
      if (pattern === 'Full Body') {
        expect(schedule[day]).toBe('id-fb')
      } else if (pattern === 'rest') {
        expect(schedule[day]).toBe('rest')
      } else {
        expect(schedule[day]).toBeNull()
      }
    })
  })

  it('maps all PPL routine names to the correct ids', () => {
    const template = SPLIT_TEMPLATES.find(t => t.id === 'ppl')!
    const routines: Routine[] = [
      makeRoutine('id-push', 'Push'),
      makeRoutine('id-pull', 'Pull'),
      makeRoutine('id-legs', 'Legs'),
    ]

    const schedule = buildScheduleFromTemplate(template, routines)

    DAYS_OF_WEEK.forEach(day => {
      const pattern = template.weeklyPattern[day]
      if (pattern === 'Push') expect(schedule[day]).toBe('id-push')
      else if (pattern === 'Pull') expect(schedule[day]).toBe('id-pull')
      else if (pattern === 'Legs') expect(schedule[day]).toBe('id-legs')
      else if (pattern === 'rest') expect(schedule[day]).toBe('rest')
      else expect(schedule[day]).toBeNull()
    })
  })

  it('returns null for days with no pattern entry', () => {
    const template = SPLIT_TEMPLATES.find(t => t.id === 'full-body')!
    const routines: Routine[] = [makeRoutine('id-fb', 'Full Body')]
    const schedule = buildScheduleFromTemplate(template, routines)

    const nullDays = DAYS_OF_WEEK.filter(d => template.weeklyPattern[d] === null)
    nullDays.forEach(day => expect(schedule[day]).toBeNull())
  })

  it('handles unmatched routine name gracefully (returns null for that day)', () => {
    const template = SPLIT_TEMPLATES.find(t => t.id === 'full-body')!
    // pass an empty routines array — name won't match
    const schedule = buildScheduleFromTemplate(template, [])

    DAYS_OF_WEEK.forEach(day => {
      const val = schedule[day]
      expect(val === null || val === 'rest').toBe(true)
    })
  })
})

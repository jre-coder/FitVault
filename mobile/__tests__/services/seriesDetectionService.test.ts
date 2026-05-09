import { detectSeries } from '../../services/seriesDetectionService'

describe('detectSeries', () => {
  // ─── not a series ────────────────────────────────────────────────────────────

  describe('non-series titles', () => {
    it('returns isSeries false for a plain workout title', () => {
      expect(detectSeries('Upper Body Strength').isSeries).toBe(false)
    })

    it('returns isSeries false for an empty string', () => {
      expect(detectSeries('').isSeries).toBe(false)
    })

    it('returns null partNumber for non-series titles', () => {
      expect(detectSeries('Leg Day Workout').partNumber).toBeNull()
    })

    it('does not flag a title that just contains a year', () => {
      expect(detectSeries('Best Workout Routine 2024').isSeries).toBe(false)
    })

    it('does not flag "Full Body" as a series', () => {
      expect(detectSeries('Full Body HIIT').isSeries).toBe(false)
    })
  })

  // ─── Part N patterns ─────────────────────────────────────────────────────────

  describe('Part N patterns', () => {
    it('detects "Part 1"', () => {
      const r = detectSeries('Chest Workout Part 1')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(1)
    })

    it('detects "Part 2 of 3"', () => {
      const r = detectSeries('Full Body Workout Part 2 of 3')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(2)
      expect(r.totalParts).toBe(3)
    })

    it('detects "Part 1/4"', () => {
      const r = detectSeries('Jeff Nippard Hypertrophy Part 1/4')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(1)
      expect(r.totalParts).toBe(4)
    })

    it('detects "(Part 2)" in parentheses', () => {
      const r = detectSeries('Upper Body (Part 2)')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(2)
    })

    it('is case-insensitive for "part"', () => {
      expect(detectSeries('Leg Day PART 3').isSeries).toBe(true)
    })
  })

  // ─── Day N patterns ──────────────────────────────────────────────────────────

  describe('Day N patterns', () => {
    it('detects "Day 1"', () => {
      const r = detectSeries('PPL Day 1 - Push')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(1)
    })

    it('detects "Day 3 of 6"', () => {
      const r = detectSeries('Full Body Day 3 of 6')
      expect(r.partNumber).toBe(3)
      expect(r.totalParts).toBe(6)
    })

    it('detects "Day 1/5"', () => {
      const r = detectSeries('6-Week Program Day 1/5')
      expect(r.partNumber).toBe(1)
      expect(r.totalParts).toBe(5)
    })
  })

  // ─── Week N patterns ─────────────────────────────────────────────────────────

  describe('Week N patterns', () => {
    it('detects "Week 1"', () => {
      const r = detectSeries('Beginner Program Week 1')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(1)
    })

    it('detects "Week 4 of 12"', () => {
      const r = detectSeries('Hypertrophy Block Week 4 of 12')
      expect(r.partNumber).toBe(4)
      expect(r.totalParts).toBe(12)
    })
  })

  // ─── Episode / Vol patterns ───────────────────────────────────────────────────

  describe('Episode and Volume patterns', () => {
    it('detects "Episode 1"', () => {
      expect(detectSeries('Training Episode 1').isSeries).toBe(true)
      expect(detectSeries('Training Episode 1').partNumber).toBe(1)
    })

    it('detects "Ep. 3"', () => {
      const r = detectSeries('Mobility Series Ep. 3')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(3)
    })

    it('detects "Vol. 2"', () => {
      const r = detectSeries('Shoulder Workout Vol. 2')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(2)
    })

    it('detects "Volume 3"', () => {
      expect(detectSeries('Core Volume 3').isSeries).toBe(true)
    })
  })

  // ─── N/M standalone pattern ──────────────────────────────────────────────────

  describe('N/M standalone pattern', () => {
    it('detects "(1/3)" at end of title', () => {
      const r = detectSeries('Pull Day Workout (1/3)')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(1)
      expect(r.totalParts).toBe(3)
    })

    it('detects "- 2/4" at end of title', () => {
      const r = detectSeries('Chest Press Variations - 2/4')
      expect(r.isSeries).toBe(true)
      expect(r.partNumber).toBe(2)
      expect(r.totalParts).toBe(4)
    })
  })

  // ─── series name extraction ──────────────────────────────────────────────────

  describe('series name extraction', () => {
    it('strips the part indicator from the series name', () => {
      const r = detectSeries('Jeff Nippard Chest Workout Part 1')
      expect(r.seriesName).toBe('Jeff Nippard Chest Workout')
    })

    it('strips "Day N" from the series name', () => {
      const r = detectSeries('PPL Program Day 3')
      expect(r.seriesName).toBe('PPL Program')
    })

    it('strips trailing punctuation and spaces from the series name', () => {
      const r = detectSeries('Upper Body — Part 2')
      expect(r.seriesName?.trim()).toBe('Upper Body')
    })

    it('returns null seriesName for non-series titles', () => {
      expect(detectSeries('Chest Workout').seriesName).toBeNull()
    })
  })
})

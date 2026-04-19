import { isWorkoutURL, extractDomain } from '../../services/clipboardService'

describe('isWorkoutURL', () => {
  describe('YouTube', () => {
    it('recognizes youtube.com/watch URLs', () => {
      expect(isWorkoutURL('https://www.youtube.com/watch?v=abc123')).toBe(true)
    })
    it('recognizes youtu.be short URLs', () => {
      expect(isWorkoutURL('https://youtu.be/abc123')).toBe(true)
    })
    it('recognizes youtube.com/@channel URLs', () => {
      expect(isWorkoutURL('https://www.youtube.com/@jeffnippard')).toBe(true)
    })
    it('recognizes youtube.com/results search URLs', () => {
      expect(isWorkoutURL('https://www.youtube.com/results?search_query=chest+workout')).toBe(true)
    })
  })

  describe('Instagram', () => {
    it('recognizes instagram.com profile URLs', () => {
      expect(isWorkoutURL('https://www.instagram.com/jeffnippard/')).toBe(true)
    })
    it('recognizes instagram.com reel URLs', () => {
      expect(isWorkoutURL('https://www.instagram.com/reel/abc123/')).toBe(true)
    })
  })

  describe('TikTok', () => {
    it('recognizes tiktok.com profile URLs', () => {
      expect(isWorkoutURL('https://www.tiktok.com/@chloeting')).toBe(true)
    })
    it('recognizes tiktok.com video URLs', () => {
      expect(isWorkoutURL('https://www.tiktok.com/@chloeting/video/123456789')).toBe(true)
    })
  })

  describe('Generic web URLs', () => {
    it('recognizes any https URL', () => {
      expect(isWorkoutURL('https://bodybuilding.com/exercises/chest')).toBe(true)
    })
    it('recognizes http URLs', () => {
      expect(isWorkoutURL('http://example.com/workout')).toBe(true)
    })
  })

  describe('Invalid inputs', () => {
    it('rejects plain text', () => {
      expect(isWorkoutURL('some random text')).toBe(false)
    })
    it('rejects empty string', () => {
      expect(isWorkoutURL('')).toBe(false)
    })
    it('rejects partial URL without protocol', () => {
      expect(isWorkoutURL('youtube.com/watch?v=abc')).toBe(false)
    })
    it('rejects whitespace only', () => {
      expect(isWorkoutURL('   ')).toBe(false)
    })
    it('rejects text that contains a URL mixed with other content', () => {
      expect(isWorkoutURL('Check this out: https://youtube.com/watch?v=abc')).toBe(false)
    })
  })
})

describe('extractDomain', () => {
  it('extracts domain from youtube URL', () => {
    expect(extractDomain('https://www.youtube.com/watch?v=abc')).toBe('youtube.com')
  })
  it('extracts domain from youtu.be', () => {
    expect(extractDomain('https://youtu.be/abc')).toBe('youtu.be')
  })
  it('extracts domain from instagram URL', () => {
    expect(extractDomain('https://www.instagram.com/jeffnippard/')).toBe('instagram.com')
  })
  it('extracts domain from tiktok URL', () => {
    expect(extractDomain('https://www.tiktok.com/@chloeting')).toBe('tiktok.com')
  })
  it('strips www. prefix', () => {
    expect(extractDomain('https://www.example.com/path')).toBe('example.com')
  })
  it('returns null for non-URL text', () => {
    expect(extractDomain('not a url')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(extractDomain('')).toBeNull()
  })
})

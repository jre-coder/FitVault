export function isWorkoutURL(text: string): boolean {
  if (!text || !text.trim()) return false
  try {
    const url = new URL(text.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function extractDomain(text: string): string | null {
  try {
    const url = new URL(text.trim())
    return url.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

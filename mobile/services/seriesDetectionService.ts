export interface SeriesDetectionResult {
  isSeries: boolean
  partNumber: number | null
  totalParts: number | null
  seriesName: string | null
}

const NOT_SERIES: SeriesDetectionResult = {
  isSeries: false,
  partNumber: null,
  totalParts: null,
  seriesName: null,
}

// Each pattern: [regex, partGroup, totalGroup]
// Named capture groups: part = part number, total = optional total
const PATTERNS: RegExp[] = [
  // "Part 1", "Part 1 of 3", "Part 1/3", "(Part 2)"
  /\(?\bpart\s+(?<part>\d+)(?:\s+of\s+(?<total>\d+)|\/(?<total2>\d+))?\)?/i,
  // "Day 1", "Day 3 of 6", "Day 1/5"
  /\bday\s+(?<part>\d+)(?:\s+of\s+(?<total>\d+)|\/(?<total2>\d+))?/i,
  // "Week 1", "Week 4 of 12"
  /\bweek\s+(?<part>\d+)(?:\s+of\s+(?<total>\d+)|\/(?<total2>\d+))?/i,
  // "Episode 1", "Episode 3 of 5"
  /\bepisode\s+(?<part>\d+)(?:\s+of\s+(?<total>\d+)|\/(?<total2>\d+))?/i,
  // "Ep. 3", "Ep 3"
  /\bep\.?\s+(?<part>\d+)(?:\s+of\s+(?<total>\d+)|\/(?<total2>\d+))?/i,
  // "Vol. 2", "Volume 3"
  /\bvol(?:ume)?\.?\s+(?<part>\d+)(?:\s+of\s+(?<total>\d+)|\/(?<total2>\d+))?/i,
  // "(1/3)" or "- 2/4" near end of string (standalone N/M, total must be small ≤20)
  /(?:\(|[-–—]\s*)(?<part>\d+)\/(?<total2>\d+)\)?$/i,
]

// Strip matched segment plus trailing separators/whitespace
const STRIP_TRAILING = /[\s\-–—(),:;]+$/

export function detectSeries(title: string): SeriesDetectionResult {
  if (!title) return NOT_SERIES

  for (const pattern of PATTERNS) {
    const m = title.match(pattern)
    if (!m || !m.groups) continue

    const part = parseInt(m.groups.part ?? '', 10)
    const total = parseInt(m.groups.total ?? m.groups.total2 ?? '', 10)

    if (isNaN(part)) continue
    // Sanity: part numbers above 100 are likely years
    if (part > 100) continue
    // For standalone N/M patterns, total must be plausible (≤20)
    if (!isNaN(total) && total > 100) continue

    // Extract series name by removing the matched segment
    const matchStart = m.index ?? 0
    const raw = title.slice(0, matchStart)
    const seriesName = raw.replace(STRIP_TRAILING, '').trim() || null

    return {
      isSeries: true,
      partNumber: part,
      totalParts: isNaN(total) ? null : total,
      seriesName,
    }
  }

  return NOT_SERIES
}

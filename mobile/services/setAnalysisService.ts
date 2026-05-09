import { analyzeVideo } from '../modules/expo-set-analyzer'

export type TempoCategory = 'controlled' | 'borderline' | 'fast'

export interface SetAnalysisResult {
  repCount: number
  averageTempoSeconds: number | null
  minTempoSeconds: number | null
  maxTempoSeconds: number | null
  tempoCategory: TempoCategory | null
  summary: string
  guidance: string | null
  contentSuggestion: string | null
}

const CONTROLLED_THRESHOLD = 2.0   // seconds — at or above = controlled
const FAST_THRESHOLD = 1.5          // seconds — below = fast; between = borderline

function classifyTempo(avgSeconds: number): TempoCategory {
  if (avgSeconds >= CONTROLLED_THRESHOLD) return 'controlled'
  if (avgSeconds < FAST_THRESHOLD) return 'fast'
  return 'borderline'
}

function buildSummary(repCount: number, avgTempo: number | null): string {
  if (repCount === 0) return "FitVault couldn't detect any reps in this recording. Try positioning your phone so your full body is visible."
  if (avgTempo === null) return `FitVault counted ${repCount} ${repCount === 1 ? 'rep' : 'reps'}.`
  return `FitVault counted ${repCount} ${repCount === 1 ? 'rep' : 'reps'} at an average of ${avgTempo.toFixed(1)} seconds per rep.`
}

function buildGuidance(category: TempoCategory | null): { guidance: string | null; contentSuggestion: string | null } {
  switch (category) {
    case 'fast':
      return {
        guidance: 'Slower, more controlled reps (2–4 seconds each) can increase muscle engagement during each set. Want to explore content focused on tempo training?',
        contentSuggestion: 'tempo training',
      }
    case 'borderline':
      return {
        guidance: 'Your tempo is decent — slowing slightly may help maximize each rep. Want to see content on controlled rep pacing?',
        contentSuggestion: 'tempo training',
      }
    case 'controlled':
    default:
      return { guidance: null, contentSuggestion: null }
  }
}

export async function analyzeSet(videoUri: string, exerciseName: string): Promise<SetAnalysisResult> {
  const raw = await analyzeVideo(videoUri)

  const { repCount, repTimestamps } = raw

  if (repCount === 0 || repTimestamps.length === 0) {
    return {
      repCount: 0,
      averageTempoSeconds: null,
      minTempoSeconds: null,
      maxTempoSeconds: null,
      tempoCategory: null,
      summary: buildSummary(0, null),
      guidance: null,
      contentSuggestion: null,
    }
  }

  const durations = repTimestamps.map(r => r.end - r.start)
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length
  const min = Math.min(...durations)
  const max = Math.max(...durations)
  const category = classifyTempo(avg)
  const { guidance, contentSuggestion } = buildGuidance(category)

  return {
    repCount,
    averageTempoSeconds: avg,
    minTempoSeconds: min,
    maxTempoSeconds: max,
    tempoCategory: category,
    summary: buildSummary(repCount, avg),
    guidance,
    contentSuggestion,
  }
}

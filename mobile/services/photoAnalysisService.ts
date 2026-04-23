// WARNING: Never ship API keys in production client code. Use a backend proxy.
import { PhotoAnalysisResult } from '../types'
import { CLAUDE_API_URL, CLAUDE_MODEL } from '../constants'

const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? ''

const ANALYSIS_PROMPT = `You are a fitness expert analyzing photos of workout content.
The photos may show handwritten or printed workout plans, whiteboard workouts, gym screens, app screenshots, or exercise sheets.

Extract and return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "title": "Short descriptive workout name",
  "bodyParts": ["array of targeted body parts"],
  "difficulty": "Beginner|Intermediate|Advanced",
  "exercises": [
    {
      "name": "Exercise name",
      "sets": 3,
      "reps": "10-12",
      "weight": "optional weight string e.g. '135 lbs' or '20 kg'",
      "duration": "optional duration e.g. '30 sec' or '1 min'",
      "notes": "optional notes about form or variations"
    }
  ],
  "notes": "Any general workout notes, rest times, or instructions visible in the photos"
}

Rules:
- bodyParts values MUST be from: Full Body, Chest, Back, Shoulders, Arms, Core, Legs, Glutes, Cardio, Mobility
- sets must be a number or omitted if not visible
- reps should be a string to allow ranges like "8-10" or "to failure"
- If a field is not visible in the photos, omit it (except name which is always required)
- Include all exercises visible across all provided photos
- If photos show the same workout from different angles, do not duplicate exercises`

export async function analyzeWorkoutPhotos(base64Images: string[]): Promise<PhotoAnalysisResult> {
  const imageBlocks = base64Images.map(data => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data,
    },
  }))

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Photo analysis failed: HTTP ${response.status}`)
  }

  const data = await response.json()
  const text: string = data.content[0].text

  let result: PhotoAnalysisResult
  try {
    // Strip markdown code fences if Claude wraps the JSON anyway
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    console.error('[PhotoAnalysis] raw response:', text.slice(0, 300))
    throw new Error(`Failed to parse photo analysis response: ${text.slice(0, 100)}`)
  }

  return result
}

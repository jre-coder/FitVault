// WARNING: Never ship API keys in production client code. Use a backend proxy.
import { AIWorkoutSuggestion, BodyPart, WorkoutItem } from '../types'
import { CLAUDE_API_URL, CLAUDE_MODEL } from '../constants'

const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? ''

const JSON_FORMAT_INSTRUCTIONS = `Return ONLY valid JSON with no markdown, no code fences, no extra text.
Use this exact structure:
{"recommendations":[{"rank":1,"title":"...","creator":"Creator or Channel Name","handle":"@platformhandle","platform":"youtube|instagram|tiktok|website|other","targetMuscles":["Full Body"],"description":"2-sentence description","explanation":"<explanation key>","durationMinutes":20,"difficulty":"Beginner|Intermediate|Advanced"}]}
Recommend real, well-known creators and programs with large followings. Prioritize content that is popular, highly rated, and widely recommended by the fitness community.
creator MUST be the real name of the YouTube channel, TikTok account, or content creator.
handle MUST be the exact platform handle/username (e.g. "@jeffnippard" for YouTube/TikTok, "jeffnippard" for Instagram). Only include handle if you are 100% certain of the exact handle. If unsure, use empty string "".
targetMuscles values MUST be from this list only: Full Body, Chest, Back, Shoulders, Arms, Core, Legs, Glutes, Cardio, Mobility
platform must match one of the requested platforms.`

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function buildURL(title: string, creator: string, handle: string, platform: string): string {
  const q = encodeURIComponent(`${creator} ${title}`.trim())
  switch (platform) {
    case 'youtube':
      return handle
        ? `https://www.youtube.com/${handle}`
        : `https://www.youtube.com/results?search_query=${q}`
    case 'tiktok':
      return handle
        ? `https://www.tiktok.com/${handle}`
        : `https://www.google.com/search?q=site%3Atiktok.com+${q}`
    case 'instagram':
      return handle
        ? `https://www.instagram.com/${handle}/`
        : `https://www.google.com/search?q=site%3Ainstagram.com+${q}`
    default:
      return `https://www.google.com/search?q=${q}+workout`
  }
}

async function callClaude(prompt: string, allowedPlatforms?: string[]): Promise<AIWorkoutSuggestion[]> {
  if (!API_KEY) {
    throw new Error('EXPO_PUBLIC_CLAUDE_API_KEY is not set. Check your .env.local file.')
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Claude API error ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = await response.json()
  const rawText: string = data?.content?.[0]?.text ?? ''

  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  const parsed = JSON.parse(cleaned) as { recommendations: Omit<AIWorkoutSuggestion, 'id' | 'url'>[] }

  return parsed.recommendations.map((r) => {
    const platformOverridden = allowedPlatforms?.length && !allowedPlatforms.includes(r.platform)
    const platform = platformOverridden ? allowedPlatforms[0] : r.platform
    const creator = r.creator ?? ''
    const handle = platformOverridden ? '' : (r.handle ?? '')
    return { ...r, id: generateId(), creator, handle, platform, url: buildURL(r.title, creator, handle, platform) }
  })
}

function workoutTypeFilter(workoutTypes: string[]): string {
  const active = workoutTypes.filter((t) => t !== 'any')
  return active.length > 0 ? `Workout style/type: ${active.join(', ')}.` : ''
}

export async function fetchTopWorkouts(bodyPart: BodyPart, platforms: string[], workoutTypes: string[]): Promise<AIWorkoutSuggestion[]> {
  const typeFilter = workoutTypeFilter(workoutTypes)
  const prompt = `You are a fitness expert. Recommend the 5 best ${bodyPart} workout videos or resources from well-known, popular creators with large followings.
IMPORTANT: You MUST only recommend content from these platforms: ${platforms.join(', ')}. Every recommendation's platform field MUST be one of: ${platforms.join(', ')}.${typeFilter ? `\n${typeFilter}` : ''}
${JSON_FORMAT_INSTRUCTIONS}`
  return callClaude(prompt, platforms)
}

export async function fetchSimilarWorkouts(workout: WorkoutItem, platforms: string[], workoutTypes: string[]): Promise<AIWorkoutSuggestion[]> {
  const typeFilter = workoutTypeFilter(workoutTypes)
  const prompt = `You are a fitness expert. Find 5 popular workouts from well-known creators similar to this one:
Title: ${workout.title}
Body Parts: ${workout.bodyParts.join(', ')}
Notes: ${workout.notes}
IMPORTANT: You MUST only recommend content from these platforms: ${platforms.join(', ')}. Every recommendation's platform field MUST be one of: ${platforms.join(', ')}.${typeFilter ? `\n${typeFilter}` : ''}

${JSON_FORMAT_INSTRUCTIONS}`
  return callClaude(prompt, platforms)
}

export async function fetchRecommendations(params: {
  goals: string
  fitnessLevel: string
  equipment: string[]
  durationMinutes: number
  platforms: string[]
  workoutTypes: string[]
}): Promise<AIWorkoutSuggestion[]> {
  const typeFilter = workoutTypeFilter(params.workoutTypes)
  const prompt = `You are a fitness expert. Recommend 5 personalized workouts from well-known, popular creators based on:
Goals: ${params.goals}
Fitness Level: ${params.fitnessLevel}
Available Equipment: ${params.equipment.join(', ')}
Session Duration: ${params.durationMinutes} minutes
IMPORTANT: You MUST only recommend content from these platforms: ${params.platforms.join(', ')}. Every recommendation's platform field MUST be one of: ${params.platforms.join(', ')}.${typeFilter ? `\n${typeFilter}` : ''}

${JSON_FORMAT_INSTRUCTIONS}`
  return callClaude(prompt, params.platforms)
}

export function safeURL(s: AIWorkoutSuggestion): string {
  return s.url
}

export function suggestionToWorkoutItem(
  s: AIWorkoutSuggestion,
): Omit<WorkoutItem, 'id' | 'dateAdded'> {
  const validPlatforms = ['youtube', 'instagram', 'tiktok', 'website', 'other'] as const
  type SourceType = (typeof validPlatforms)[number]
  const sourceType: SourceType = validPlatforms.includes(s.platform as SourceType)
    ? (s.platform as SourceType)
    : 'other'

  const validBodyParts = [
    'Full Body', 'Chest', 'Back', 'Shoulders', 'Arms',
    'Core', 'Legs', 'Glutes', 'Cardio', 'Mobility',
  ] as const
  type BodyPartType = (typeof validBodyParts)[number]

  const bodyParts = s.targetMuscles.filter((m): m is BodyPartType =>
    validBodyParts.includes(m as BodyPartType),
  )

  return {
    title: s.title,
    url: safeURL(s),
    sourceType,
    bodyParts: bodyParts.length > 0 ? bodyParts : ['Full Body'],
    notes: s.description,
    isFavorite: false,
  }
}

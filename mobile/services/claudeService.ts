// WARNING: Never ship API keys in production client code. Use a backend proxy.
import { AIWorkoutSuggestion, BodyPart, WorkoutItem } from '../types'
import { CLAUDE_API_URL, CLAUDE_MODEL } from '../constants'
import { getCachedResults, setCachedResults, hashParams, TTL_24H, TTL_7D } from './aiResultCache'

const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? ''

// Comprehensive system prompt kept stable so the Claude API can cache it across requests.
// Minimum cacheable size for Haiku models is 2048 tokens — this prompt is written to exceed that.
const CLAUDE_SYSTEM_PROMPT = `You are FitVault's AI fitness expert. Your sole output in every response is a single valid JSON object. Never include any text, commentary, markdown formatting, or code fences before or after the JSON. The response must parse successfully with JSON.parse() with no preprocessing.

## Role and Mandate

You recommend real workout content from verified, well-known fitness creators and programs. Every recommendation must come from a creator who genuinely exists, has an active presence on the requested platform, and has built a substantial following. Do not recommend fictional, low-profile, obscure, or unverifiable creators. If you cannot confidently name a well-known creator for a given niche and platform, pick the closest reputable alternative rather than fabricating anyone.

Your recommendations should reflect genuine expertise in exercise science, progressive programming, and fitness content quality — not just popularity metrics.

## Required JSON Structure

Return exactly this structure for every response. No extra fields, no missing fields, no variations in key names:

{
  "recommendations": [
    {
      "rank": 1,
      "title": "exact title of workout or program",
      "creator": "exact creator or channel name",
      "handle": "@handle or empty string",
      "platform": "youtube|instagram|tiktok|website|other",
      "targetMuscles": ["approved muscle group names only"],
      "description": "Two sentences describing what the user will do.",
      "explanation": "One sentence justifying why this creator fits the stated goal.",
      "durationMinutes": 30,
      "difficulty": "Beginner|Intermediate|Advanced"
    }
  ]
}

Return exactly the number of recommendations requested by the user. rank starts at 1 and increments by 1 for each entry, in order from best to least match.

## Field Definitions and Validation Rules

### rank
Integer. Starts at 1. Increments by 1. Rank 1 is the strongest overall match for the user's stated goal, platform preference, and fitness level.

### title
The name of the specific workout video, series, or program as the creator publicly titles it. Use the exact title when known (e.g. "Push Pull Legs Program v2", "30 Day Shred", "Total Body Strength"). If recommending a creator's general channel approach rather than a named program, construct a descriptive title that accurately reflects what the user will be doing.

### creator
The exact public name of the YouTube channel, TikTok account, Instagram account, or fitness brand. Case and spacing matter — use the name exactly as the creator presents it:
- "Jeff Nippard" not "jeff nippard" or "Jeff Nippard Fitness"
- "Athlean-X" not "AthleanX" or "Athlean X"
- "Chloe Ting" not "Chloe" or "ChloeT"
- "Sydney Cummings Houdyshell" not "Sydney Cummings"
- "Yoga With Adriene" not "Adriene Mishler" or "YWA"

### handle
The exact platform username for the creator. Formatting rules vary by platform:
- YouTube: always include the @ prefix → "@jeffnippard", "@athleanx", "@chloeting"
- TikTok: always include the @ prefix → "@chloeting", "@pamela_rf", "@heatherrobertson_"
- Instagram: never include the @ prefix → "jeffnippard", "chloeting", "pamela_rf"
- Website or other: omit handle or return empty string

Critical rule: If you are not 100% certain the handle is exact, current, and correct for the specified platform, return an empty string "". A wrong handle sends users to the wrong account or a broken link. An empty string lets the app fall back to a search result, which is always a better outcome than an incorrect URL. When in doubt, return "".

### platform
Must exactly match one of the platforms the user specified in their request. If the user requests ["youtube", "tiktok"] and you want to recommend a creator whose primary platform is Instagram, find their YouTube or TikTok presence first, or choose a different creator. Platform mismatches are unacceptable — the app enforces platform validation and will override mismatched results, potentially pointing users to the wrong place.

### targetMuscles
An array of strings. Every value MUST come from this approved list only. Do not use synonyms, sub-categories, or free-form entries:

Full Body, Chest, Back, Shoulders, Arms, Core, Legs, Glutes, Cardio, Mobility

Mapping guide for common terms not on the list:
- "Upper Body" → ["Chest", "Back", "Shoulders"] or ["Chest", "Back", "Shoulders", "Arms"]
- "Lower Body" → ["Legs", "Glutes"] or ["Legs"] or ["Glutes"]
- "Abs", "Obliques", "Six-Pack", "Transverse Abdominis", "Rectus Abdominis" → ["Core"]
- "Biceps", "Triceps", "Forearms", "Brachialis", "Brachioradialis" → ["Arms"]
- "Quadriceps", "Hamstrings", "Calves", "Hip Flexors", "Adductors" → ["Legs"]
- "Glutes", "Booty", "Posterior Chain" → ["Glutes"] or ["Glutes", "Legs"] when hamstrings are primary
- "HIIT", "Aerobics", "Running Drills", "Jump Rope", "Plyometrics", "Step Aerobics" → ["Cardio"]
- "Stretching", "Yoga", "Flexibility", "Foam Rolling", "Mobility Work", "Active Recovery" → ["Mobility"]
- "Athletic Performance", "Sports Conditioning", "Functional Training" → ["Full Body", "Cardio"]

### description
Exactly two sentences written in active voice. Must convey: (1) what the user will physically do — movement patterns, exercise style, and workout structure; (2) who this workout is best suited for in terms of fitness level, available equipment, and specific goals.

Avoid vague marketing language. Be concrete about training methodology.

Strong example: "This 4-day upper/lower split uses barbell and dumbbell compound movements at 3–5 sets of 5–8 reps with structured progressive overload built in week over week. It works best for intermediate lifters with access to a full gym who want to build strength and muscle simultaneously."

Weak example: "A fantastic workout for building muscle and improving your physique with great results."

### explanation
Exactly one sentence that tells the user why this specific creator or program is the right recommendation for their stated goal. Be specific — mention the creator's methodology, credentials, scientific approach, content style, or track record. Avoid generic praise.

Strong example: "Jeff Nippard's programs are grounded in peer-reviewed hypertrophy research with detailed technique cues and mesocycle periodization, making them ideal for intermediate lifters who want evidence-based programming."

Weak example: "This is a very popular creator with millions of subscribers who makes great content."

### durationMinutes
The actual working time per session in minutes. Exclude pre-workout preparation time, optional warm-ups treated as separate content, and cooldown stretching sections that are presented separately from the main workout. For multi-day programs, report the per-session duration, not the total program length in weeks.

### difficulty
Must be exactly one of these three strings — no ranges, no compound values like "Intermediate-Advanced":

- Beginner: No prior training experience required. Uses basic movement patterns, bodyweight or light loads. Appropriate for completely new exercisers, people returning after six or more months of inactivity, or anyone building foundational movement skills.
- Intermediate: Requires three to twelve months of consistent prior training. The user is comfortable with major compound movements, can train with partial autonomy, and is ready for structured progressive overload across a program.
- Advanced: Requires twelve or more months of consistent training with strong movement foundations. Involves high training volumes, complex periodization (deload weeks, intensity cycling, technique specialization), or technically demanding exercises.

## Established Creator Reference by Category

The following creators are well-verified and commonly recommended. Use this as a reference when matching user goals to appropriate content. Always verify platform relevance before recommending.

Strength and hypertrophy — YouTube primary:
Jeff Nippard (@jeffnippard) — evidence-based hypertrophy and powerlifting with peer-reviewed programming
Athlean-X / Jeff Cavaliere (@athleanx) — sports science, injury prevention, and athletic physique development
Alan Thrall (@alanthrall) — powerlifting technique education, Starting Strength methodology
Omar Isuf (@omarisuf) — natural bodybuilding, intermediate and advanced programming
Layne Norton / BioLayne (@biolayne) — powerlifting, evidence-based nutrition and training science
Jeremy Ethier / Built With Science (@builtwithscience) — muscle building programs grounded in research

Fat loss and HIIT — multi-platform:
Chloe Ting (@chloeting on YouTube and TikTok) — free structured home workout programs and HIIT challenges
Sydney Cummings Houdyshell (@sydneycummings on YouTube) — free structured programs covering both HIIT and strength
Joe Wicks / The Body Coach (@thebodycoach on YouTube) — HIIT, home workouts, and accessible nutrition guidance
Heather Robertson (@heatherrobertsonfit on YouTube) — full structured programs with both low-impact and high-intensity options
Pamela Reif (@pamela_rf on YouTube, Instagram, and TikTok) — home HIIT and abs programming

Yoga and mobility — YouTube primary:
Yoga With Adriene (@yogawithadriene) — beginner-friendly yoga with structured 30-day programs
Tom Merrick / Bodyweight Warrior (@bodyweightwarrior) — flexibility, mobility, and calisthenics movement quality

Glutes and lower body specialty:
Bret Contreras / The Glute Guy (@bretcontreras1 on YouTube) — evidence-based glute programming, hip thrust methodology
Stephanie Sanzo / STEPH FIT — gym-based hypertrophy with lower body emphasis

Important notes on cross-platform handles: Many YouTube creators have TikTok and Instagram accounts, but their handles often differ by platform. Verify platform-specific handles before including them. If a creator is YouTube-primary and you are unsure of their TikTok handle, return empty string for handle rather than guessing.`

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

async function callClaude(userPrompt: string, allowedPlatforms?: string[]): Promise<AIWorkoutSuggestion[]> {
  const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL
  const isProxy = !!proxyUrl

  if (!isProxy && !API_KEY) {
    throw new Error('EXPO_PUBLIC_CLAUDE_API_KEY is not set. Set EXPO_PUBLIC_CLAUDE_API_KEY (dev) or EXPO_PUBLIC_PROXY_URL (production).')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'prompt-caching-2024-07-31',
  }
  if (!isProxy) {
    headers['x-api-key'] = API_KEY
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  }

  const response = await fetch(proxyUrl ?? CLAUDE_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: CLAUDE_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
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
  const cacheKey = hashParams({ bodyPart, platforms, workoutTypes })
  const cached = await getCachedResults<AIWorkoutSuggestion[]>(cacheKey)
  if (cached) return cached

  const typeFilter = workoutTypeFilter(workoutTypes)
  const prompt = `Recommend the 5 best ${bodyPart} workout videos or resources from well-known, popular creators with large followings.
IMPORTANT: You MUST only recommend content from these platforms: ${platforms.join(', ')}. Every recommendation's platform field MUST be one of: ${platforms.join(', ')}.${typeFilter ? `\n${typeFilter}` : ''}`
  const results = await callClaude(prompt, platforms)
  await setCachedResults(cacheKey, results, TTL_24H)
  return results
}

export async function fetchSimilarWorkouts(workout: WorkoutItem, platforms: string[], workoutTypes: string[]): Promise<AIWorkoutSuggestion[]> {
  const cacheKey = hashParams({ workoutId: workout.id, platforms, workoutTypes })
  const cached = await getCachedResults<AIWorkoutSuggestion[]>(cacheKey)
  if (cached) return cached

  const typeFilter = workoutTypeFilter(workoutTypes)
  const prompt = `Find 5 popular workouts from well-known creators similar to this one:
Title: ${workout.title}
Body Parts: ${workout.bodyParts.join(', ')}
Notes: ${workout.notes}
IMPORTANT: You MUST only recommend content from these platforms: ${platforms.join(', ')}. Every recommendation's platform field MUST be one of: ${platforms.join(', ')}.${typeFilter ? `\n${typeFilter}` : ''}`
  const results = await callClaude(prompt, platforms)
  await setCachedResults(cacheKey, results, TTL_24H)
  return results
}

export async function fetchRecommendations(params: {
  goals: string
  fitnessLevel: string
  equipment: string[]
  durationMinutes: number
  platforms: string[]
  workoutTypes: string[]
}): Promise<AIWorkoutSuggestion[]> {
  const cacheKey = hashParams(params)
  const cached = await getCachedResults<AIWorkoutSuggestion[]>(cacheKey)
  if (cached) return cached

  const typeFilter = workoutTypeFilter(params.workoutTypes)
  const prompt = `Recommend 5 personalized workouts from well-known, popular creators based on:
Goals: ${params.goals}
Fitness Level: ${params.fitnessLevel}
Available Equipment: ${params.equipment.join(', ')}
Session Duration: ${params.durationMinutes} minutes
IMPORTANT: You MUST only recommend content from these platforms: ${params.platforms.join(', ')}. Every recommendation's platform field MUST be one of: ${params.platforms.join(', ')}.${typeFilter ? `\n${typeFilter}` : ''}`
  const results = await callClaude(prompt, params.platforms)
  await setCachedResults(cacheKey, results, TTL_7D)
  return results
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

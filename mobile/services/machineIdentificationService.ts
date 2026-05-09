// WARNING: Never ship API keys in production client code. Use a backend proxy.
import { MachineIdentificationResult, Routine, UserProfile, WorkoutItem } from '../types'
import { CLAUDE_API_URL, CLAUDE_MODEL } from '../constants'
import { getCachedResults, setCachedResults, hashParams, TTL_7D } from './aiResultCache'

const API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? ''

// Kept long (>2048 tokens for Haiku) so the Claude API caches this block across calls.
const MACHINE_SYSTEM_PROMPT = `You are FitVault's AI gym equipment identifier. Your sole output in every response is a single valid JSON object describing the gym machine in the photo. Never include text, commentary, markdown, or code fences before or after the JSON. The response must parse successfully with JSON.parse() with no preprocessing.

## Role and Mandate

You analyze photos of gym machines and fitness equipment. Identify what the machine is, suggest appropriate exercises that can be performed on it, and return a structured JSON response. Be accurate and conservative — if you cannot identify the machine with reasonable confidence, set recognized to false.

## Required JSON Structure

Return exactly this structure:

{
  "recognized": true,
  "machineName": "Cable Row Machine",
  "exercises": [
    {
      "name": "Seated Cable Row",
      "sets": 3,
      "reps": "10-12"
    }
  ],
  "bodyParts": ["Back", "Arms"],
  "confidence": "high",
  "notes": "Optional notes about the machine setup or key exercises."
}

All fields are required. The exercises array may be empty if the machine is not recognized.

## Field Definitions

### recognized
Boolean. Set to true when you can confidently identify the machine. Set to false when the photo is too blurry, obscured, shows something that is not a gym machine, or the equipment is too unusual to identify reliably.

### machineName
The standard common name for the machine: e.g. "Lat Pulldown Machine", "Leg Press", "Smith Machine", "Cable Crossover Station", "Seated Leg Curl", "Chest Fly Machine", "Hack Squat Machine", "Assisted Pull-Up Machine". Use "Unknown Machine" when recognized is false.

### exercises
An array of exercises that can be performed on this machine. Include 1–4 of the most common and effective exercises. Each exercise object must include name (required), sets (recommended integer, optional), and reps (recommended string range, optional). Omit exercises for unrecognized machines (empty array). Exercise names must be standard English names.

### bodyParts
Array of primary muscle groups this machine targets. Use only values from this approved list: Full Body, Chest, Back, Shoulders, Arms, Core, Legs, Glutes, Cardio, Mobility. Use an empty array when recognized is false.

### confidence
One of: "high", "medium", "low".
- high: You can clearly see the machine and are certain of the identification.
- medium: You can likely identify the machine but there is some uncertainty (partial view, unusual angle, similar to another machine).
- low: You are guessing. Prefer setting recognized to false over returning a low-confidence identification.

### notes
Optional string. Include if there is a useful setup tip, key adjustment (seat height, cable height, grip), or safety note. Omit the field entirely if there is nothing meaningful to add.

## Common Machine Identifications

Cable machines: Look for weight stacks with cables running through pulleys. Key variants: high pulley (lat pulldown, tricep pushdown), low pulley (seated row, cable curl), dual pulley (cable crossover, face pull).

Plate-loaded machines: No weight stack — user loads plates. Common: leg press, hack squat, chest press, Smith machine.

Selectorized machines: Weight stack with a pin selector. Most common in commercial gyms. Each machine is purpose-built for a single movement pattern.

Cardio equipment: Treadmill, elliptical, rowing machine, stationary bike, stair climber — identify by the movement mechanism visible.

Free weight stations: Squat rack, power rack, bench press station — identify by the j-hooks, safety bars, or barbell resting position.

## User Profile Context

When the user's profile is provided (goals, fitness level, sensitive areas), tailor the suggested exercises to be appropriate for that profile. If the user has a sensitive area (e.g. lower back), note any relevant precautions in the notes field. If the fitness level is Beginner, favor machines with guided range of motion and simpler movement patterns. Do not change the machineName or confidence based on the profile — only adjust the exercises list and notes.

## Accuracy Standards

Never invent a machine identification when the photo is unclear. It is always better to return recognized: false with an empty exercises array than to confidently misidentify equipment and prescribe the wrong exercises. A user acting on wrong machine identification could injure themselves.`

export async function identifyMachine(
  base64Image: string,
  profile?: UserProfile
): Promise<MachineIdentificationResult> {
  const cacheKey = 'machine:' + hashParams({ img: base64Image, profile: profile ?? null })
  const cached = await getCachedResults<MachineIdentificationResult>(cacheKey)
  if (cached) return cached

  const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL
  const isProxy = !!proxyUrl

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'prompt-caching-2024-07-31',
  }
  if (!isProxy) {
    headers['x-api-key'] = API_KEY
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  }

  const profileContext = profile
    ? `\n\nUser profile:\n- Fitness level: ${profile.fitnessLevel}\n- Goals: ${profile.goals.join(', ')}\n- Sensitive areas: ${profile.sensitiveAreas.length > 0 ? profile.sensitiveAreas.join(', ') : 'none'}\n- Age: ${profile.age ?? 'not specified'}`
    : ''

  const response = await fetch(proxyUrl ?? CLAUDE_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: MACHINE_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Identify this gym machine and return the structured JSON.${profileContext}`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Machine identification failed: HTTP ${response.status}`)
  }

  const data = await response.json()
  const text: string = data.content[0].text

  let result: MachineIdentificationResult
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    result = JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse machine identification response: ${text.slice(0, 100)}`)
  }

  await setCachedResults(cacheKey, result, TTL_7D)
  return result
}

export function buildMachineEphemeralExecution(
  result: MachineIdentificationResult
): { routine: Routine; workouts: WorkoutItem[] } {
  const workoutId = 'machine-workout-' + Date.now()
  const routineId = 'machine-routine-' + Date.now()
  const now = new Date().toISOString()

  const workout: WorkoutItem = {
    id: workoutId,
    title: result.machineName,
    url: '',
    sourceType: 'other',
    bodyParts: result.bodyParts,
    notes: result.notes ?? '',
    dateAdded: now,
    isFavorite: false,
    exercises: result.exercises,
  }

  const routine: Routine = {
    id: routineId,
    name: result.machineName,
    items: [{ workoutItemId: workoutId, order: 0 }],
    createdAt: now,
  }

  return { routine, workouts: [workout] }
}

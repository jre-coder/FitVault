export type SourceType = 'youtube' | 'instagram' | 'tiktok' | 'website' | 'other'

export type BodyPart =
  | 'Full Body'
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Core'
  | 'Legs'
  | 'Glutes'
  | 'Cardio'
  | 'Mobility'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced'

export interface WorkoutItem {
  id: string
  title: string
  url: string
  sourceType: SourceType
  bodyParts: BodyPart[]
  notes: string
  dateAdded: string
  isFavorite: boolean
}

export interface AIWorkoutSuggestion {
  id: string
  rank: number
  title: string
  creator: string
  url: string
  platform: string
  targetMuscles: string[]
  description: string
  explanation: string
  durationMinutes: number
  difficulty: Difficulty
}

export interface SubscriptionProduct {
  id: string
  title: string
  price: string
  period: string
  badge?: string
}

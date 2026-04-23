export type SourceType = 'youtube' | 'instagram' | 'tiktok' | 'website' | 'other' | 'photo'

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

export interface Exercise {
  name: string
  sets?: number
  reps?: string
  weight?: string
  duration?: string
  notes?: string
}

export interface PhotoAnalysisResult {
  title: string
  bodyParts: BodyPart[]
  difficulty: Difficulty
  exercises: Exercise[]
  notes: string
}

export interface WorkoutItem {
  id: string
  title: string
  url: string
  sourceType: SourceType
  bodyParts: BodyPart[]
  notes: string
  dateAdded: string
  isFavorite: boolean
  exercises?: Exercise[]
  imageUris?: string[]
}

export interface AIWorkoutSuggestion {
  id: string
  rank: number
  title: string
  creator: string
  handle: string
  url: string
  platform: string
  targetMuscles: string[]
  description: string
  explanation: string
  durationMinutes: number
  difficulty: Difficulty
}

export interface PendingShareItem {
  id: string
  url: string
  title: string
  notes: string
  bodyParts: BodyPart[]
  sourceType: SourceType
  savedAt: string
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export interface RoutineItem {
  workoutItemId: string
  order: number
}

export interface Routine {
  id: string
  name: string
  items: RoutineItem[]
  createdAt: string
}

export type DaySchedule = string | 'rest' | null  // string = routine id

export interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface SubscriptionProduct {
  id: string
  title: string
  price: string
  period: string
  badge?: string
}

export type ExecutionStepKind = 'exercise' | 'reference'

export interface ExecutionStep {
  kind: ExecutionStepKind
  workoutItemId: string
  workoutTitle: string
  workoutIndex: number
  workoutCount: number
  exerciseIndex?: number
  exerciseCount?: number
  exercise?: Exercise
  url?: string
  sourceType?: SourceType
}

export interface LoggedSet {
  exerciseName: string
  setNumber: number
  completedAt: string
}

export interface LoggedWorkout {
  workoutItemId: string
  workoutTitle: string
  setsLogged: LoggedSet[]
  skipped: boolean
}

export interface WorkoutLog {
  id: string
  routineId: string
  routineName: string
  startedAt: string
  completedAt: string
  durationSeconds: number
  workouts: LoggedWorkout[]
  totalSetsLogged: number
}

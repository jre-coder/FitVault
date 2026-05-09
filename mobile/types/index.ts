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
  repsCompleted?: number
  weightKg?: number
  durationSeconds?: number
}

export type ProgressionTrend = 'new' | 'improving' | 'plateau' | 'regressing'

export interface ProgressionSuggestion {
  exerciseName: string
  suggestedSets: number | null
  suggestedReps: string | null
  suggestedWeightKg: number | null
  suggestedDurationSeconds: number | null
  lastSessionSummary: string | null
  trend: ProgressionTrend
  rationale: string
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

export const GOAL_OPTIONS = [
  'Fat Loss',
  'Muscle Growth',
  'Strength',
  'Endurance',
  'Flexibility',
  'Glutes',
  'Arms',
  'Core',
  'General Fitness',
] as const

export const SENSITIVE_AREA_OPTIONS = [
  'Hips',
  'Knees',
  'Shoulders',
  'Lower Back',
  'Neck',
  'Wrists',
  'Ankles',
] as const

export interface ParsedWorkoutExercise {
  name: string
  sets?: number
  reps?: string
  weight?: string
  duration?: string
}

export type DiagnosisIssueSeverity = 'error' | 'warning' | 'info'

export interface DiagnosisIssue {
  severity: DiagnosisIssueSeverity
  title: string
  description: string
}

export interface VideoSuggestion {
  creator: string    // display name, e.g. "Jeff Nippard"
  handle: string     // e.g. "jeffnippard"
  platform: string   // "youtube" | "instagram" | "tiktok"
  url: string        // channel/profile URL
}

export interface ExerciseSwap {
  original: string
  replacement: string
  reason: string
  videoSuggestion?: VideoSuggestion
}

export interface WorkoutAnalysis {
  parsedExercises: ParsedWorkoutExercise[]
  muscleGroups: string[]
  estimatedDurationMinutes: number
  issues: DiagnosisIssue[]
  optimizedExercises: ParsedWorkoutExercise[]
  swaps: ExerciseSwap[]
  coachNotes: string
}

export interface UserProfile {
  goals: string[]
  fitnessLevel: FitnessLevel
  age?: number
  sensitiveAreas: string[]
  equipment: string[]
  preferredDuration: number
  preferredPlatforms: string[]
  preferredWorkoutTypes: string[]
}

export interface WorkoutSeries {
  id: string
  title: string          // user-visible series name, e.g. "Jeff Nippard PPL"
  workoutIds: string[]   // ordered WorkoutItem IDs (part 1, part 2, …)
  createdAt: string
}

export type MachineConfidence = 'high' | 'medium' | 'low'

export interface MachineIdentificationResult {
  recognized: boolean
  machineName: string
  exercises: ParsedWorkoutExercise[]
  bodyParts: BodyPart[]
  confidence: MachineConfidence
  notes?: string
}

export type TodayRecommendationType = 'routine' | 'rest' | 'no_routines'

export interface TodayRecommendation {
  type: TodayRecommendationType
  routine?: Routine
  reason: string
  readyMuscles: string[]
  fatiguedMuscles: string[]
  daysSinceLastWorkout: number | null
}

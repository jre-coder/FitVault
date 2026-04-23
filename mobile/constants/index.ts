import { BodyPart, SourceType } from '../types'

export const BODY_PARTS: BodyPart[] = [
  'Full Body',
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Core',
  'Legs',
  'Glutes',
  'Cardio',
  'Mobility',
]

export const SOURCE_TYPES: SourceType[] = [
  'youtube',
  'instagram',
  'tiktok',
  'website',
  'other',
  'photo',
]

export const SOURCE_LABELS: Record<SourceType, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Website',
  other: 'Other',
  photo: 'Photo',
}

export const SOURCE_ICONS: Record<SourceType, string> = {
  youtube: 'logo-youtube',
  instagram: 'logo-instagram',
  tiktok: 'musical-notes',
  website: 'globe-outline',
  other: 'link-outline',
  photo: 'camera-outline',
}

export const SOURCE_COLORS: Record<SourceType, string> = {
  youtube: '#FF0000',
  instagram: '#C13584',
  tiktok: '#333333',
  website: '#007AFF',
  other: '#8E8E93',
  photo: '#34C759',
}

export const BODY_PART_ICONS: Record<BodyPart, string> = {
  'Full Body': 'body-outline',
  'Chest': 'fitness-outline',
  'Back': 'arrow-back-circle-outline',
  'Shoulders': 'barbell-outline',
  'Arms': 'barbell-outline',
  'Core': 'ellipse-outline',
  'Legs': 'walk-outline',
  'Glutes': 'accessibility-outline',
  'Cardio': 'heart-outline',
  'Mobility': 'resize-outline',
}

export const COLORS = {
  accent: '#007AFF',
  background: '#FFFFFF',
  secondaryBackground: '#F2F2F7',
  text: '#000000',
  secondaryText: '#8E8E93',
  separator: '#C6C6C8',
  destructive: '#FF3B30',
}

export const WORKOUT_TYPES = [
  { id: 'any',       label: 'Any' },
  { id: 'female',    label: 'Female Focus' },
  { id: 'male',      label: 'Male Focus' },
  { id: 'hiit',      label: 'HIIT' },
  { id: 'strength',  label: 'Strength' },
  { id: 'cardio',    label: 'Cardio' },
  { id: 'dance',     label: 'Dance' },
  { id: 'yoga',      label: 'Yoga' },
  { id: 'pilates',   label: 'Pilates' },
  { id: 'bodyweight',label: 'Bodyweight' },
  { id: 'weighted',  label: 'Weighted' },
  { id: 'gym',       label: 'Gym' },
  { id: 'outdoor',   label: 'Outdoor' },
]

export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
export const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

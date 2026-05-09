import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SOURCE_COLORS, SOURCE_ICONS, SOURCE_LABELS } from '../constants'
import { useWorkouts } from '../context/WorkoutContext'
import { useWorkoutLogs } from '../context/WorkoutLogContext'
import { useWorkoutSeries } from '../context/WorkoutSeriesContext'
import { useProfile } from '../context/ProfileContext'
import { ExerciseSessionEntry, getExerciseHistory, getProgressionSuggestion } from '../services/progressionService'
import { scoreWorkoutSafety, SafetyFlag } from '../services/safetyService'
import { ParsedWorkoutExercise, ProgressionSuggestion, ProgressionTrend, WorkoutItem, WorkoutSeries } from '../types'
import EditWorkoutModal from './EditWorkoutModal'

interface WorkoutDetailModalProps {
  workout: WorkoutItem
  onClose: () => void
  onStartSeries?: (series: WorkoutSeries) => void
}

export default function WorkoutDetailModal({ workout, onClose, onStartSeries }: WorkoutDetailModalProps) {
  const { toggleFavorite, deleteWorkout } = useWorkouts()
  const { logs } = useWorkoutLogs()
  const { getSeriesForWorkout } = useWorkoutSeries()
  const { profile } = useProfile()
  const [showEdit, setShowEdit] = useState(false)
  const workoutSeries = getSeriesForWorkout(workout.id)

  const safetyResult = useMemo(() => {
    if (!workout.exercises || workout.exercises.length === 0) return null
    const result = scoreWorkoutSafety(workout.exercises, profile)
    return result.flags.length > 0 ? result : null
  }, [workout.exercises, profile])

  const isPhoto = workout.sourceType === 'photo'
  const thumbnail = workout.imageUris?.[0]
  const sourceColor = SOURCE_COLORS[workout.sourceType]
  const sourceIcon = SOURCE_ICONS[workout.sourceType]
  const formattedDate = new Date(workout.dateAdded).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(workout.id)
  }, [workout.id, toggleFavorite])

  const handleOpenLink = useCallback(() => {
    Linking.openURL(workout.url)
  }, [workout.url])

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Workout', 'Are you sure you want to delete this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteWorkout(workout.id)
          onClose()
        },
      },
    ])
  }, [workout.id, deleteWorkout, onClose])

  const handleEditClose = useCallback(() => {
    setShowEdit(false)
  }, [])

  if (showEdit) {
    return <EditWorkoutModal workout={workout} onClose={handleEditClose} />
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} testID="close-button">
            <Ionicons name="close" size={24} color={COLORS.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Ionicons
              name={workout.isFavorite ? 'star' : 'star-outline'}
              size={24}
              color={workout.isFavorite ? '#FFD700' : COLORS.secondaryText}
            />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerCard}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.thumbnailHero} />
            ) : (
              <View style={[styles.sourceIconBox, { backgroundColor: sourceColor + '26' }]}>
                <Ionicons name={sourceIcon as never} size={32} color={sourceColor} />
              </View>
            )}
            <Text style={styles.title}>{workout.title}</Text>
            <Text style={styles.sourceMeta}>
              {SOURCE_LABELS[workout.sourceType]} · Added {formattedDate}
            </Text>
          </View>

          {!isPhoto && (
            <TouchableOpacity style={styles.openLinkButton} onPress={handleOpenLink} activeOpacity={0.8}>
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.openLinkText}>Open Link</Text>
            </TouchableOpacity>
          )}

          {workout.bodyParts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Target Muscles</Text>
              <View style={styles.chipsWrap}>
                {workout.bodyParts.map((part) => (
                  <View key={part} style={styles.chip}>
                    <Text style={styles.chipText}>{part}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!isPhoto && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Link</Text>
              <Text style={styles.urlText}>{workout.url}</Text>
            </View>
          )}

          {workout.exercises && workout.exercises.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              {workout.exercises.map((ex, i) => (
                <ExerciseRow key={i} exercise={ex} logs={logs} />
              ))}
            </View>
          )}

          {safetyResult && (
            <View style={styles.section} testID="safety-flags">
              <Text style={[styles.sectionTitle, styles.safetyTitle]}>Safety Notes</Text>
              {safetyResult.flags.map((flag, i) => (
                <SafetyFlagRow key={i} flag={flag} />
              ))}
            </View>
          )}

          {workout.notes.trim().length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{workout.notes}</Text>
            </View>
          )}

          {workoutSeries && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Series</Text>
              <Text style={styles.seriesName}>{workoutSeries.title}</Text>
              {onStartSeries && (
                <TouchableOpacity
                  style={styles.startSeriesButton}
                  onPress={() => onStartSeries(workoutSeries)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.startSeriesText}>Start Series</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.editButton} onPress={() => setShowEdit(true)} activeOpacity={0.8}>
              <Ionicons name="pencil-outline" size={18} color={COLORS.accent} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={18} color={COLORS.destructive} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

// --- SafetyFlagRow ---

function SafetyFlagRow({ flag }: { flag: SafetyFlag }) {
  const color = flag.severity === 'warning' ? '#FF9500' : COLORS.accent
  return (
    <View style={safetyStyles.flagRow}>
      <Ionicons
        name={flag.severity === 'warning' ? 'warning-outline' : 'information-circle-outline'}
        size={15}
        color={color}
        style={safetyStyles.flagIcon}
      />
      <View style={safetyStyles.flagContent}>
        <Text style={[safetyStyles.flagExercise, { color }]}>{flag.exerciseName}</Text>
        <Text style={safetyStyles.flagReason}>{flag.reason}</Text>
      </View>
    </View>
  )
}

const safetyStyles = StyleSheet.create({
  flagRow: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  flagIcon: { marginTop: 2, flexShrink: 0 },
  flagContent: { flex: 1, gap: 2 },
  flagExercise: { fontSize: 13, fontWeight: '600' },
  flagReason: { fontSize: 12, color: COLORS.secondaryText, lineHeight: 17 },
})

// --- ExerciseRow with progress history ---

const TREND_CONFIG: Record<ProgressionTrend, { label: string; color: string; icon: string }> = {
  new:        { label: 'New',        color: '#888',    icon: 'sparkles-outline' },
  improving:  { label: 'Improving',  color: '#4ade80', icon: 'trending-up' },
  plateau:    { label: 'Plateau',    color: '#facc15', icon: 'remove-outline' },
  regressing: { label: 'Regressing', color: '#f87171', icon: 'trending-down' },
}

function MiniBarChart({ history }: { history: ExerciseSessionEntry[] }) {
  const MAX_BARS = 6
  const recent = history.slice(-MAX_BARS)
  const values = recent.map(h => h.avgWeightKg ?? h.totalReps ?? 0)
  const maxVal = Math.max(...values, 1)
  const BAR_MAX_H = 32

  return (
    <View style={barStyles.container}>
      {recent.map((h, i) => {
        const height = Math.max(4, Math.round((values[i] / maxVal) * BAR_MAX_H))
        return (
          <View key={i} style={barStyles.barWrap}>
            <View style={[barStyles.bar, { height }]} />
          </View>
        )
      })}
    </View>
  )
}

const barStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 36, marginTop: 8 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: COLORS.accent, borderRadius: 2, opacity: 0.8 },
})

function ExerciseRow({ exercise, logs }: { exercise: ParsedWorkoutExercise; logs: import('../types').WorkoutLog[] }) {
  const history = useMemo(() => getExerciseHistory(exercise.name, logs), [exercise.name, logs])
  const suggestion: ProgressionSuggestion | null = useMemo(
    () => history.length > 0
      ? getProgressionSuggestion(exercise.name, logs, {
          goals: [], fitnessLevel: 'Intermediate', sensitiveAreas: [],
          equipment: [], preferredDuration: 60, preferredPlatforms: [], preferredWorkoutTypes: [],
        })
      : null,
    [exercise.name, logs, history.length]
  )

  const metaParts = [
    exercise.sets ? `${exercise.sets} sets` : null,
    exercise.reps ? `${exercise.reps} reps` : null,
    exercise.weight ?? null,
    exercise.duration ?? null,
  ].filter(Boolean)

  const trendCfg = suggestion ? TREND_CONFIG[suggestion.trend] : null
  const personalBest = history.length > 0
    ? (() => {
        const weights = history.map(h => h.avgWeightKg).filter((w): w is number => w !== null)
        const reps = history.map(h => h.totalReps).filter((r): r is number => r !== null)
        if (weights.length > 0) return `${Math.max(...weights)} kg`
        if (reps.length > 0) return `${Math.max(...reps)} reps`
        return null
      })()
    : null

  return (
    <View style={exStyles.container}>
      <View style={exStyles.topRow}>
        <View style={exStyles.nameBlock}>
          <Text style={exStyles.exerciseName}>{exercise.name}</Text>
          {metaParts.length > 0 && (
            <Text style={exStyles.exerciseMeta}>{metaParts.join(' · ')}</Text>
          )}
          {exercise.notes ? <Text style={exStyles.exerciseNotes}>{exercise.notes}</Text> : null}
        </View>
        {trendCfg && (
          <View style={[exStyles.trendBadge, { backgroundColor: trendCfg.color + '22' }]}>
            <Ionicons name={trendCfg.icon as never} size={12} color={trendCfg.color} />
            <Text style={[exStyles.trendLabel, { color: trendCfg.color }]}>{trendCfg.label}</Text>
          </View>
        )}
      </View>

      {history.length > 0 && (
        <View style={exStyles.historyBlock}>
          <View style={exStyles.statsRow}>
            <Text style={exStyles.statLabel}>{history.length} session{history.length !== 1 ? 's' : ''}</Text>
            {personalBest && (
              <Text style={exStyles.statLabel}>Personal best: <Text style={exStyles.statValue}>{personalBest}</Text></Text>
            )}
          </View>

          {history.length > 1 && <MiniBarChart history={history} />}

          {suggestion?.lastSessionSummary && (
            <Text style={exStyles.lastSession}>Last: {suggestion.lastSessionSummary}</Text>
          )}
          {suggestion?.suggestedWeightKg && (
            <Text style={exStyles.suggestion}>Next target: {suggestion.suggestedWeightKg} kg</Text>
          )}
          {suggestion?.suggestedReps && !suggestion.suggestedWeightKg && (
            <Text style={exStyles.suggestion}>Next target: {suggestion.suggestedReps} reps</Text>
          )}
        </View>
      )}
    </View>
  )
}

const exStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nameBlock: { flex: 1, marginRight: 8 },
  exerciseName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  exerciseMeta: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  exerciseNotes: { fontSize: 12, fontStyle: 'italic', color: COLORS.secondaryText, marginTop: 2 },
  trendBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  trendLabel: { fontSize: 11, fontWeight: '600' },
  historyBlock: { marginTop: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, color: COLORS.secondaryText },
  statValue: { fontWeight: '700', color: COLORS.text },
  lastSession: { fontSize: 12, color: COLORS.secondaryText, marginTop: 6 },
  suggestion: { fontSize: 12, color: COLORS.accent, marginTop: 2, fontWeight: '600' },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  headerCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  sourceIconBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailHero: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  exerciseRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  exerciseMeta: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  exerciseNotes: {
    fontSize: 13,
    color: COLORS.secondaryText,
    fontStyle: 'italic',
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  sourceMeta: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  openLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  openLinkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.secondaryBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  urlText: {
    fontSize: 14,
    color: COLORS.accent,
  },
  notesText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  safetyTitle: {
    color: '#FF9500',
  },
  seriesName: {
    fontSize: 15,
    color: COLORS.secondaryText,
    marginBottom: 8,
  },
  startSeriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
  },
  startSeriesText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 12,
    paddingVertical: 14,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.destructive + '1A',
    borderRadius: 12,
    paddingVertical: 14,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.destructive,
  },
})

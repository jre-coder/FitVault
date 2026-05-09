import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import { useProfile } from '../context/ProfileContext'
import { useWorkoutLogs } from '../context/WorkoutLogContext'
import { useWorkoutTimer } from '../hooks/useWorkoutTimer'
import SetRecordingModal from './SetRecordingModal'
import { getProgressionSuggestion } from '../services/progressionService'
import { detectPlateau, getGuidanceLevel } from '../services/adaptationService'
import { saveWorkoutLog } from '../services/workoutLogStorage'
import {
  ExecutionStep,
  LoggedSet,
  LoggedWorkout,
  Routine,
  WorkoutItem,
  WorkoutLog,
} from '../types'

type ExecutionPhase = 'exercise' | 'rest' | 'reference' | 'complete'

interface Props {
  visible: boolean
  routine: Routine
  workouts: WorkoutItem[]
  onClose: () => void
}

function buildExecutionQueue(routine: Routine, workouts: WorkoutItem[]): ExecutionStep[] {
  const sorted = [...routine.items].sort((a, b) => a.order - b.order)
  const workoutCount = sorted.length
  const steps: ExecutionStep[] = []

  sorted.forEach((item, workoutIndex) => {
    const workout = workouts.find(w => w.id === item.workoutItemId)
    if (!workout) return

    if (workout.exercises && workout.exercises.length > 0) {
      const exerciseCount = workout.exercises.length
      workout.exercises.forEach((exercise, exerciseIndex) => {
        steps.push({
          kind: 'exercise',
          workoutItemId: workout.id,
          workoutTitle: workout.title,
          workoutIndex,
          workoutCount,
          exerciseIndex,
          exerciseCount,
          exercise,
        })
      })
    } else {
      steps.push({
        kind: 'reference',
        workoutItemId: workout.id,
        workoutTitle: workout.title,
        workoutIndex,
        workoutCount,
        url: workout.url,
        sourceType: workout.sourceType,
      })
    }
  })

  return steps
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function WorkoutExecutionModal({ visible, routine, workouts, onClose }: Props) {
  const queue = useMemo(() => buildExecutionQueue(routine, workouts), [routine, workouts])

  const [phase, setPhase] = useState<ExecutionPhase>(() =>
    queue.length === 0 ? 'complete' : queue[0].kind === 'reference' ? 'reference' : 'exercise'
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [setsCompleted, setSetsCompleted] = useState(0)
  const [loggedWorkouts, setLoggedWorkouts] = useState<LoggedWorkout[]>([])
  const [weightInput, setWeightInput] = useState('')
  const [repsInput, setRepsInput] = useState('')
  const [showRecording, setShowRecording] = useState(false)
  const startedAt = useRef(new Date().toISOString())
  const totalSetsRef = useRef(0)

  const { logs } = useWorkoutLogs()
  const { profile } = useProfile()
  const timer = useWorkoutTimer()

  const currentStep = queue[stepIndex]
  const totalSets = currentStep?.exercise?.sets ?? 1

  const isLastStep = stepIndex === queue.length - 1
  const currentSetNumber = setsCompleted + 1

  const currentExerciseName = currentStep?.kind === 'exercise' ? (currentStep.exercise?.name ?? '') : ''

  const guidanceLevel = getGuidanceLevel(currentExerciseName, logs)
  const isOnPlateau = detectPlateau(currentExerciseName, logs)

  const [suggestion, setSuggestion] = useState<import('../types').ProgressionSuggestion | null>(null)

  // Recompute suggestion and pre-fill inputs whenever the exercise changes
  useEffect(() => {
    if (!currentExerciseName || !profile) return
    const s = getProgressionSuggestion(currentExerciseName, logs, profile)
    setSuggestion(s)
    setWeightInput(s.suggestedWeightKg != null ? String(s.suggestedWeightKg) : '')
    setRepsInput(s.suggestedReps ?? '')
  // profile and logs intentionally excluded — suggestion is per-exercise, not per-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseName])

  const finishWorkout = useCallback((finalLoggedWorkouts: LoggedWorkout[], finalSets: number) => {
    const completedAt = new Date().toISOString()
    const durationSeconds = Math.round(
      (new Date(completedAt).getTime() - new Date(startedAt.current).getTime()) / 1000
    )
    const log: WorkoutLog = {
      id: generateId(),
      routineId: routine.id,
      routineName: routine.name,
      startedAt: startedAt.current,
      completedAt,
      durationSeconds,
      workouts: finalLoggedWorkouts,
      totalSetsLogged: finalSets,
    }
    saveWorkoutLog(log)
    setPhase('complete')
  }, [routine])

  const advanceToStep = useCallback((nextIndex: number, currentLoggedWorkouts: LoggedWorkout[], currentTotalSets: number) => {
    if (nextIndex >= queue.length) {
      finishWorkout(currentLoggedWorkouts, currentTotalSets)
      return
    }
    const next = queue[nextIndex]
    setStepIndex(nextIndex)
    setSetsCompleted(0)
    if (next.kind === 'reference') {
      setPhase('reference')
      timer.resetStopwatch()
    } else {
      setPhase('exercise')
      timer.resetStopwatch()
      timer.startStopwatch()
    }
  }, [queue, finishWorkout, timer])

  // Register rest complete callback on each render so it captures fresh state
  useEffect(() => {
    timer.onRestComplete(() => {
      setLoggedWorkouts(lw => {
        setSetsCompleted(sc => {
          const nextSets = sc + 1
          const step = queue[stepIndex]
          const stepTotalSets = step?.exercise?.sets ?? 1
          const isLastSetDone = nextSets >= stepTotalSets

          if (isLastSetDone) {
            const nextStepIndex = stepIndex + 1
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            totalSetsRef.current = totalSetsRef.current // already updated in logSet
            advanceToStep(nextStepIndex, lw, totalSetsRef.current)
            return 0
          } else {
            setPhase('exercise')
            timer.resetStopwatch()
            timer.startStopwatch()
            return nextSets
          }
        })
        return lw
      })
    })
  }) // no dep array — re-register every render to capture fresh closure

  // Start stopwatch on initial mount for exercise phase
  useEffect(() => {
    if (phase === 'exercise') {
      timer.startStopwatch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  function appendLoggedSet(step: ExecutionStep, setNumber: number): LoggedWorkout[] {
    const parsedWeight = weightInput.trim() ? parseFloat(weightInput) : undefined
    const parsedReps = repsInput.trim() ? parseInt(repsInput, 10) : undefined
    const loggedSet: LoggedSet = {
      exerciseName: step.exercise?.name ?? '',
      setNumber,
      completedAt: new Date().toISOString(),
      repsCompleted: parsedReps && !isNaN(parsedReps) ? parsedReps : undefined,
      weightKg: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : undefined,
    }
    setLoggedWorkouts(prev => {
      const existing = prev.findIndex(lw => lw.workoutItemId === step.workoutItemId)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = {
          ...updated[existing],
          setsLogged: [...updated[existing].setsLogged, loggedSet],
        }
        return updated
      }
      return [...prev, {
        workoutItemId: step.workoutItemId,
        workoutTitle: step.workoutTitle,
        setsLogged: [loggedSet],
        skipped: false,
      }]
    })
    // Return a synchronous updated version for use in finish checks
    const existingIdx = loggedWorkouts.findIndex(lw => lw.workoutItemId === step.workoutItemId)
    if (existingIdx >= 0) {
      const updated = [...loggedWorkouts]
      updated[existingIdx] = {
        ...updated[existingIdx],
        setsLogged: [...updated[existingIdx].setsLogged, loggedSet],
      }
      return updated
    }
    return [...loggedWorkouts, {
      workoutItemId: step.workoutItemId,
      workoutTitle: step.workoutTitle,
      setsLogged: [loggedSet],
      skipped: false,
    }]
  }

  function handleLogSet() {
    if (!currentStep || currentStep.kind !== 'exercise') return
    const updatedLogs = appendLoggedSet(currentStep, currentSetNumber)
    const newTotalSets = totalSetsRef.current + 1
    totalSetsRef.current = newTotalSets

    const isLastSet = currentSetNumber >= totalSets
    const skipRest = isLastStep && isLastSet

    if (skipRest) {
      timer.pauseStopwatch()
      finishWorkout(updatedLogs, newTotalSets)
    } else {
      timer.pauseStopwatch()
      setPhase('rest')
      timer.startRest()
    }
  }

  function handleSkipRest() {
    timer.cancelRest()
    // Determine if we need to advance step or just next set
    const isLastSet = currentSetNumber >= totalSets
    if (isLastSet) {
      const nextStepIndex = stepIndex + 1
      advanceToStep(nextStepIndex, loggedWorkouts, totalSetsRef.current)
    } else {
      setSetsCompleted(s => s + 1)
      setPhase('exercise')
      timer.resetStopwatch()
      timer.startStopwatch()
    }
  }

  function handleSkipExercise() {
    advanceToStep(stepIndex + 1, loggedWorkouts, totalSetsRef.current)
  }

  function handleReferenceNext() {
    setLoggedWorkouts(prev => {
      if (currentStep && !prev.find(lw => lw.workoutItemId === currentStep.workoutItemId)) {
        return [...prev, {
          workoutItemId: currentStep.workoutItemId,
          workoutTitle: currentStep.workoutTitle,
          setsLogged: [],
          skipped: true,
        }]
      }
      return prev
    })
    if (isLastStep) {
      finishWorkout(loggedWorkouts, totalSetsRef.current)
    } else {
      advanceToStep(stepIndex + 1, loggedWorkouts, totalSetsRef.current)
    }
  }

  function handleClose() {
    timer.resetStopwatch()
    timer.cancelRest()
    onClose()
  }

  if (!currentStep && phase !== 'complete') return null

  // --- Exercise phase ---
  if (phase === 'exercise' && currentStep?.kind === 'exercise') {
    const ex = currentStep.exercise!
    const metaParts = [
      ex.sets ? `${ex.sets} sets` : null,
      ex.reps ? `${ex.reps} reps` : null,
      ex.weight ?? null,
      ex.duration ?? null,
    ].filter(Boolean)

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.secondaryText} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.routineName}>{routine.name}</Text>
              <Text style={styles.progress}>
                Exercise {(currentStep.exerciseIndex ?? 0) + 1} of {currentStep.exerciseCount ?? 1}
                {'  ·  '}
                Workout {currentStep.workoutIndex + 1} of {currentStep.workoutCount}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.exerciseName}>{ex.name}</Text>

            {metaParts.length > 0 && (
              <Text style={styles.exerciseMeta}>{metaParts.join(' · ')}</Text>
            )}

            {ex.notes && guidanceLevel === 'full' ? (
              <Text style={styles.exerciseNotes}>{ex.notes}</Text>
            ) : null}

            {isOnPlateau && (
              <View testID="plateau-nudge" style={styles.plateauNudge}>
                <Text style={styles.plateauNudgeText}>Try varying rep ranges or adding a deload to break through this plateau.</Text>
              </View>
            )}

            {suggestion?.lastSessionSummary && guidanceLevel !== 'minimal' && (
              <View style={styles.progressionCard}>
                <Text style={styles.progressionLabel}>Last session</Text>
                <Text style={styles.progressionSummary}>{suggestion.lastSessionSummary}</Text>
                {suggestion.rationale && guidanceLevel === 'full' ? (
                  <Text style={styles.progressionRationale}>{suggestion.rationale}</Text>
                ) : null}
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder={suggestion?.suggestedWeightKg != null ? String(suggestion.suggestedWeightKg) : '—'}
                  placeholderTextColor={COLORS.secondaryText}
                  keyboardType="decimal-pad"
                  testID="weight-input"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reps</Text>
                <TextInput
                  style={styles.input}
                  value={repsInput}
                  onChangeText={setRepsInput}
                  placeholder={ex.reps ?? (suggestion?.suggestedReps ?? '—')}
                  placeholderTextColor={COLORS.secondaryText}
                  keyboardType="number-pad"
                  testID="reps-input"
                />
              </View>
            </View>

            <View style={styles.setTracker}>
              <Text style={styles.setLabel}>Set {currentSetNumber} of {totalSets}</Text>
              <View style={styles.setDots}>
                {Array.from({ length: totalSets }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.setDot, i < setsCompleted && styles.setDotDone]}
                  >
                    {i < setsCompleted
                      ? <Ionicons name="checkmark" size={14} color="#fff" />
                      : <Text style={styles.setDotNum}>{i + 1}</Text>
                    }
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.timerBlock}>
              <Text style={styles.timerDisplay}>{formatSeconds(timer.stopwatchSeconds)}</Text>
              <View style={styles.timerControls}>
                <TouchableOpacity
                  style={styles.timerBtn}
                  onPress={timer.isStopwatchRunning ? timer.pauseStopwatch : timer.startStopwatch}
                >
                  <Ionicons
                    name={timer.isStopwatchRunning ? 'pause' : 'play'}
                    size={18}
                    color={COLORS.accent}
                  />
                  <Text style={styles.timerBtnText}>
                    {timer.isStopwatchRunning ? 'Pause' : 'Resume'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timerBtn} onPress={timer.resetStopwatch}>
                  <Ionicons name="refresh" size={18} color={COLORS.secondaryText} />
                  <Text style={[styles.timerBtnText, { color: COLORS.secondaryText }]}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipExercise} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recordBtn}
              onPress={() => setShowRecording(true)}
              activeOpacity={0.7}
              testID="record-set-btn"
            >
              <Ionicons name="videocam-outline" size={18} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logBtn} onPress={handleLogSet} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.logBtnText}>Log Set</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <SetRecordingModal
          embedded
          visible={showRecording}
          exerciseName={currentStep?.exercise?.name ?? ''}
          onClose={() => setShowRecording(false)}
          onContentSuggestion={(_suggestion) => setShowRecording(false)}
        />
      </Modal>
    )
  }

  // --- Rest phase ---
  if (phase === 'rest') {
    const nextStep = queue[stepIndex + 1] ?? null
    const nextName = nextStep?.kind === 'exercise'
      ? nextStep.exercise?.name
      : nextStep?.workoutTitle

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.secondaryText} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.routineName}>{routine.name}</Text>
            </View>
          </View>

          <View style={styles.restBody}>
            <Text style={styles.restLabel}>Rest</Text>
            <Text style={styles.restTimer}>{formatSeconds(timer.restSecondsRemaining)}</Text>
            {nextName && (
              <Text style={styles.restNext}>Next: {nextName}</Text>
            )}
            <TouchableOpacity style={styles.skipRestBtn} onPress={handleSkipRest} activeOpacity={0.8}>
              <Text style={styles.skipRestText}>Skip Rest</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    )
  }

  // --- Reference phase ---
  if (phase === 'reference' && currentStep?.kind === 'reference') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.secondaryText} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.routineName}>{routine.name}</Text>
              <Text style={styles.progress}>
                Workout {currentStep.workoutIndex + 1} of {currentStep.workoutCount}
              </Text>
            </View>
          </View>

          <View style={styles.referenceBody}>
            <Ionicons name="play-circle-outline" size={56} color={COLORS.accent} />
            <Text style={styles.referenceTitle}>{currentStep.workoutTitle}</Text>
            <Text style={styles.referenceHint}>No exercises logged for this item</Text>

            {currentStep.url ? (
              <TouchableOpacity
                style={styles.openLinkBtn}
                onPress={() => Linking.openURL(currentStep.url!)}
                activeOpacity={0.8}
              >
                <Ionicons name="open-outline" size={18} color={COLORS.accent} />
                <Text style={styles.openLinkText}>Open Link</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.logBtn} onPress={handleReferenceNext} activeOpacity={0.8}>
              <Text style={styles.logBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    )
  }

  // --- Complete phase ---
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.completeBody}>
          <Ionicons name="checkmark-circle" size={80} color={COLORS.accent} />
          <Text style={styles.completeTitle}>Workout Complete!</Text>
          <Text style={styles.completeMeta}>
            {totalSetsRef.current} {totalSetsRef.current === 1 ? 'set' : 'sets'} logged
          </Text>

          <TouchableOpacity style={styles.doneBtn} onPress={handleClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.separator,
  },
  closeBtn: { padding: 4, marginRight: 12 },
  headerCenter: { flex: 1 },
  routineName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  progress: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },

  body: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  exerciseName: { fontSize: 30, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  exerciseMeta: { fontSize: 16, color: COLORS.secondaryText, marginBottom: 6 },
  exerciseNotes: { fontSize: 14, fontStyle: 'italic', color: COLORS.secondaryText, marginBottom: 16 },

  setTracker: { marginTop: 24, marginBottom: 16 },
  setLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  setDots: { flexDirection: 'row', gap: 10 },
  setDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.secondaryBackground,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.separator,
  },
  setDotDone: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  setDotNum: { fontSize: 14, fontWeight: '600', color: COLORS.secondaryText },

  timerBlock: { marginTop: 8, alignItems: 'center' },
  timerDisplay: { fontSize: 56, fontWeight: '200', color: COLORS.text, letterSpacing: 2 },
  timerControls: { flexDirection: 'row', gap: 24, marginTop: 12 },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  timerBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.accent },

  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.separator,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.secondaryBackground,
    alignItems: 'center',
  },
  skipBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.secondaryText },
  logBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
  },
  logBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  recordBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },

  restBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  restLabel: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  restTimer: { fontSize: 72, fontWeight: '200', color: COLORS.accent, letterSpacing: 2 },
  restNext: { fontSize: 16, color: COLORS.secondaryText, marginTop: 8 },
  skipRestBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.secondaryBackground,
  },
  skipRestText: { fontSize: 16, fontWeight: '600', color: COLORS.secondaryText },

  referenceBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  referenceTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  referenceHint: { fontSize: 14, color: COLORS.secondaryText },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  openLinkText: { fontSize: 15, fontWeight: '600', color: COLORS.accent },

  completeBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  completeTitle: { fontSize: 32, fontWeight: '800', color: COLORS.text },
  completeMeta: { fontSize: 18, color: COLORS.secondaryText },
  doneBtn: {
    marginTop: 16,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
  },
  doneBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  plateauNudge: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  plateauNudgeText: { fontSize: 13, color: COLORS.secondaryText },

  progressionCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  progressionLabel: { fontSize: 11, color: COLORS.secondaryText, textTransform: 'uppercase', letterSpacing: 0.8 },
  progressionSummary: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  progressionRationale: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },

  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, color: COLORS.secondaryText, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.separator,
    textAlign: 'center',
  },
})

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
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
import { useSubscription } from '../context/SubscriptionContext'
import { useProfile } from '../context/ProfileContext'
import { COLORS } from '../constants'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { DiagnosisIssue, ExerciseSwap, ParsedWorkoutExercise, Routine, WorkoutAnalysis, WorkoutItem } from '../types'
import { analyzeWorkout, buildEphemeralExecution } from '../services/fixMyWorkoutService'

type Step = 'input' | 'loading' | 'results' | 'error'

const SEVERITY_COLORS: Record<DiagnosisIssue['severity'], string> = {
  error: '#FF3B30',
  warning: '#FF9500',
  info: COLORS.accent,
}

const SEVERITY_ICONS: Record<DiagnosisIssue['severity'], string> = {
  error: 'alert-circle',
  warning: 'warning-outline',
  info: 'information-circle-outline',
}

interface Props {
  visible: boolean
  onClose: () => void
  onRequestUpgrade: () => void
  onStartWorkout: (routine: Routine, workouts: WorkoutItem[]) => void
}

export default function FixMyWorkoutModal({ visible, onClose, onRequestUpgrade, onStartWorkout }: Props) {
  const { isPremium } = useSubscription()
  const { profile } = useProfile()
  const speech = useSpeechRecognition()

  const [step, setStep] = useState<Step>('input')
  const [description, setDescription] = useState('')
  const [analysis, setAnalysis] = useState<WorkoutAnalysis | null>(null)

  // Sync speech transcript → description when it arrives
  useEffect(() => {
    if (speech.transcript) setDescription(speech.transcript)
  }, [speech.transcript])

  useEffect(() => {
    if (!visible) {
      setStep('input')
      setDescription('')
      setAnalysis(null)
      speech.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  async function handleAnalyze() {
    if (!description.trim()) return
    setStep('loading')
    try {
      const result = await analyzeWorkout(description, profile)
      setAnalysis(result)
      setStep('results')
    } catch {
      setStep('error')
    }
  }

  function handleRetry() {
    setStep('input')
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>
              {step === 'results' ? 'Done' : 'Cancel'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fix My Workout</Text>
          <View style={{ width: 60 }} />
        </View>

        {step === 'input' && (
          <InputStep
            description={description}
            onChange={setDescription}
            onAnalyze={handleAnalyze}
            isListening={speech.isListening}
            partialTranscript={speech.partialTranscript}
            speechError={speech.error}
            onMicPress={() => speech.isListening ? speech.stop() : speech.start()}
          />
        )}

        {step === 'loading' && <LoadingStep />}

        {step === 'error' && <ErrorStep onRetry={handleRetry} />}

        {step === 'results' && analysis && (
          <ResultsStep
            analysis={analysis}
            isPremium={isPremium}
            onRequestUpgrade={onRequestUpgrade}
            onStartWorkout={(routine, workouts) => {
              onClose()
              onStartWorkout(routine, workouts)
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  )
}

function InputStep({
  description,
  onChange,
  onAnalyze,
  isListening,
  partialTranscript,
  speechError,
  onMicPress,
}: {
  description: string
  onChange: (text: string) => void
  onAnalyze: () => void
  isListening: boolean
  partialTranscript: string
  speechError: string | null
  onMicPress: () => void
}) {
  const canAnalyze = description.trim().length > 0
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.inputSubtitle}>
        Describe your workout — exercises, sets, reps, and any relevant context.
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={[styles.textInput, styles.textInputFlex]}
          multiline
          placeholder="Describe your workout here…"
          placeholderTextColor={COLORS.secondaryText}
          value={description}
          onChangeText={onChange}
          textAlignVertical="top"
          autoFocus
        />
        <TouchableOpacity
          style={[styles.micButton, isListening && styles.micButtonActive]}
          onPress={onMicPress}
          activeOpacity={0.7}
          testID="mic-button"
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={22}
            color={isListening ? '#fff' : COLORS.accent}
          />
        </TouchableOpacity>
      </View>

      {isListening && (
        <View style={styles.listeningRow}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.listeningText}>Listening…</Text>
        </View>
      )}
      {isListening && partialTranscript ? (
        <Text style={styles.partialTranscript}>{partialTranscript}</Text>
      ) : null}
      {speechError ? (
        <Text style={styles.speechError}>{speechError}</Text>
      ) : null}

      <View style={styles.exampleBox}>
        <Text style={styles.exampleLabel}>Example</Text>
        <Text style={styles.exampleText}>
          "Bench press 4x8, incline dumbbell press 3x10, cable crossover 3x12,
          tricep pushdown 3x12 — gym with full cable setup, intermediate lifter,
          goal is chest hypertrophy."
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.analyzeButton, !canAnalyze && styles.analyzeButtonDisabled]}
        onPress={canAnalyze ? onAnalyze : undefined}
        activeOpacity={canAnalyze ? 0.8 : 1}
      >
        <Ionicons name="sparkles" size={18} color="#fff" />
        <Text style={styles.analyzeButtonText}>Analyze</Text>
      </TouchableOpacity>
    </View>
  )
}

function LoadingStep() {
  return (
    <View style={styles.centeredStep}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.loadingText}>Analyzing your workout…</Text>
      <Text style={styles.loadingSubtext}>Checking balance, volume, and injury risk</Text>
    </View>
  )
}

function ErrorStep({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centeredStep}>
      <Ionicons name="cloud-offline-outline" size={48} color={COLORS.secondaryText} />
      <Text style={styles.errorTitle}>Couldn't analyze your workout</Text>
      <Text style={styles.errorSubtext}>Check your connection and try again.</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )
}

function ResultsStep({
  analysis,
  isPremium,
  onRequestUpgrade,
  onStartWorkout,
}: {
  analysis: WorkoutAnalysis
  isPremium: boolean
  onRequestUpgrade: () => void
  onStartWorkout: (routine: Routine, workouts: WorkoutItem[]) => void
}) {
  const issueCount = analysis.issues.length
  return (
    <ScrollView
      style={styles.resultsScroll}
      contentContainerStyle={styles.resultsContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Workout summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="barbell-outline" size={16} color={COLORS.secondaryText} />
          <Text style={styles.summaryText}>
            {analysis.parsedExercises.length} exercises detected
          </Text>
          <View style={styles.summaryDot} />
          <Ionicons name="time-outline" size={16} color={COLORS.secondaryText} />
          <Text style={styles.summaryText}>{analysis.estimatedDurationMinutes} min</Text>
        </View>
        <View style={styles.muscleChips}>
          {analysis.muscleGroups.map(m => (
            <View key={m} style={styles.muscleChip}>
              <Text style={styles.muscleChipText}>{m}</Text>
            </View>
          ))}
        </View>
        <View style={styles.parsedList}>
          {analysis.parsedExercises.map((ex, i) => (
            <ExerciseRow key={i} exercise={ex} />
          ))}
        </View>
      </View>

      {/* Issues */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {issueCount === 0
            ? 'No issues found'
            : `${issueCount} issue${issueCount !== 1 ? 's' : ''} found`}
        </Text>
        {issueCount === 0 ? (
          <View style={styles.noIssuesCard}>
            <Ionicons name="checkmark-circle" size={28} color="#34C759" />
            <Text style={styles.noIssuesText}>
              Your workout looks solid. No structural problems detected.
            </Text>
          </View>
        ) : (
          analysis.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)
        )}
      </View>

      {/* Optimized plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Optimized Plan</Text>
        {isPremium ? (
          <PremiumPlan analysis={analysis} onStartWorkout={onStartWorkout} />
        ) : (
          <LockedPlan onRequestUpgrade={onRequestUpgrade} issueCount={issueCount} />
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  )
}

function ExerciseRow({ exercise }: { exercise: ParsedWorkoutExercise }) {
  const detail = [
    exercise.sets && exercise.reps ? `${exercise.sets}×${exercise.reps}` : null,
    exercise.weight ?? null,
    exercise.duration ?? null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <View style={styles.exerciseRow}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      {detail ? <Text style={styles.exerciseDetail}>{detail}</Text> : null}
    </View>
  )
}

function IssueCard({ issue }: { issue: DiagnosisIssue }) {
  const color = SEVERITY_COLORS[issue.severity]
  const icon = SEVERITY_ICONS[issue.severity]
  return (
    <View style={[styles.issueCard, { borderLeftColor: color }]}>
      <View style={styles.issueHeader}>
        <Ionicons name={icon as never} size={16} color={color} />
        <Text style={[styles.issueTitle, { color }]}>{issue.title}</Text>
      </View>
      <Text style={styles.issueDescription}>{issue.description}</Text>
    </View>
  )
}

function PremiumPlan({
  analysis,
  onStartWorkout,
}: {
  analysis: WorkoutAnalysis
  onStartWorkout: (routine: Routine, workouts: WorkoutItem[]) => void
}) {
  function handleStart() {
    const { routine, workouts } = buildEphemeralExecution(analysis)
    onStartWorkout(routine, workouts)
  }

  return (
    <View>
      {analysis.swaps.length > 0 && (
        <View style={styles.swapsSection}>
          <Text style={styles.swapsSectionLabel}>Changes made</Text>
          {analysis.swaps.map((swap, i) => <SwapRow key={i} swap={swap} />)}
        </View>
      )}

      <View style={styles.optimizedList}>
        {analysis.optimizedExercises.map((ex, i) => (
          <ExerciseRow key={i} exercise={ex} />
        ))}
      </View>

      {analysis.coachNotes ? (
        <View style={styles.coachNotesCard}>
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.accent} />
          <Text style={styles.coachNotesText}>{analysis.coachNotes}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
        <Ionicons name="play-circle" size={20} color="#fff" />
        <Text style={styles.startButtonText}>Start this workout</Text>
      </TouchableOpacity>
    </View>
  )
}

function SwapRow({ swap }: { swap: ExerciseSwap }) {
  const vs = swap.videoSuggestion
  return (
    <View style={styles.swapRow}>
      <Text style={styles.swapOriginal}>{swap.original}</Text>
      <Ionicons name="arrow-forward" size={14} color={COLORS.accent} />
      <Text style={styles.swapReplacement}>{swap.replacement}</Text>
      <Text style={styles.swapReason}>{swap.reason}</Text>
      {vs && (
        <TouchableOpacity
          testID="swap-video-link"
          style={styles.videoLink}
          onPress={() => Linking.openURL(vs.url)}
          activeOpacity={0.7}
        >
          <Ionicons name="play-circle-outline" size={14} color={COLORS.accent} />
          <Text style={styles.videoLinkText}>{vs.creator}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function LockedPlan({
  onRequestUpgrade,
  issueCount,
}: {
  onRequestUpgrade: () => void
  issueCount: number
}) {
  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedIconRow}>
        <View style={styles.lockedIconCircle}>
          <Ionicons name="sparkles" size={32} color={COLORS.accent} />
        </View>
        <View style={styles.lockedBadge}>
          <Ionicons name="lock-closed" size={12} color="#fff" />
        </View>
      </View>
      <Text style={styles.lockedTitle}>
        {issueCount > 0
          ? `${issueCount} fix${issueCount !== 1 ? 'es' : ''} ready`
          : 'Optimized plan ready'}
      </Text>
      <Text style={styles.lockedSubtext}>
        Unlock your corrected workout plan, exercise swaps with reasoning, and coach notes.
      </Text>
      <TouchableOpacity style={styles.unlockButton} onPress={onRequestUpgrade} activeOpacity={0.8}>
        <Text style={styles.unlockButtonText}>Unlock with Premium</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.separator,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  cancelText: { fontSize: 17, color: COLORS.secondaryText, minWidth: 60 },

  // Input step
  stepContainer: { flex: 1, padding: 16, gap: 16 },
  inputSubtitle: { fontSize: 14, color: COLORS.secondaryText, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 140,
    maxHeight: 260,
  },
  textInputFlex: { flex: 1 },
  micButton: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  micButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  listeningRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listeningText: { fontSize: 14, color: COLORS.accent, fontWeight: '600' },
  partialTranscript: { fontSize: 14, color: COLORS.secondaryText, fontStyle: 'italic' },
  speechError: { fontSize: 13, color: '#FF3B30' },
  exampleBox: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  exampleLabel: { fontSize: 11, fontWeight: '700', color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  exampleText: { fontSize: 13, color: COLORS.secondaryText, lineHeight: 18, fontStyle: 'italic' },
  analyzeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeButtonDisabled: { backgroundColor: COLORS.separator },
  analyzeButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Loading / error steps
  centeredStep: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  loadingText: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  loadingSubtext: { fontSize: 14, color: COLORS.secondaryText, textAlign: 'center' },
  errorTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  errorSubtext: { fontSize: 14, color: COLORS.secondaryText, textAlign: 'center' },
  retryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Results step
  resultsScroll: { flex: 1 },
  resultsContent: { padding: 16, gap: 24 },

  summaryCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: 13, color: COLORS.secondaryText },
  summaryDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.separator },
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  muscleChip: {
    backgroundColor: COLORS.accent + '1A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  muscleChipText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  parsedList: { gap: 4 },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.separator,
  },
  exerciseName: { fontSize: 14, fontWeight: '500', color: COLORS.text, flex: 1 },
  exerciseDetail: { fontSize: 13, color: COLORS.secondaryText },

  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  noIssuesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#34C75910',
    borderRadius: 12,
    padding: 14,
  },
  noIssuesText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },

  issueCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderLeftWidth: 3,
  },
  issueHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  issueTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  issueDescription: { fontSize: 13, color: COLORS.secondaryText, lineHeight: 18 },

  // Premium plan
  swapsSection: { gap: 8, marginBottom: 14 },
  swapsSectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5 },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    padding: 10,
  },
  swapOriginal: { fontSize: 13, color: COLORS.secondaryText, textDecorationLine: 'line-through' },
  swapReplacement: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  swapReason: { fontSize: 12, color: COLORS.secondaryText, width: '100%', marginTop: 2 },
  videoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  videoLinkText: { fontSize: 12, color: COLORS.accent, fontWeight: '500' },
  optimizedList: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 12,
    padding: 12,
    gap: 0,
  },
  coachNotesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.accent + '0D',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  coachNotesText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19, fontStyle: 'italic' },
  startButton: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Locked plan
  lockedCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  lockedIconRow: { position: 'relative', marginBottom: 4 },
  lockedIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  lockedTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  lockedSubtext: { fontSize: 14, color: COLORS.secondaryText, textAlign: 'center', lineHeight: 20 },
  unlockButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 4,
  },
  unlockButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useSubscription } from '../context/SubscriptionContext'
import { useProfile } from '../context/ProfileContext'
import { identifyMachine, buildMachineEphemeralExecution } from '../services/machineIdentificationService'
import { MachineIdentificationResult, Routine, WorkoutItem } from '../types'
import { COLORS } from '../constants'

type Step = 'camera' | 'loading' | 'result' | 'error'

interface Props {
  visible: boolean
  onClose: () => void
  onRequestUpgrade: () => void
  onStartWorkout: (routine: Routine, workouts: WorkoutItem[]) => void
}

export default function MachineScanModal({ visible, onClose, onRequestUpgrade, onStartWorkout }: Props) {
  const { isPremium } = useSubscription()
  const { profile } = useProfile()

  const [step, setStep] = useState<Step>('camera')
  const [result, setResult] = useState<MachineIdentificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      setStep('camera')
      setResult(null)
      setError(null)
    }
  }, [visible])

  async function processBase64(base64: string) {
    setStep('loading')
    setError(null)
    try {
      const identified = await identifyMachine(base64, profile ?? undefined)
      setResult(identified)
      setStep('result')
    } catch {
      setError("Couldn't identify the machine. Ensure it's clear and well-lit.")
      setStep('error')
    }
  }

  async function handleCamera() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync()
    if (!granted) return
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    })
    if (!picked.canceled && picked.assets[0].base64) {
      await processBase64(picked.assets[0].base64)
    }
  }

  async function handleLibrary() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!granted) return
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    })
    if (!picked.canceled && picked.assets[0].base64) {
      await processBase64(picked.assets[0].base64)
    }
  }

  function handleStart() {
    if (!result) return
    const { routine, workouts } = buildMachineEphemeralExecution(result)
    onStartWorkout(routine, workouts)
    onClose()
  }

  function handleScanAgain() {
    setStep('camera')
    setResult(null)
    setError(null)
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Machine</Text>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {!isPremium ? (
            <LockedView onRequestUpgrade={onRequestUpgrade} />
          ) : step === 'camera' ? (
            <CameraStep onCamera={handleCamera} onLibrary={handleLibrary} />
          ) : step === 'loading' ? (
            <LoadingStep />
          ) : step === 'result' && result ? (
            <ResultStep
              result={result}
              onStart={handleStart}
              onScanAgain={handleScanAgain}
            />
          ) : (
            <ErrorStep message={error} onTryAgain={handleScanAgain} />
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

function LockedView({ onRequestUpgrade }: { onRequestUpgrade: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.lockIcon}>🔒</Text>
      <Text style={styles.lockedTitle}>Premium Feature</Text>
      <Text style={styles.lockedBody}>
        Identify any gym machine and get instant exercise suggestions with step-by-step guidance.
      </Text>
      <Pressable style={styles.primaryBtn} onPress={onRequestUpgrade}>
        <Text style={styles.primaryBtnText}>Unlock with Premium</Text>
      </Pressable>
    </View>
  )
}

function CameraStep({ onCamera, onLibrary }: { onCamera: () => void; onLibrary: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.instruction}>Point your camera at a gym machine to identify it and get exercise suggestions.</Text>
      <Pressable style={styles.primaryBtn} onPress={onCamera}>
        <Text style={styles.primaryBtnText}>Take a Photo</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={onLibrary}>
        <Text style={styles.secondaryBtnText}>Choose from Library</Text>
      </Pressable>
    </View>
  )
}

function LoadingStep() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={COLORS.primary ?? '#007AFF'} />
      <Text style={styles.loadingText}>Identifying machine…</Text>
    </View>
  )
}

function ResultStep({
  result,
  onStart,
  onScanAgain,
}: {
  result: MachineIdentificationResult
  onStart: () => void
  onScanAgain: () => void
}) {
  if (!result.recognized) {
    return (
      <View style={styles.centered}>
        <Text style={styles.unrecognizedText}>Couldn't identify this machine. Try a clearer photo or a different angle.</Text>
        <Pressable style={styles.secondaryBtn} onPress={onScanAgain}>
          <Text style={styles.secondaryBtnText}>Scan Again</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View>
      <Text style={styles.machineName}>{result.machineName}</Text>

      {result.bodyParts.length > 0 && (
        <View style={styles.chipRow}>
          {result.bodyParts.map(bp => (
            <View key={bp} style={styles.chip}>
              <Text style={styles.chipText}>{bp}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionLabel}>Suggested Exercises</Text>
      {result.exercises.map((ex, i) => (
        <View key={i} style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
          {(ex.sets != null || ex.reps != null) && (
            <Text style={styles.exerciseMeta}>
              {[ex.sets ? `${ex.sets} sets` : null, ex.reps ? `× ${ex.reps}` : null]
                .filter(Boolean)
                .join(' ')}
            </Text>
          )}
        </View>
      ))}

      {result.notes ? <Text style={styles.notes}>{result.notes}</Text> : null}

      <Pressable style={styles.primaryBtn} onPress={onStart}>
        <Text style={styles.primaryBtnText}>Start Workout</Text>
      </Pressable>
      <Pressable style={styles.secondaryBtn} onPress={onScanAgain}>
        <Text style={styles.secondaryBtnText}>Scan Again</Text>
      </Pressable>
    </View>
  )
}

function ErrorStep({ message, onTryAgain }: { message: string | null; onTryAgain: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{message ?? "Couldn't identify the machine."}</Text>
      <Pressable style={styles.primaryBtn} onPress={onTryAgain}>
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  title: { fontSize: 18, fontWeight: '700' },
  cancelBtn: { padding: 4 },
  cancelText: { color: '#007AFF', fontSize: 16 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { alignItems: 'center', gap: 16, paddingTop: 24 },
  lockIcon: { fontSize: 40 },
  lockedTitle: { fontSize: 20, fontWeight: '700' },
  lockedBody: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  instruction: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  loadingText: { fontSize: 16, color: '#555', marginTop: 12 },
  machineName: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  exerciseRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  exerciseName: { fontSize: 16, fontWeight: '500' },
  exerciseMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  notes: { fontSize: 13, color: '#666', marginTop: 12, fontStyle: 'italic' },
  unrecognizedText: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  errorText: { fontSize: 15, color: '#D00', textAlign: 'center', lineHeight: 22 },
  primaryBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: { color: '#333', fontSize: 16, fontWeight: '600' },
})

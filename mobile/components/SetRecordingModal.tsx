import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { analyzeSet, SetAnalysisResult } from '../services/setAnalysisService'
import { useVideoRecording } from '../hooks/useVideoRecording'
import { COLORS } from '../constants'

type Step = 'consent' | 'recording' | 'processing' | 'results' | 'error'

interface Props {
  visible: boolean
  exerciseName: string
  onClose: () => void
  onContentSuggestion: (suggestion: string) => void
  /** When true, renders as an absoluteFill View instead of a Modal (for use inside another Modal). */
  embedded?: boolean
}

export default function SetRecordingModal({ visible, exerciseName, onClose, onContentSuggestion, embedded = false }: Props) {
  const [permission] = useCameraPermissions()
  const [step, setStep] = useState<Step>('consent')
  const [result, setResult] = useState<SetAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { cameraRef, start, stop } = useVideoRecording()

  useEffect(() => {
    if (!visible) {
      setStep('consent')
      setResult(null)
      setError(null)
    }
  }, [visible])

  function handleStartRecording() {
    setStep('recording')
    start()
  }

  async function handleStopRecording() {
    setStep('processing')
    try {
      const uri = await stop()
      const analysis = await analyzeSet(uri, exerciseName)
      setResult(analysis)
      setStep('results')
    } catch {
      setError("Something went wrong during analysis.")
      setStep('error')
    }
  }

  const inner = (
    <View style={styles.container}>
      {step === 'consent' ? (
          <ConsentStep
            exerciseName={exerciseName}
            hasPermission={permission?.granted ?? false}
            onStart={handleStartRecording}
            onSkip={onClose}
          />
        ) : step === 'recording' ? (
          <RecordingStep cameraRef={cameraRef} onStop={handleStopRecording} />
        ) : step === 'processing' ? (
          <ProcessingStep />
        ) : step === 'results' && result ? (
          <ResultsStep
            result={result}
            onDone={onClose}
            onContentSuggestion={(s) => { onContentSuggestion(s); onClose() }}
          />
        ) : (
          <ErrorStep message={error} onTryAgain={() => setStep('consent')} />
        )}
    </View>
  )

  if (!visible) return null

  if (embedded) {
    return <View style={StyleSheet.absoluteFillObject}>{inner}</View>
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {inner}
    </Modal>
  )
}

function ConsentStep({
  exerciseName,
  hasPermission,
  onStart,
  onSkip,
}: {
  exerciseName: string
  hasPermission: boolean
  onStart: () => void
  onSkip: () => void
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Record: {exerciseName}</Text>

      {!hasPermission ? (
        <>
          <Text style={styles.body}>Camera permission is required to record your set.</Text>
          <Pressable style={styles.secondaryBtn} onPress={onSkip}>
            <Text style={styles.secondaryBtnText}>Skip</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.body}>
            FitVault will record this set to count reps and measure tempo. Video is analyzed on-device and never stored or uploaded to any server.
          </Text>
          <Text style={styles.privacyNote}>🔒 Stays on your phone. Never uploaded.</Text>
          <Pressable style={styles.primaryBtn} onPress={onStart}>
            <Text style={styles.primaryBtnText}>Start Recording</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

function RecordingStep({
  cameraRef,
  onStop,
}: {
  cameraRef: React.RefObject<CameraView>
  onStop: () => void
}) {
  return (
    <View style={styles.recordingContainer}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" mode="video" />
      <View style={styles.recordingOverlay}>
        <View style={styles.recordingBadge}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording…</Text>
        </View>
        <Pressable style={styles.stopBtn} onPress={onStop}>
          <Text style={styles.stopBtnText}>Stop Recording</Text>
        </Pressable>
      </View>
    </View>
  )
}

function ProcessingStep() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={COLORS.primary ?? '#007AFF'} />
      <Text style={styles.body}>Analyzing on-device…</Text>
    </View>
  )
}

function ResultsStep({
  result,
  onDone,
  onContentSuggestion,
}: {
  result: SetAnalysisResult
  onDone: () => void
  onContentSuggestion: (s: string) => void
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Set Complete</Text>
      <Text style={styles.summary}>{result.summary}</Text>

      {result.guidance && (
        <View style={styles.guidanceCard}>
          <Text style={styles.guidanceText}>{result.guidance}</Text>
          {result.contentSuggestion && (
            <Pressable
              style={styles.suggestionBtn}
              onPress={() => onContentSuggestion(result.contentSuggestion!)}
            >
              <Text style={styles.suggestionBtnText}>Explore {result.contentSuggestion}</Text>
            </Pressable>
          )}
        </View>
      )}

      <Pressable style={styles.primaryBtn} onPress={onDone}>
        <Text style={styles.primaryBtnText}>Done</Text>
      </Pressable>
    </View>
  )
}

function ErrorStep({ message, onTryAgain }: { message: string | null; onTryAgain: () => void }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{message ?? 'Something went wrong.'}</Text>
      <Pressable style={styles.primaryBtn} onPress={onTryAgain}>
        <Text style={styles.primaryBtnText}>Try Again</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
  privacyNote: { fontSize: 13, color: '#555', textAlign: 'center' },
  summary: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  primaryBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
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
  skipBtn: { paddingVertical: 8 },
  skipText: { color: '#888', fontSize: 15 },
  recordingContainer: { flex: 1 },
  camera: { flex: 1 },
  recordingOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
  recordingText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  stopBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  guidanceCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    width: '100%',
  },
  guidanceText: { fontSize: 14, color: '#555', lineHeight: 20 },
  suggestionBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  suggestionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  errorText: { fontSize: 15, color: '#D00', textAlign: 'center', lineHeight: 22 },
})

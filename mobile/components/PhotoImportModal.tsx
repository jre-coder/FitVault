import React, { useState } from 'react'
import {
  Image,
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useSubscription } from '../context/SubscriptionContext'
import { analyzeWorkoutPhotos } from '../services/photoAnalysisService'
import { Exercise, PhotoAnalysisResult, WorkoutItem, BodyPart } from '../types'
import { BODY_PARTS, COLORS } from '../constants'
import PaywallModal from './PaywallModal'

type Step = 'pick' | 'analyzing' | 'form'

interface Props {
  visible: boolean
  onClose: () => void
  onSave: (workout: Omit<WorkoutItem, 'id' | 'dateAdded' | 'isFavorite'>) => void
}

export default function PhotoImportModal({ visible, onClose, onSave }: Props) {
  const { isPremium } = useSubscription()
  const [step, setStep] = useState<Step>('pick')
  const [imageUris, setImageUris] = useState<string[]>([])
  const [pendingBase64, setPendingBase64] = useState<string[]>([])
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedBodyParts, setSelectedBodyParts] = useState<BodyPart[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])

  function reset() {
    setStep('pick')
    setImageUris([])
    setPendingBase64([])
    setPrimaryIndex(0)
    setAnalysisError(null)
    setTitle('')
    setNotes('')
    setSelectedBodyParts([])
    setExercises([])
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function pickImages() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!granted) {
      Alert.alert('Permission required', 'Please allow photo library access in Settings.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      base64: true,
      quality: 0.7,
    })
    if (result.canceled || !result.assets.length) return
    await handleImages(result.assets)
  }

  async function takePhotos() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync()
    if (!granted) {
      Alert.alert('Permission required', 'Please allow camera access in Settings.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    })
    if (result.canceled || !result.assets.length) return
    await handleImages(result.assets)
  }

  async function runAnalysis(base64Images: string[]) {
    setStep('analyzing')
    setAnalysisError(null)
    try {
      const result: PhotoAnalysisResult = await analyzeWorkoutPhotos(base64Images)
      setTitle(result.title)
      setNotes(result.notes ?? '')
      setSelectedBodyParts(result.bodyParts ?? [])
      setExercises(result.exercises ?? [])
    } catch (err) {
      console.error('[PhotoImport] analysis failed:', err)
      setAnalysisError("Couldn't analyze your photos. You can fill in the details manually.")
    } finally {
      setStep('form')
    }
  }

  async function handleImages(assets: ImagePicker.ImagePickerAsset[]) {
    const uris = assets.map(a => a.uri)
    const base64 = assets.map(a => a.base64 ?? '').filter(Boolean)
    setImageUris(uris)
    setPendingBase64(base64)

    if (!isPremium) {
      setStep('form')
      return
    }

    await runAnalysis(base64)
  }

  function toggleBodyPart(bp: BodyPart) {
    setSelectedBodyParts(prev =>
      prev.includes(bp) ? prev.filter(p => p !== bp) : [...prev, bp]
    )
  }

  function handleSave() {
    // Put the selected thumbnail first
    const orderedUris =
      primaryIndex === 0
        ? imageUris
        : [imageUris[primaryIndex], ...imageUris.filter((_, i) => i !== primaryIndex)]
    onSave({
      title: title.trim() || 'Photo Workout',
      url: '',
      sourceType: 'photo',
      bodyParts: selectedBodyParts,
      notes,
      exercises,
      imageUris: orderedUris,
    })
    reset()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import from Photos</Text>
          {step === 'form' ? (
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveHeaderText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {step === 'pick' && (
          <View style={styles.pickContainer}>
            <Text style={styles.pickHint}>
              Select photos of a workout plan, whiteboard, or exercise sheet
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={pickImages}>
              <Text style={styles.primaryButtonText}>Choose Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={takePhotos}>
              <Text style={styles.secondaryButtonText}>Take Photos</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'analyzing' && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.analyzingText}>Analyzing your photos…</Text>
          </View>
        )}

        {step === 'form' && (
          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            {!isPremium && (
              <View style={styles.upgradeBanner}>
                <Text style={styles.upgradeText}>
                  Upgrade to Premium to auto-extract exercises with AI
                </Text>
                <TouchableOpacity onPress={() => setShowPaywall(true)}>
                  <Text style={styles.upgradeLink}>Upgrade →</Text>
                </TouchableOpacity>
              </View>
            )}

            {analysisError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{analysisError}</Text>
              </View>
            )}

            {imageUris.length > 0 && (
              <>
                <Text style={styles.label}>
                  {imageUris.length > 1 ? 'Photos · Tap to set thumbnail' : 'Photo'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                  {imageUris.map((uri, i) => (
                    <TouchableOpacity key={uri} onPress={() => setPrimaryIndex(i)} activeOpacity={0.8}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                      {i === primaryIndex && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Workout title"
              placeholderTextColor={COLORS.secondaryText}
            />

            <Text style={styles.label}>Body Parts</Text>
            <View style={styles.chips}>
              {BODY_PARTS.map(bp => (
                <TouchableOpacity
                  key={bp}
                  style={[styles.chip, selectedBodyParts.includes(bp) && styles.chipSelected]}
                  onPress={() => toggleBodyPart(bp)}
                >
                  <Text style={[styles.chipText, selectedBodyParts.includes(bp) && styles.chipTextSelected]}>
                    {bp}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {exercises.length > 0 && (
              <>
                <Text style={styles.label}>Exercises</Text>
                {exercises.map((ex, i) => (
                  <View key={i} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {[
                        ex.sets ? `${ex.sets} sets` : null,
                        ex.reps ? `${ex.reps} reps` : null,
                        ex.weight ?? null,
                        ex.duration ?? null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes…"
              placeholderTextColor={COLORS.secondaryText}
              multiline
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Workout</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
      <PaywallModal
        visible={showPaywall}
        onClose={() => {
          setShowPaywall(false)
          // If they just upgraded and have photos waiting, run AI analysis now
          if (isPremium && pendingBase64.length > 0 && step === 'form') {
            runAnalysis(pendingBase64)
          }
        }}
      />
    </Modal>
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
  headerTitle: { fontSize: 17, fontWeight: '600' },
  cancelText: { fontSize: 17, color: COLORS.accent },
  saveHeaderText: { fontSize: 17, fontWeight: '600', color: COLORS.accent },
  pickContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  pickHint: { fontSize: 15, color: COLORS.secondaryText, textAlign: 'center', marginBottom: 32 },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: { color: COLORS.accent, fontSize: 17, fontWeight: '600' },
  analyzingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  analyzingText: { fontSize: 16, color: COLORS.secondaryText },
  form: { flex: 1, padding: 16 },
  upgradeBanner: {
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeText: { fontSize: 13, color: '#7D5A00', flex: 1, marginRight: 8 },
  upgradeLink: { fontSize: 13, color: COLORS.accent, fontWeight: '600' },
  errorBanner: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: COLORS.destructive },
  photoStrip: { marginBottom: 8 },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    right: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '500', color: COLORS.secondaryText, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 0.5,
    borderColor: COLORS.separator,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryBackground,
  },
  chipSelected: { backgroundColor: COLORS.accent },
  chipText: { fontSize: 14, color: COLORS.text },
  chipTextSelected: { color: '#fff' },
  exerciseRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.separator,
  },
  exerciseName: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  exerciseMeta: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
})

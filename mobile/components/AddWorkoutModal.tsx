import React, { useCallback, useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { BODY_PARTS, COLORS, SOURCE_LABELS, SOURCE_TYPES } from '../constants'
import { useWorkouts } from '../context/WorkoutContext'
import { BodyPart, SourceType } from '../types'

interface AddWorkoutModalProps {
  visible: boolean
  onClose: () => void
  initialURL?: string
}

function detectSource(url: string): SourceType {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.startsWith('http')) return 'website'
  return 'other'
}

export default function AddWorkoutModal({ visible, onClose, initialURL }: AddWorkoutModalProps) {
  const { addWorkout } = useWorkouts()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('youtube')
  const [selectedBodyParts, setSelectedBodyParts] = useState<BodyPart[]>([])
  const [notes, setNotes] = useState('')
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    if (visible) {
      if (initialURL) {
        setUrl(initialURL)
        setSourceType(detectSource(initialURL))
      } else {
        Clipboard.getStringAsync().then((text) => {
          if (text.startsWith('http') && !url) {
            setUrl(text)
            setSourceType(detectSource(text))
          }
        })
      }
    }
  }, [visible])

  const handleUrlChange = useCallback((text: string) => {
    setUrl(text)
    setUrlError('')
    if (text.startsWith('http')) {
      setSourceType(detectSource(text))
    }
  }, [])

  const handleSourceSelect = useCallback((s: SourceType) => {
    setSourceType(s)
  }, [])

  const toggleBodyPart = useCallback((part: BodyPart) => {
    setSelectedBodyParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part],
    )
  }, [])

  const handleSave = useCallback(() => {
    if (!url.startsWith('http')) {
      setUrlError('URL must start with http:// or https://')
      return
    }
    addWorkout({
      title: title.trim(),
      url: url.trim(),
      sourceType,
      bodyParts: selectedBodyParts,
      notes: notes.trim(),
      isFavorite: false,
    })
    setTitle('')
    setUrl('')
    setSourceType('youtube')
    setSelectedBodyParts([])
    setNotes('')
    setUrlError('')
    onClose()
  }, [title, url, sourceType, selectedBodyParts, notes, addWorkout, onClose])

  const handleClose = useCallback(() => {
    setTitle('')
    setUrl('')
    setSourceType('youtube')
    setSelectedBodyParts([])
    setNotes('')
    setUrlError('')
    onClose()
  }, [onClose])

  const isSaveDisabled = !title.trim() || !url.trim()

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Workout</Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaveDisabled}>
              <Text style={[styles.saveText, isSaveDisabled && styles.saveTextDisabled]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Workout title"
                placeholderTextColor={COLORS.secondaryText}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>URL</Text>
              <View style={styles.urlRow}>
                <TextInput
                  style={[styles.textInput, styles.urlInput]}
                  placeholder="https://"
                  placeholderTextColor={COLORS.secondaryText}
                  value={url}
                  onChangeText={handleUrlChange}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.pasteButton}
                  onPress={async () => {
                    const text = await Clipboard.getStringAsync()
                    if (text) {
                      setUrl(text)
                      setSourceType(detectSource(text))
                      setUrlError('')
                    }
                  }}
                >
                  <Ionicons name="clipboard-outline" size={20} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
              {urlError ? <Text style={styles.errorText}>{urlError}</Text> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Source</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {SOURCE_TYPES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, sourceType === s && styles.chipSelected]}
                    onPress={() => handleSourceSelect(s)}
                  >
                    <Text style={[styles.chipText, sourceType === s && styles.chipTextSelected]}>
                      {SOURCE_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Body Parts</Text>
              <View style={styles.bodyPartsGrid}>
                {BODY_PARTS.map((part) => {
                  const selected = selectedBodyParts.includes(part)
                  return (
                    <TouchableOpacity
                      key={part}
                      style={[styles.chip, selected && styles.chipSelected, styles.bodyPartChip]}
                      onPress={() => toggleBodyPart(part)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {part}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="Optional notes..."
                placeholderTextColor={COLORS.secondaryText}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.accent,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  saveTextDisabled: {
    color: COLORS.secondaryText,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
  },
  pasteButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.destructive,
  },
  chipScroll: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryBackground,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  bodyPartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyPartChip: {
    marginBottom: 0,
  },
  notesInput: {
    height: 100,
    paddingTop: 12,
  },
})

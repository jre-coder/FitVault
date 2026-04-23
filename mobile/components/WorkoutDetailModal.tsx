import React, { useCallback, useState } from 'react'
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
import { WorkoutItem } from '../types'
import EditWorkoutModal from './EditWorkoutModal'

interface WorkoutDetailModalProps {
  workout: WorkoutItem
  onClose: () => void
}

export default function WorkoutDetailModal({ workout, onClose }: WorkoutDetailModalProps) {
  const { toggleFavorite, deleteWorkout } = useWorkouts()
  const [showEdit, setShowEdit] = useState(false)

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
          <TouchableOpacity onPress={onClose}>
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
                <View key={i} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {[
                      ex.sets ? `${ex.sets} sets` : null,
                      ex.reps ? `${ex.reps} reps` : null,
                      ex.weight ?? null,
                      ex.duration ?? null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                  {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {workout.notes.trim().length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{workout.notes}</Text>
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

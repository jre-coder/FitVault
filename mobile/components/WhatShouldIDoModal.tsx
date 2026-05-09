import React, { useMemo } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRoutines } from '../context/RoutineContext'
import { useSubscription } from '../context/SubscriptionContext'
import { useWorkoutLogs } from '../context/WorkoutLogContext'
import { useWorkouts } from '../context/WorkoutContext'
import { useProfile } from '../context/ProfileContext'
import { getRecommendation } from '../services/todayRecommendationService'
import { Routine, WorkoutItem } from '../types'

interface Props {
  visible: boolean
  onClose: () => void
  onRequestUpgrade: () => void
  onStartWorkout: (routine: Routine, workouts: WorkoutItem[]) => void
}

export default function WhatShouldIDoModal({ visible, onClose, onRequestUpgrade, onStartWorkout }: Props) {
  const { isPremium } = useSubscription()
  const { logs } = useWorkoutLogs()
  const { workouts } = useWorkouts()
  const { routines } = useRoutines()
  const { profile } = useProfile()

  const recommendation = useMemo(() => {
    if (!isPremium || !profile) return null
    return getRecommendation(logs, workouts, routines, profile)
  }, [isPremium, logs, workouts, routines, profile])

  function handleStart() {
    if (!recommendation || recommendation.type !== 'routine' || !recommendation.routine) return
    const routineWorkouts = recommendation.routine.items
      .map(item => workouts.find(w => w.id === item.workoutItemId))
      .filter((w): w is WorkoutItem => Boolean(w))
    onStartWorkout(recommendation.routine, routineWorkouts)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What Should I Do Today?</Text>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {!isPremium ? (
            <LockedView onRequestUpgrade={onRequestUpgrade} />
          ) : recommendation === null ? null : recommendation.type === 'no_routines' ? (
            <NoRoutinesView reason={recommendation.reason} />
          ) : recommendation.type === 'rest' ? (
            <RestView
              reason={recommendation.reason}
              fatiguedMuscles={recommendation.fatiguedMuscles}
              daysSinceLastWorkout={recommendation.daysSinceLastWorkout}
            />
          ) : (
            <RoutineView
              recommendation={recommendation}
              onStart={handleStart}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

function LockedView({ onRequestUpgrade }: { onRequestUpgrade: () => void }) {
  return (
    <View style={styles.lockedContainer}>
      <Text style={styles.lockedIcon}>🔒</Text>
      <Text style={styles.lockedTitle}>Premium Feature</Text>
      <Text style={styles.lockedSubtitle}>
        Get daily workout recommendations based on your muscle recovery, goals, and history.
      </Text>
      <Pressable style={styles.unlockBtn} onPress={onRequestUpgrade}>
        <Text style={styles.unlockBtnText}>Unlock with Premium</Text>
      </Pressable>
    </View>
  )
}

function NoRoutinesView({ reason }: { reason: string }) {
  return (
    <View style={styles.centeredCard}>
      <Text style={styles.cardIcon}>📋</Text>
      <Text style={styles.cardReason}>{reason}</Text>
    </View>
  )
}

function RestView({
  reason,
  fatiguedMuscles,
  daysSinceLastWorkout,
}: {
  reason: string
  fatiguedMuscles: string[]
  daysSinceLastWorkout: number | null
}) {
  return (
    <View style={styles.centeredCard}>
      <Text style={styles.cardIcon}>😴</Text>
      <Text style={styles.restLabel}>Rest Day</Text>
      <Text style={styles.cardReason}>{reason}</Text>
      {daysSinceLastWorkout !== null && (
        <Text style={styles.daysLabel}>
          Last workout: {daysSinceLastWorkout} day{daysSinceLastWorkout === 1 ? '' : 's'} ago
        </Text>
      )}
      {fatiguedMuscles.length > 0 && (
        <View style={styles.muscleSection}>
          <Text style={styles.muscleSectionLabel}>Recovering</Text>
          <View style={styles.chipRow}>
            {fatiguedMuscles.map(m => (
              <Text key={m} style={styles.fatiguedChip}>{m}</Text>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

function RoutineView({
  recommendation,
  onStart,
}: {
  recommendation: NonNullable<ReturnType<typeof getRecommendation>>
  onStart: () => void
}) {
  const { routine, reason, readyMuscles, fatiguedMuscles, daysSinceLastWorkout } = recommendation
  if (!routine) return null

  return (
    <View>
      <View style={styles.routineCard}>
        <Text style={styles.routineLabel}>Today's Recommendation</Text>
        <Text style={styles.routineName}>{routine.name}</Text>
        <Text style={styles.cardReason}>{reason}</Text>

        {daysSinceLastWorkout !== null && (
          <Text style={styles.daysLabel}>
            {daysSinceLastWorkout} day{daysSinceLastWorkout === 1 ? '' : 's'} since last workout
          </Text>
        )}
      </View>

      {readyMuscles.length > 0 && (
        <View style={styles.muscleSection}>
          <Text style={styles.muscleSectionLabel}>Ready</Text>
          <View style={styles.chipRow}>
            {readyMuscles.map(m => (
              <Text key={m} style={styles.readyChip}>{m}</Text>
            ))}
          </View>
        </View>
      )}

      {fatiguedMuscles.length > 0 && (
        <View style={styles.muscleSection}>
          <Text style={styles.muscleSectionLabel}>Still Recovering</Text>
          <View style={styles.chipRow}>
            {fatiguedMuscles.map(m => (
              <Text key={m} style={styles.fatiguedChip}>{m}</Text>
            ))}
          </View>
        </View>
      )}

      <Pressable style={styles.startBtn} onPress={onStart}>
        <Text style={styles.startBtnText}>Start Workout</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1e',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 16, color: '#888' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },

  lockedContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  lockedIcon: { fontSize: 48 },
  lockedTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  lockedSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  unlockBtn: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  unlockBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  centeredCard: { backgroundColor: '#1c1c1e', borderRadius: 16, padding: 24, alignItems: 'center', gap: 10 },
  cardIcon: { fontSize: 40 },
  restLabel: { fontSize: 22, fontWeight: '700', color: '#fff' },
  cardReason: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  daysLabel: { fontSize: 13, color: '#666', marginTop: 4 },

  routineCard: { backgroundColor: '#1c1c1e', borderRadius: 16, padding: 20, gap: 8, marginBottom: 16 },
  routineLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  routineName: { fontSize: 28, fontWeight: '800', color: '#fff' },

  muscleSection: { marginBottom: 12 },
  muscleSectionLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  readyChip: { backgroundColor: '#14532d', color: '#4ade80', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontSize: 13, fontWeight: '600' },
  fatiguedChip: { backgroundColor: '#7c2d12', color: '#fb923c', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontSize: 13, fontWeight: '600' },

  startBtn: { backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})

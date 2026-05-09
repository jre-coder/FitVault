import React, { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BODY_PARTS, COLORS } from '../../constants'
import { useWorkouts } from '../../context/WorkoutContext'
import { BodyPart, Routine, WorkoutItem, WorkoutSeries } from '../../types'
import BodyPartCard from '../../components/BodyPartCard'
import WorkoutRow from '../../components/WorkoutRow'
import WorkoutDetailModal from '../../components/WorkoutDetailModal'
import WorkoutExecutionModal from '../../components/WorkoutExecutionModal'
import { buildSeriesExecution } from '../../services/seriesExecutionBuilder'

type EphemeralExecution = { routine: Routine; workouts: WorkoutItem[] } | null

interface BodyPartCardData {
  bodyPart: BodyPart
  count: number
}

export default function BrowseScreen() {
  const { workouts } = useWorkouts()
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutItem | null>(null)
  const [ephemeralExecution, setEphemeralExecution] = useState<EphemeralExecution>(null)

  const bodyPartCounts = useMemo<BodyPartCardData[]>(() => {
    return BODY_PARTS.map((part) => ({
      bodyPart: part,
      count: workouts.filter((w) => w.bodyParts.includes(part)).length,
    }))
  }, [workouts])

  const filteredWorkouts = useMemo(() => {
    if (!selectedBodyPart) return []
    return workouts.filter((w) => w.bodyParts.includes(selectedBodyPart))
  }, [workouts, selectedBodyPart])

  const handleBodyPartPress = useCallback((part: BodyPart) => {
    setSelectedBodyPart(part)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedBodyPart(null)
  }, [])

  const handleSelectWorkout = useCallback((workout: WorkoutItem) => {
    setSelectedWorkout(workout)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedWorkout(null)
  }, [])

  const handleStartSeries = useCallback((series: WorkoutSeries) => {
    setSelectedWorkout(null)
    const execution = buildSeriesExecution(series, workouts)
    setEphemeralExecution(execution)
  }, [workouts])

  const renderBodyPartCard: ListRenderItem<BodyPartCardData> = useCallback(
    ({ item }) => (
      <BodyPartCard
        bodyPart={item.bodyPart}
        count={item.count}
        onPress={() => handleBodyPartPress(item.bodyPart)}
      />
    ),
    [handleBodyPartPress],
  )

  const renderWorkoutRow: ListRenderItem<WorkoutItem> = useCallback(
    ({ item }) => <WorkoutRow workout={item} onPress={() => handleSelectWorkout(item)} />,
    [handleSelectWorkout],
  )

  const bodyPartKeyExtractor = useCallback((item: BodyPartCardData) => item.bodyPart, [])
  const workoutKeyExtractor = useCallback((item: WorkoutItem) => item.id, [])

  const WorkoutSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  )

  if (selectedBodyPart) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={COLORS.accent} />
            <Text style={styles.backText}>Browse</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>{selectedBodyPart}</Text>

        {filteredWorkouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={48} color={COLORS.secondaryText} />
            <Text style={styles.emptyTitle}>No Workouts</Text>
            <Text style={styles.emptySubtitle}>No workouts saved for {selectedBodyPart} yet</Text>
          </View>
        ) : (
          <FlatList
            data={filteredWorkouts}
            keyExtractor={workoutKeyExtractor}
            renderItem={renderWorkoutRow}
            ItemSeparatorComponent={WorkoutSeparator}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {selectedWorkout && (
          <WorkoutDetailModal workout={selectedWorkout} onClose={handleCloseDetail} onStartSeries={handleStartSeries} />
        )}
        {ephemeralExecution && (
          <WorkoutExecutionModal
            visible={!!ephemeralExecution}
            routine={ephemeralExecution.routine}
            workouts={ephemeralExecution.workouts}
            onClose={() => setEphemeralExecution(null)}
          />
        )}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse</Text>
      </View>
      <FlatList
        data={bodyPartCounts}
        keyExtractor={bodyPartKeyExtractor}
        renderItem={renderBodyPartCard}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.gridRow}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  gridContent: {
    padding: 12,
    paddingBottom: 24,
  },
  gridRow: {
    gap: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
    marginLeft: 72,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.secondaryText,
    textAlign: 'center',
  },
})

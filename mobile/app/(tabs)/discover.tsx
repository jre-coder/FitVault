import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BODY_PARTS, COLORS, WORKOUT_TYPES } from '../../constants'
import { useSubscription } from '../../context/SubscriptionContext'
import { useWorkouts } from '../../context/WorkoutContext'
import { AIWorkoutSuggestion, BodyPart, WorkoutItem } from '../../types'
import { fetchSimilarWorkouts, fetchTopWorkouts, suggestionToWorkoutItem } from '../../services/claudeService'
import LockedView from '../../components/LockedView'
import PaywallModal from '../../components/PaywallModal'
import AIResultRow from '../../components/AIResultRow'
import AIResultDetailModal from '../../components/AIResultDetailModal'

type DiscoverMode = 'top' | 'similar'

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'website', label: 'Websites' },
]

function DiscoverContent() {
  const { workouts, addWorkout } = useWorkouts()
  const [mode, setMode] = useState<DiscoverMode>('top')
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart>('Full Body')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube'])
  const [selectedWorkoutTypes, setSelectedWorkoutTypes] = useState<string[]>(['any'])
  const [results, setResults] = useState<AIWorkoutSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedResult, setSelectedResult] = useState<AIWorkoutSuggestion | null>(null)

  const handleTogglePlatform = useCallback((id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((p) => p !== id) : prev
        : [...prev, id],
    )
  }, [])

  const handleToggleWorkoutType = useCallback((id: string) => {
    if (id === 'any') {
      setSelectedWorkoutTypes(['any'])
      return
    }
    setSelectedWorkoutTypes((prev) => {
      const without = prev.filter((t) => t !== 'any' && t !== id)
      const result = prev.includes(id) ? without : [...without, id]
      return result.length === 0 ? ['any'] : result
    })
  }, [])

  const handleFind = useCallback(async () => {
    setError('')
    setResults([])
    setIsLoading(true)
    try {
      if (mode === 'top') {
        const data = await fetchTopWorkouts(selectedBodyPart, selectedPlatforms, selectedWorkoutTypes)
        setResults(data)
      } else {
        const workout = workouts.find((w) => w.id === selectedWorkoutId)
        if (!workout) {
          setError('Please select a workout first')
          setIsLoading(false)
          return
        }
        const data = await fetchSimilarWorkouts(workout, selectedPlatforms, selectedWorkoutTypes)
        setResults(data)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [mode, selectedBodyPart, selectedWorkoutId, workouts, selectedPlatforms, selectedWorkoutTypes])

  const handleSave = useCallback(
    (result: AIWorkoutSuggestion) => {
      addWorkout({
        ...suggestionToWorkoutItem(result),
        dateAdded: new Date().toISOString(),
      } as Omit<WorkoutItem, 'id' | 'dateAdded'>)
    },
    [addWorkout],
  )

  const handleSelectResult = useCallback((result: AIWorkoutSuggestion) => {
    setSelectedResult(result)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedResult(null)
  }, [])

  const handleBodyPartSelect = useCallback((part: BodyPart) => {
    setSelectedBodyPart(part)
  }, [])

  const handleWorkoutSelect = useCallback((id: string) => {
    setSelectedWorkoutId(id)
  }, [])

  const renderResult: ListRenderItem<AIWorkoutSuggestion> = useCallback(
    ({ item }) => (
      <AIResultRow
        result={item}
        onSave={() => handleSave(item)}
        onPress={() => handleSelectResult(item)}
      />
    ),
    [handleSave, handleSelectResult],
  )

  const keyExtractor = useCallback((item: AIWorkoutSuggestion) => item.id, [])

  const ResultSeparator = useCallback(() => <View style={styles.separator} />, [])

  const canFind =
    selectedPlatforms.length > 0 &&
    (mode === 'top' || (mode === 'similar' && selectedWorkoutId !== null))

  return (
    <View style={styles.contentContainer}>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, mode === 'top' && styles.segmentActive]}
          onPress={() => setMode('top')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, mode === 'top' && styles.segmentTextActive]}>
            Top Workouts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, mode === 'similar' && styles.segmentActive]}
          onPress={() => setMode('similar')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, mode === 'similar' && styles.segmentTextActive]}>
            Find Similar
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'top' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bodyPartScroll}
          style={styles.bodyPartScrollContainer}
        >
          {BODY_PARTS.map((part) => (
            <TouchableOpacity
              key={part}
              style={[styles.chip, selectedBodyPart === part && styles.chipSelected]}
              onPress={() => handleBodyPartSelect(part)}
            >
              <Text style={[styles.chipText, selectedBodyPart === part && styles.chipTextSelected]}>
                {part}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {mode === 'similar' && (
        <View style={styles.workoutList}>
          {workouts.length === 0 ? (
            <Text style={styles.noWorkoutsText}>Save some workouts first to find similar ones</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.workoutPickerScroll}>
              {workouts.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.workoutPickerRow,
                    selectedWorkoutId === w.id && styles.workoutPickerRowSelected,
                  ]}
                  onPress={() => handleWorkoutSelect(w.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.workoutPickerRadio}>
                    {selectedWorkoutId === w.id && (
                      <View style={styles.workoutPickerRadioInner} />
                    )}
                  </View>
                  <Text style={styles.workoutPickerTitle} numberOfLines={1}>
                    {w.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Workout Type</Text>
        <View style={styles.filterChips}>
          {WORKOUT_TYPES.map((t) => {
            const isSelected = selectedWorkoutTypes.includes(t.id)
            const isAny = t.id === 'any'
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.chip,
                  isSelected && (isAny ? styles.chipAny : styles.chipSelected),
                ]}
                onPress={() => handleToggleWorkoutType(t.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <View style={styles.platformSection}>
        <Text style={styles.platformLabel}>Platforms</Text>
        <View style={styles.platformRow}>
          {PLATFORMS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, selectedPlatforms.includes(p.id) && styles.chipSelected]}
              onPress={() => handleTogglePlatform(p.id)}
            >
              <Text style={[styles.chipText, selectedPlatforms.includes(p.id) && styles.chipTextSelected]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.findButton, (!canFind || isLoading) && styles.findButtonDisabled]}
        onPress={handleFind}
        disabled={!canFind || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            <Text style={styles.findButtonText}>Find</Text>
          </>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {results.length > 0 && (
        <>
          <Text style={styles.disclaimer}>
            AI-generated results. Always verify links before saving.
          </Text>
          <FlatList
            data={results}
            keyExtractor={keyExtractor}
            renderItem={renderResult}
            ItemSeparatorComponent={ResultSeparator}
            scrollEnabled={false}
          />
        </>
      )}

      {selectedResult && (
        <AIResultDetailModal
          result={selectedResult}
          onSave={() => handleSave(selectedResult)}
          onClose={handleCloseDetail}
        />
      )}
    </View>
  )
}

export default function DiscoverScreen() {
  const { isPremium } = useSubscription()
  const [showPaywall, setShowPaywall] = useState(false)

  const handleUnlock = useCallback(() => {
    setShowPaywall(true)
  }, [])

  const handleClosePaywall = useCallback(() => {
    setShowPaywall(false)
  }, [])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>
      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
        {isPremium ? (
          <DiscoverContent />
        ) : (
          <View style={styles.lockedWrapper}>
            <LockedView
              icon="sparkles-outline"
              title="Discover Workouts"
              description="Get AI-curated top workout recommendations for any muscle group or find workouts similar to ones you love."
              onUnlock={handleUnlock}
            />
          </View>
        )}
      </ScrollView>
      <PaywallModal visible={showPaywall} onClose={handleClosePaywall} />
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },
  lockedWrapper: {
    height: 500,
    justifyContent: 'center',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.secondaryText,
  },
  segmentTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  bodyPartScrollContainer: {
    marginBottom: 16,
  },
  bodyPartScroll: {
    paddingHorizontal: 16,
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
  workoutList: {
    marginHorizontal: 16,
    marginBottom: 16,
    maxHeight: 200,
  },
  workoutPickerScroll: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 12,
  },
  workoutPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  workoutPickerRowSelected: {
    backgroundColor: COLORS.accent + '1A',
  },
  workoutPickerRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutPickerRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  workoutPickerTitle: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  noWorkoutsText: {
    fontSize: 14,
    color: COLORS.secondaryText,
    textAlign: 'center',
    padding: 16,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipAny: {
    backgroundColor: COLORS.text,
  },
  platformSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  platformLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  findButtonDisabled: {
    backgroundColor: COLORS.secondaryText,
  },
  findButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.destructive,
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
    marginLeft: 60,
  },
})

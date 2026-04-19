import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, WORKOUT_TYPES } from '../../constants'
import { useSubscription } from '../../context/SubscriptionContext'
import { useWorkouts } from '../../context/WorkoutContext'
import { AIWorkoutSuggestion, FitnessLevel, WorkoutItem } from '../../types'
import { fetchRecommendations, suggestionToWorkoutItem } from '../../services/claudeService'
import LockedView from '../../components/LockedView'
import PaywallModal from '../../components/PaywallModal'
import AIResultRow from '../../components/AIResultRow'
import AIResultDetailModal from '../../components/AIResultDetailModal'

const FITNESS_LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced']

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'website', label: 'Websites' },
]

const EQUIPMENT_OPTIONS = [
  'Bodyweight',
  'Dumbbells',
  'Barbell',
  'Resistance Bands',
  'Kettlebell',
  'Full Gym',
]

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90]

function ForYouContent() {
  const { addWorkout } = useWorkouts()
  const [goals, setGoals] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('Intermediate')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Bodyweight'])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['youtube'])
  const [selectedWorkoutTypes, setSelectedWorkoutTypes] = useState<string[]>(['any'])

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
  const [results, setResults] = useState<AIWorkoutSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedResult, setSelectedResult] = useState<AIWorkoutSuggestion | null>(null)

  const handleToggleEquipment = useCallback((item: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    )
  }, [])

  const handleDecreaseDuration = useCallback(() => {
    setDurationMinutes((prev) => {
      const idx = DURATION_OPTIONS.indexOf(prev)
      return idx > 0 ? DURATION_OPTIONS[idx - 1] : prev
    })
  }, [])

  const handleIncreaseDuration = useCallback(() => {
    setDurationMinutes((prev) => {
      const idx = DURATION_OPTIONS.indexOf(prev)
      return idx < DURATION_OPTIONS.length - 1 ? DURATION_OPTIONS[idx + 1] : prev
    })
  }, [])

  const handleGetRecommendations = useCallback(async () => {
    setError('')
    setResults([])
    setIsLoading(true)
    try {
      const data = await fetchRecommendations({
        goals: goals.trim() || 'General fitness',
        fitnessLevel,
        equipment: selectedEquipment,
        durationMinutes,
        platforms: selectedPlatforms,
        workoutTypes: selectedWorkoutTypes,
      })
      setResults(data)
    } catch {
      setError('Failed to fetch recommendations. Check your API key and connection.')
    } finally {
      setIsLoading(false)
    }
  }, [goals, fitnessLevel, selectedEquipment, durationMinutes])

  const handleSave = useCallback(
    (result: AIWorkoutSuggestion) => {
      addWorkout(suggestionToWorkoutItem(result) as Omit<WorkoutItem, 'id' | 'dateAdded'>)
    },
    [addWorkout],
  )

  const handleSelectResult = useCallback((result: AIWorkoutSuggestion) => {
    setSelectedResult(result)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedResult(null)
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

  const isEnabled = selectedEquipment.length > 0 && selectedPlatforms.length > 0

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Goals</Text>
          <TextInput
            style={styles.goalsInput}
            placeholder="e.g. Lose weight, build muscle, improve endurance..."
            placeholderTextColor={COLORS.secondaryText}
            value={goals}
            onChangeText={setGoals}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Fitness Level</Text>
          <View style={styles.chipRow}>
            {FITNESS_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.chip, fitnessLevel === level && styles.chipSelected]}
                onPress={() => setFitnessLevel(level)}
              >
                <Text style={[styles.chipText, fitnessLevel === level && styles.chipTextSelected]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Session Duration</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                durationMinutes === DURATION_OPTIONS[0] && styles.stepperButtonDisabled,
              ]}
              onPress={handleDecreaseDuration}
              disabled={durationMinutes === DURATION_OPTIONS[0]}
            >
              <Ionicons
                name="remove"
                size={20}
                color={durationMinutes === DURATION_OPTIONS[0] ? COLORS.secondaryText : COLORS.accent}
              />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{durationMinutes} min</Text>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                durationMinutes === DURATION_OPTIONS[DURATION_OPTIONS.length - 1] && styles.stepperButtonDisabled,
              ]}
              onPress={handleIncreaseDuration}
              disabled={durationMinutes === DURATION_OPTIONS[DURATION_OPTIONS.length - 1]}
            >
              <Ionicons
                name="add"
                size={20}
                color={
                  durationMinutes === DURATION_OPTIONS[DURATION_OPTIONS.length - 1]
                    ? COLORS.secondaryText
                    : COLORS.accent
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Available Equipment</Text>
          <View style={styles.equipmentGrid}>
            {EQUIPMENT_OPTIONS.map((item) => {
              const selected = selectedEquipment.includes(item)
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => handleToggleEquipment(item)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Workout Type</Text>
          <View style={styles.chipWrap}>
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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Platforms</Text>
          <View style={styles.equipmentGrid}>
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
          style={[styles.recommendButton, (!isEnabled || isLoading) && styles.recommendButtonDisabled]}
          onPress={handleGetRecommendations}
          disabled={!isEnabled || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.recommendButtonText}>Get My Recommendations</Text>
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
      </ScrollView>

      {selectedResult && (
        <AIResultDetailModal
          result={selectedResult}
          onSave={() => handleSave(selectedResult)}
          onClose={handleCloseDetail}
        />
      )}
    </KeyboardAvoidingView>
  )
}

export default function ForYouScreen() {
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
        <Text style={styles.headerTitle}>For You</Text>
      </View>
      {isPremium ? (
        <ForYouContent />
      ) : (
        <View style={styles.lockedWrapper}>
          <LockedView
            icon="person-outline"
            title="Personalized For You"
            description="Get AI-powered workout recommendations tailored to your goals, fitness level, and available equipment."
            onUnlock={handleUnlock}
          />
        </View>
      )}
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
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalsInput: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    height: 90,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.5,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 70,
    textAlign: 'center',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipAny: {
    backgroundColor: COLORS.text,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recommendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
  },
  recommendButtonDisabled: {
    backgroundColor: COLORS.secondaryText,
  },
  recommendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.destructive,
    fontSize: 14,
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.secondaryText,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.separator,
    marginLeft: 60,
  },
})

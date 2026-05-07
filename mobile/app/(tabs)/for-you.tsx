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
import { useProfile } from '../../context/ProfileContext'
import { AIWorkoutSuggestion, FitnessLevel, GOAL_OPTIONS, SENSITIVE_AREA_OPTIONS, WorkoutItem } from '../../types'
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
  const { profile, updateProfile } = useProfile()

  // Local UI state — not persisted
  const [profileExpanded, setProfileExpanded] = useState(false)
  const [showSensitiveAreas, setShowSensitiveAreas] = useState(false)
  const [ageText, setAgeText] = useState(profile.age != null ? String(profile.age) : '')

  const [results, setResults] = useState<AIWorkoutSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedResult, setSelectedResult] = useState<AIWorkoutSuggestion | null>(null)

  const isProfileSectionOpen = profileExpanded || profile.goals.length === 0

  // ─── Profile handlers ──────────────────────────────────────────────────────

  const handleToggleGoal = useCallback((goal: string) => {
    updateProfile({
      goals: profile.goals.includes(goal)
        ? profile.goals.filter(g => g !== goal)
        : [...profile.goals, goal],
    })
  }, [profile.goals, updateProfile])

  const handleSetFitnessLevel = useCallback((level: FitnessLevel) => {
    updateProfile({ fitnessLevel: level })
  }, [updateProfile])

  function handleAgeCommit() {
    const n = parseInt(ageText, 10)
    updateProfile({ age: isNaN(n) || n <= 0 ? undefined : n })
  }

  const handleToggleSensitiveArea = useCallback((area: string) => {
    updateProfile({
      sensitiveAreas: profile.sensitiveAreas.includes(area)
        ? profile.sensitiveAreas.filter(a => a !== area)
        : [...profile.sensitiveAreas, area],
    })
  }, [profile.sensitiveAreas, updateProfile])

  // ─── Preferences handlers ─────────────────────────────────────────────────

  const handleToggleEquipment = useCallback((item: string) => {
    updateProfile({
      equipment: profile.equipment.includes(item)
        ? profile.equipment.filter(e => e !== item)
        : [...profile.equipment, item],
    })
  }, [profile.equipment, updateProfile])

  const handleDecreaseDuration = useCallback(() => {
    const idx = DURATION_OPTIONS.indexOf(profile.preferredDuration)
    if (idx > 0) updateProfile({ preferredDuration: DURATION_OPTIONS[idx - 1] })
  }, [profile.preferredDuration, updateProfile])

  const handleIncreaseDuration = useCallback(() => {
    const idx = DURATION_OPTIONS.indexOf(profile.preferredDuration)
    if (idx < DURATION_OPTIONS.length - 1) updateProfile({ preferredDuration: DURATION_OPTIONS[idx + 1] })
  }, [profile.preferredDuration, updateProfile])

  const handleTogglePlatform = useCallback((id: string) => {
    updateProfile({
      preferredPlatforms: profile.preferredPlatforms.includes(id)
        ? profile.preferredPlatforms.length > 1
          ? profile.preferredPlatforms.filter(p => p !== id)
          : profile.preferredPlatforms
        : [...profile.preferredPlatforms, id],
    })
  }, [profile.preferredPlatforms, updateProfile])

  const handleToggleWorkoutType = useCallback((id: string) => {
    if (id === 'any') {
      updateProfile({ preferredWorkoutTypes: ['any'] })
      return
    }
    const without = profile.preferredWorkoutTypes.filter(t => t !== 'any' && t !== id)
    const result = profile.preferredWorkoutTypes.includes(id) ? without : [...without, id]
    updateProfile({ preferredWorkoutTypes: result.length === 0 ? ['any'] : result })
  }, [profile.preferredWorkoutTypes, updateProfile])

  // ─── Recommendations ──────────────────────────────────────────────────────

  const handleGetRecommendations = useCallback(async () => {
    setError('')
    setResults([])
    setIsLoading(true)
    try {
      const data = await fetchRecommendations({
        goals: profile.goals.length > 0 ? profile.goals.join(', ') : 'General fitness',
        fitnessLevel: profile.fitnessLevel,
        equipment: profile.equipment,
        durationMinutes: profile.preferredDuration,
        platforms: profile.preferredPlatforms,
        workoutTypes: profile.preferredWorkoutTypes,
      })
      setResults(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [profile, addWorkout])

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

  const isEnabled = profile.equipment.length > 0 && profile.preferredPlatforms.length > 0

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
        {/* ── Profile section ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.profileHeader}
            onPress={() => setProfileExpanded(prev => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLabel}>Your Profile</Text>
            <Ionicons
              name={isProfileSectionOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.secondaryText}
            />
          </TouchableOpacity>

          {isProfileSectionOpen && (
            <View style={styles.profileFields}>
              {profile.goals.length === 0 && (
                <Text style={styles.profilePrompt}>
                  Set up your profile for better recommendations
                </Text>
              )}

              <Text style={styles.sectionLabel}>Goals</Text>
              <View style={styles.chipWrap}>
                {GOAL_OPTIONS.map(goal => {
                  const selected = profile.goals.includes(goal)
                  return (
                    <TouchableOpacity
                      key={goal}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => handleToggleGoal(goal)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {goal}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              <Text style={styles.sectionLabel}>Fitness Level</Text>
              <View style={styles.chipRow}>
                {FITNESS_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.chip, profile.fitnessLevel === level && styles.chipSelected]}
                    onPress={() => handleSetFitnessLevel(level)}
                  >
                    <Text style={[styles.chipText, profile.fitnessLevel === level && styles.chipTextSelected]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.ageRow}>
                <Text style={styles.sectionLabel}>Age (optional)</Text>
                <TextInput
                  style={styles.ageInput}
                  keyboardType="numeric"
                  value={ageText}
                  onChangeText={setAgeText}
                  onBlur={handleAgeCommit}
                  onSubmitEditing={handleAgeCommit}
                  placeholder="—"
                  placeholderTextColor={COLORS.secondaryText}
                />
              </View>

              <TouchableOpacity
                style={styles.sensitiveToggleRow}
                onPress={() => setShowSensitiveAreas(prev => !prev)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionLabel}>
                  {profile.sensitiveAreas.length > 0
                    ? `Injuries / Sensitive Areas (${profile.sensitiveAreas.length})`
                    : 'Injuries / Sensitive Areas'}
                </Text>
                <Ionicons
                  name={showSensitiveAreas ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.secondaryText}
                />
              </TouchableOpacity>

              {showSensitiveAreas && (
                <View style={styles.chipWrap}>
                  {SENSITIVE_AREA_OPTIONS.map(area => {
                    const selected = profile.sensitiveAreas.includes(area)
                    return (
                      <TouchableOpacity
                        key={area}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => handleToggleSensitiveArea(area)}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {area}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Session Duration ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Session Duration</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                profile.preferredDuration === DURATION_OPTIONS[0] && styles.stepperButtonDisabled,
              ]}
              onPress={handleDecreaseDuration}
              disabled={profile.preferredDuration === DURATION_OPTIONS[0]}
            >
              <Ionicons
                name="remove"
                size={20}
                color={profile.preferredDuration === DURATION_OPTIONS[0] ? COLORS.secondaryText : COLORS.accent}
              />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{profile.preferredDuration} min</Text>
            <TouchableOpacity
              style={[
                styles.stepperButton,
                profile.preferredDuration === DURATION_OPTIONS[DURATION_OPTIONS.length - 1] && styles.stepperButtonDisabled,
              ]}
              onPress={handleIncreaseDuration}
              disabled={profile.preferredDuration === DURATION_OPTIONS[DURATION_OPTIONS.length - 1]}
            >
              <Ionicons
                name="add"
                size={20}
                color={
                  profile.preferredDuration === DURATION_OPTIONS[DURATION_OPTIONS.length - 1]
                    ? COLORS.secondaryText
                    : COLORS.accent
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Available Equipment ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Available Equipment</Text>
          <View style={styles.equipmentGrid}>
            {EQUIPMENT_OPTIONS.map(item => {
              const selected = profile.equipment.includes(item)
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

        {/* ── Workout Type ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Workout Type</Text>
          <View style={styles.chipWrap}>
            {WORKOUT_TYPES.map(t => {
              const isSelected = profile.preferredWorkoutTypes.includes(t.id)
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

        {/* ── Platforms ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Platforms</Text>
          <View style={styles.equipmentGrid}>
            {PLATFORMS.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, profile.preferredPlatforms.includes(p.id) && styles.chipSelected]}
                onPress={() => handleTogglePlatform(p.id)}
              >
                <Text style={[styles.chipText, profile.preferredPlatforms.includes(p.id) && styles.chipTextSelected]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Find button ── */}
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
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileFields: {
    gap: 10,
  },
  profilePrompt: {
    fontSize: 13,
    color: COLORS.secondaryText,
    fontStyle: 'italic',
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ageInput: {
    width: 60,
    textAlign: 'right',
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 8,
    padding: 8,
  },
  sensitiveToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

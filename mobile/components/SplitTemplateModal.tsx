import React, { useEffect, useState } from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoutines } from '../context/RoutineContext'
import { COLORS } from '../constants'
import { DayOfWeek, DAYS_OF_WEEK } from '../types'
import {
  SPLIT_TEMPLATES,
  SplitTemplate,
  buildScheduleFromTemplate,
} from '../services/splitTemplates'

const DAY_ABBR: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

interface Props {
  visible: boolean
  onClose: () => void
}

type Selection = SplitTemplate | 'custom' | null

const EMPTY_DAY_PATTERN: Record<DayOfWeek, string | 'rest' | null> = {
  monday: null, tuesday: null, wednesday: null, thursday: null,
  friday: null, saturday: null, sunday: null,
}

export default function SplitTemplateModal({ visible, onClose }: Props) {
  const { addRoutinesBatch, setDaySchedule } = useRoutines()
  const [selected, setSelected] = useState<Selection>(null)

  // Custom split state
  const [customNames, setCustomNames] = useState<string[]>(['', ''])
  const [customPattern, setCustomPattern] = useState<Record<DayOfWeek, string | 'rest' | null>>(EMPTY_DAY_PATTERN)

  useEffect(() => {
    if (!visible) {
      setSelected(null)
      setCustomNames(['', ''])
      setCustomPattern(EMPTY_DAY_PATTERN)
    }
  }, [visible])

  function handleApply() {
    if (selected === 'custom') {
      const validNames = customNames.map(n => n.trim()).filter(Boolean)
      if (validNames.length === 0) return
      const created = addRoutinesBatch(validNames.map(name => ({ name, items: [] })))
      const nameToId = new Map(created.map(r => [r.name, r.id]))
      DAYS_OF_WEEK.forEach(day => {
        const val = customPattern[day]
        if (val === 'rest') setDaySchedule(day, 'rest')
        else if (val) setDaySchedule(day, nameToId.get(val) ?? null)
        else setDaySchedule(day, null)
      })
      onClose()
      return
    }
    if (!selected) return
    const created = addRoutinesBatch(selected.routines.map(r => ({ name: r.name, items: [] })))
    const schedule = buildScheduleFromTemplate(selected, created)
    DAYS_OF_WEEK.forEach(day => setDaySchedule(day, schedule[day]))
    onClose()
  }

  const canApplyCustom = selected === 'custom' && customNames.some(n => n.trim().length > 0)
  const showApply = (selected !== null && selected !== 'custom') || canApplyCustom

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Split Templates</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Pick a training structure. Each template creates named routines and sets up your weekly schedule.
            You can add workouts to each routine afterwards.
          </Text>

          {SPLIT_TEMPLATES.map(template => {
            const isSelected = selected !== 'custom' && selected?.id === template.id
            return (
              <TouchableOpacity
                key={template.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(isSelected ? null : template)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardName, isSelected && styles.cardNameSelected]}>
                      {template.name}
                    </Text>
                    <View style={[styles.daysBadge, isSelected && styles.daysBadgeSelected]}>
                      <Text style={[styles.daysBadgeText, isSelected && styles.daysBadgeTextSelected]}>
                        {template.daysPerWeek} days/week
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
                  )}
                </View>

                <Text style={styles.cardDescription}>{template.description}</Text>

                <View style={styles.routineChips}>
                  {template.routines.map(r => (
                    <View key={r.name} style={[styles.routineChip, isSelected && styles.routineChipSelected]}>
                      <Text style={[styles.routineChipText, isSelected && styles.routineChipTextSelected]}>
                        {r.name}
                      </Text>
                    </View>
                  ))}
                </View>

                {isSelected && (
                  <View style={styles.weekPreview}>
                    <Text style={styles.weekPreviewLabel}>Weekly schedule</Text>
                    <View style={styles.weekRow}>
                      {DAYS_OF_WEEK.map((day, i) => {
                        const pattern = template.weeklyPattern[day]
                        const routineIndex = template.routines.findIndex(r => r.name === pattern)
                        const isWorkout = pattern !== null && pattern !== 'rest'
                        const isRest = pattern === 'rest'
                        return (
                          <View key={day} style={styles.dayCol}>
                            <Text style={styles.dayAbbr}>{DAY_ABBR[day]}</Text>
                            <View style={[
                              styles.dayDot,
                              isWorkout && styles.dayDotActive,
                              isRest && styles.dayDotRest,
                            ]}>
                              {isWorkout ? (
                                <Text style={styles.dayDotLabel}>
                                  {routineIndex >= 0 ? routineIndex + 1 : ''}
                                </Text>
                              ) : isRest ? (
                                <Ionicons name="moon-outline" size={10} color={COLORS.secondaryText} />
                              ) : null}
                            </View>
                          </View>
                        )
                      })}
                    </View>
                    <View style={styles.weekLegend}>
                      {template.routines.map((r, i) => (
                        <View key={r.name} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]}>
                            <Text style={styles.dayDotLabel}>{i + 1}</Text>
                          </View>
                          <Text style={styles.legendText}>{r.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}

          {/* Custom card */}
          {(() => {
            const isCustom = selected === 'custom'
            return (
              <TouchableOpacity
                style={[styles.card, isCustom && styles.cardSelected]}
                onPress={() => setSelected(isCustom ? null : 'custom')}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardName, isCustom && styles.cardNameSelected]}>Custom</Text>
                  </View>
                  {isCustom && <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />}
                </View>
                <Text style={styles.cardDescription}>
                  Define your own routine names and assign them to days of the week.
                </Text>

                {isCustom && (
                  <View style={styles.customBuilder}>
                    <Text style={styles.customSectionLabel}>Routine Names</Text>
                    {customNames.map((name, i) => (
                      <TextInput
                        key={i}
                        style={styles.customInput}
                        value={name}
                        onChangeText={text => {
                          const next = [...customNames]
                          next[i] = text
                          setCustomNames(next)
                        }}
                        placeholder="Routine name"
                        placeholderTextColor={COLORS.secondaryText}
                      />
                    ))}
                    <TouchableOpacity
                      style={styles.addRoutineBtn}
                      onPress={() => setCustomNames(prev => [...prev, ''])}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={COLORS.accent} />
                      <Text style={styles.addRoutineBtnText}>Add Routine</Text>
                    </TouchableOpacity>

                    <Text style={[styles.customSectionLabel, { marginTop: 16 }]}>Weekly Schedule</Text>
                    {DAYS_OF_WEEK.map(day => {
                      const validNames = customNames.filter(n => n.trim())
                      const assigned = customPattern[day]
                      return (
                        <View key={day} style={styles.dayRow}>
                          <Text style={styles.dayRowLabel}>{DAY_ABBR[day]}</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPills}>
                            {[null, 'rest', ...validNames].map(opt => {
                              const label = opt === null ? 'Off' : opt === 'rest' ? 'Rest' : opt
                              const isActive = assigned === opt
                              return (
                                <TouchableOpacity
                                  key={label}
                                  style={[styles.dayPill, isActive && styles.dayPillActive]}
                                  onPress={() => setCustomPattern(prev => ({ ...prev, [day]: opt }))}
                                >
                                  <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                                    {label}
                                  </Text>
                                </TouchableOpacity>
                              )
                            })}
                          </ScrollView>
                        </View>
                      )
                    })}
                  </View>
                )}
              </TouchableOpacity>
            )
          })()}

          <View style={{ height: 24 }} />
        </ScrollView>

        {showApply && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.applyText}>
                {selected === 'custom' ? 'Apply Custom Split' : `Apply "${(selected as SplitTemplate).name}"`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  cancelText: { fontSize: 17, color: COLORS.secondaryText, minWidth: 60 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondaryText,
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '08',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  cardNameSelected: { color: COLORS.accent },
  daysBadge: {
    backgroundColor: COLORS.separator,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  daysBadgeSelected: { backgroundColor: COLORS.accent + '20' },
  daysBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.secondaryText },
  daysBadgeTextSelected: { color: COLORS.accent },
  cardDescription: { fontSize: 14, color: COLORS.secondaryText, marginBottom: 12, lineHeight: 19 },
  routineChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  routineChip: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.separator,
  },
  routineChipSelected: { borderColor: COLORS.accent + '60', backgroundColor: COLORS.accent + '10' },
  routineChipText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  routineChipTextSelected: { color: COLORS.accent },
  weekPreview: { marginTop: 14 },
  weekPreviewLabel: { fontSize: 12, fontWeight: '600', color: COLORS.secondaryText, marginBottom: 8 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4 },
  dayAbbr: { fontSize: 11, color: COLORS.secondaryText, fontWeight: '500' },
  dayDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.separator,
    alignItems: 'center', justifyContent: 'center',
  },
  dayDotActive: { backgroundColor: COLORS.accent },
  dayDotRest: { backgroundColor: COLORS.secondaryBackground },
  dayDotLabel: { fontSize: 11, fontWeight: '700', color: '#fff' },
  weekLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  legendText: { fontSize: 12, color: COLORS.secondaryText },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.separator,
  },
  applyButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  customBuilder: { marginTop: 12, gap: 8 },
  customSectionLabel: {
    fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  customInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.separator,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  addRoutineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6,
  },
  addRoutineBtnText: { fontSize: 14, color: COLORS.accent, fontWeight: '600' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dayRowLabel: { fontSize: 13, fontWeight: '600', color: COLORS.secondaryText, width: 32 },
  dayPills: { flexShrink: 1 },
  dayPill: {
    borderRadius: 14, borderWidth: 1, borderColor: COLORS.separator,
    paddingHorizontal: 10, paddingVertical: 5, marginRight: 6,
    backgroundColor: COLORS.background,
  },
  dayPillActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '15' },
  dayPillText: { fontSize: 12, fontWeight: '500', color: COLORS.secondaryText },
  dayPillTextActive: { color: COLORS.accent, fontWeight: '700' },
})

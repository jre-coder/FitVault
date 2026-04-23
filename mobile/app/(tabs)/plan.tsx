import React, { useCallback, useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRoutines } from '../../context/RoutineContext'
import { useWorkouts } from '../../context/WorkoutContext'
import { useWorkoutLogs } from '../../context/WorkoutLogContext'
import { COLORS, SOURCE_COLORS, SOURCE_ICONS } from '../../constants'
import { DayOfWeek, DAYS_OF_WEEK, DaySchedule, Routine, WorkoutItem } from '../../types'
import RoutineBuilderModal from '../../components/RoutineBuilderModal'
import WorkoutDetailModal from '../../components/WorkoutDetailModal'
import WorkoutExecutionModal from '../../components/WorkoutExecutionModal'

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const TODAY_KEY = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek

function getWeekDates(): Record<DayOfWeek, string> {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  const result = {} as Record<DayOfWeek, string>
  DAYS_OF_WEEK.forEach((day, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    result[day] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  return result
}

export default function PlanScreen() {
  const { routines, weeklySchedule, addRoutine, updateRoutine, deleteRoutine, setDaySchedule, getTodayRoutine } = useRoutines()
  const { workouts } = useWorkouts()
  const { completedDates, refreshLogs } = useWorkoutLogs()

  const [showBuilder, setShowBuilder] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | undefined>()
  const [dayPickerFor, setDayPickerFor] = useState<DayOfWeek | null>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutItem | null>(null)
  const [showExecution, setShowExecution] = useState(false)

  const weekDates = getWeekDates()
  const completedDays = new Set(
    DAYS_OF_WEEK.filter(day => completedDates.has(weekDates[day]))
  )

  const todayRoutine = getTodayRoutine()
  const todayItems = todayRoutine?.items
    .sort((a, b) => a.order - b.order)
    .map(i => workouts.find(w => w.id === i.workoutItemId))
    .filter(Boolean) as WorkoutItem[] | undefined

  function handleSaveRoutine(name: string, items: import('../../types').RoutineItem[]) {
    if (editingRoutine) {
      updateRoutine({ ...editingRoutine, name, items })
    } else {
      addRoutine({ name, items })
    }
    setEditingRoutine(undefined)
  }

  function handleDeleteRoutine(id: string) {
    Alert.alert('Delete Routine', 'Remove this routine? It will also be unscheduled from the week.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(id) },
    ])
  }

  function handleDayPress(day: DayOfWeek) {
    setDayPickerFor(day)
  }

  function handlePickRoutineForDay(value: DaySchedule) {
    if (dayPickerFor) setDaySchedule(dayPickerFor, value)
    setDayPickerFor(null)
  }

  const getRoutineForDay = useCallback((day: DayOfWeek) => {
    const val = weeklySchedule[day]
    if (!val) return null
    if (val === 'rest') return 'rest'
    return routines.find(r => r.id === val) ?? null
  }, [weeklySchedule, routines])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Plan</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setEditingRoutine(undefined); setShowBuilder(true) }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Today */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          {todayRoutine ? (
            <View style={styles.todayCard}>
              <View style={styles.todayCardHeader}>
                <Ionicons name="today-outline" size={18} color={COLORS.accent} />
                <Text style={styles.todayRoutineName}>{todayRoutine.name}</Text>
              </View>
              {todayItems && todayItems.length > 0 && (
                <TouchableOpacity
                  style={styles.startWorkoutButton}
                  onPress={() => setShowExecution(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play-circle" size={18} color="#fff" />
                  <Text style={styles.startWorkoutText}>Start Workout</Text>
                </TouchableOpacity>
              )}
              {todayItems && todayItems.length > 0 ? (
                todayItems.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.todayItem}
                    onPress={() => setSelectedWorkout(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.smallIcon, { backgroundColor: SOURCE_COLORS[item.sourceType] + '26' }]}>
                      <Ionicons name={SOURCE_ICONS[item.sourceType] as never} size={14} color={SOURCE_COLORS[item.sourceType]} />
                    </View>
                    <Text style={styles.todayItemTitle} numberOfLines={1}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.secondaryText} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyMeta}>No workouts in this routine yet</Text>
              )}
            </View>
          ) : weeklySchedule[TODAY_KEY] === 'rest' ? (
            <View style={styles.restCard}>
              <Ionicons name="moon-outline" size={28} color={COLORS.secondaryText} />
              <Text style={styles.restText}>Rest Day</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.emptyTodayCard} onPress={() => handleDayPress(TODAY_KEY)} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={28} color={COLORS.secondaryText} />
              <Text style={styles.emptyTodayText}>No workout scheduled</Text>
              <Text style={styles.emptyTodayHint}>Tap to schedule today</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Weekly schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.weekGrid}>
            {DAYS_OF_WEEK.map(day => {
              const val = getRoutineForDay(day)
              const isToday = day === TODAY_KEY
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayCell, isToday && styles.dayCellToday]}
                  onPress={() => handleDayPress(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                    {DAY_LABELS[day]}
                  </Text>
                  {completedDays.has(day) && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}
                  {val === 'rest' ? (
                    <Ionicons name="moon-outline" size={16} color={COLORS.secondaryText} />
                  ) : val ? (
                    <Text style={styles.dayCellRoutine} numberOfLines={2}>{(val as Routine).name}</Text>
                  ) : (
                    <Ionicons name="add-circle-outline" size={18} color={COLORS.secondaryText} />
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* My Routines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Routines</Text>
          {routines.length === 0 ? (
            <View style={styles.emptyRoutines}>
              <Ionicons name="list-outline" size={40} color={COLORS.secondaryText} />
              <Text style={styles.emptyRoutinesText}>No routines yet</Text>
              <Text style={styles.emptyRoutinesSub}>Tap + to build your first routine</Text>
            </View>
          ) : (
            routines.map(routine => {
              const count = routine.items.length
              return (
                <View key={routine.id} style={styles.routineRow}>
                  <View style={styles.routineInfo}>
                    <Text style={styles.routineName}>{routine.name}</Text>
                    <Text style={styles.routineMeta}>{count} workout{count !== 1 ? 's' : ''}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => { setEditingRoutine(routine); setShowBuilder(true) }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={COLORS.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteRoutine(routine.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.destructive} />
                  </TouchableOpacity>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      <RoutineBuilderModal
        visible={showBuilder}
        routine={editingRoutine}
        onClose={() => { setShowBuilder(false); setEditingRoutine(undefined) }}
        onSave={handleSaveRoutine}
      />

      {/* Day scheduler picker */}
      {dayPickerFor && (
        <Modal animationType="slide" presentationStyle="pageSheet" visible>
          <SafeAreaView style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                Schedule {DAY_LABELS[dayPickerFor]}
              </Text>
              <TouchableOpacity onPress={() => setDayPickerFor(null)}>
                <Ionicons name="close" size={24} color={COLORS.secondaryText} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.pickerOption} onPress={() => handlePickRoutineForDay(null)}>
                <Ionicons name="close-circle-outline" size={20} color={COLORS.secondaryText} />
                <Text style={styles.pickerOptionText}>Clear day</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerOption} onPress={() => handlePickRoutineForDay('rest')}>
                <Ionicons name="moon-outline" size={20} color={COLORS.secondaryText} />
                <Text style={styles.pickerOptionText}>Rest day</Text>
              </TouchableOpacity>
              <View style={styles.pickerDivider} />
              {routines.length === 0 ? (
                <Text style={styles.pickerEmpty}>No routines yet — create one first</Text>
              ) : (
                routines.map(r => {
                  const active = weeklySchedule[dayPickerFor] === r.id
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.pickerOption, active && styles.pickerOptionActive]}
                      onPress={() => handlePickRoutineForDay(r.id)}
                    >
                      <Ionicons name="list-outline" size={20} color={active ? COLORS.accent : COLORS.text} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerOptionText, active && { color: COLORS.accent }]}>{r.name}</Text>
                        <Text style={styles.pickerOptionMeta}>{r.items.length} workout{r.items.length !== 1 ? 's' : ''}</Text>
                      </View>
                      {active && <Ionicons name="checkmark" size={18} color={COLORS.accent} />}
                    </TouchableOpacity>
                  )
                })
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {selectedWorkout && (
        <WorkoutDetailModal workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />
      )}

      {showExecution && todayRoutine && (
        <WorkoutExecutionModal
          visible={showExecution}
          routine={todayRoutine}
          workouts={workouts}
          onClose={() => { setShowExecution(false); refreshLogs() }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 32, fontWeight: '800', color: COLORS.text },
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { paddingHorizontal: 16, marginBottom: 28 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  todayCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14, padding: 14, gap: 2,
  },
  todayCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  todayRoutineName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  todayItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: COLORS.separator,
  },
  smallIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  todayItemTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  emptyMeta: { fontSize: 13, color: COLORS.secondaryText, paddingTop: 8 },
  restCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14, padding: 24,
    alignItems: 'center', gap: 8,
  },
  restText: { fontSize: 17, fontWeight: '600', color: COLORS.secondaryText },
  emptyTodayCard: {
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14, padding: 24,
    alignItems: 'center', gap: 6,
  },
  emptyTodayText: { fontSize: 16, fontWeight: '600', color: COLORS.secondaryText },
  emptyTodayHint: { fontSize: 13, color: COLORS.accent },
  weekGrid: { flexDirection: 'row', gap: 6 },
  dayCell: {
    flex: 1, backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10, padding: 8, alignItems: 'center', gap: 6, minHeight: 72,
  },
  dayCellToday: { borderWidth: 1.5, borderColor: COLORS.accent },
  dayLabel: { fontSize: 12, fontWeight: '600', color: COLORS.secondaryText },
  dayLabelToday: { color: COLORS.accent },
  dayCellRoutine: { fontSize: 10, fontWeight: '500', color: COLORS.text, textAlign: 'center' },
  routineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.separator,
  },
  routineInfo: { flex: 1 },
  routineName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  routineMeta: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  editBtn: { padding: 8 },
  deleteBtn: { padding: 8 },
  emptyRoutines: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyRoutinesText: { fontSize: 17, fontWeight: '600', color: COLORS.secondaryText },
  emptyRoutinesSub: { fontSize: 14, color: COLORS.secondaryText },
  pickerContainer: { flex: 1, backgroundColor: COLORS.background },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.separator,
  },
  pickerTitle: { fontSize: 17, fontWeight: '600' },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.separator,
  },
  pickerOptionActive: { backgroundColor: COLORS.accent + '0D' },
  pickerOptionText: { fontSize: 16, color: COLORS.text, flex: 1 },
  pickerOptionMeta: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },
  pickerDivider: { height: 8, backgroundColor: COLORS.secondaryBackground },
  pickerEmpty: { padding: 24, textAlign: 'center', color: COLORS.secondaryText, fontSize: 14 },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  startWorkoutText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  completedBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#34C759',
    alignItems: 'center', justifyContent: 'center',
  },
})

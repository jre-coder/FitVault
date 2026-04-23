import React, { useCallback, useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useWorkouts } from '../context/WorkoutContext'
import { BODY_PARTS, COLORS, SOURCE_COLORS, SOURCE_ICONS } from '../constants'
import { BodyPart, Routine, RoutineItem, WorkoutItem } from '../types'

interface Props {
  visible: boolean
  routine?: Routine
  onClose: () => void
  onSave: (name: string, items: RoutineItem[]) => void
}

export default function RoutineBuilderModal({ visible, routine, onClose, onSave }: Props) {
  const { workouts } = useWorkouts()
  const [name, setName] = useState(routine?.name ?? '')
  const [selectedIds, setSelectedIds] = useState<string[]>(
    routine?.items.sort((a, b) => a.order - b.order).map(i => i.workoutItemId) ?? []
  )
  const [search, setSearch] = useState('')
  const [bodyPartFilter, setBodyPartFilter] = useState<BodyPart | null>(null)
  const [nameError, setNameError] = useState(false)

  const filtered = useMemo(() => {
    let result = workouts
    if (bodyPartFilter) result = result.filter(w => w.bodyParts.includes(bodyPartFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(w => w.title.toLowerCase().includes(q))
    }
    return result
  }, [workouts, search, bodyPartFilter])

  function toggleItem(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleSave() {
    if (!name.trim()) { setNameError(true); return }
    const items: RoutineItem[] = selectedIds.map((id, order) => ({ workoutItemId: id, order }))
    onSave(name.trim(), items)
    handleClose()
  }

  function handleClose() {
    setName(routine?.name ?? '')
    setSelectedIds(routine?.items.sort((a, b) => a.order - b.order).map(i => i.workoutItemId) ?? [])
    setSearch('')
    setBodyPartFilter(null)
    setNameError(false)
    onClose()
  }

  const renderWorkout = useCallback(({ item }: { item: WorkoutItem }) => {
    const selected = selectedIds.includes(item.id)
    const color = SOURCE_COLORS[item.sourceType]
    const icon = SOURCE_ICONS[item.sourceType]
    return (
      <TouchableOpacity
        style={[styles.workoutRow, selected && styles.workoutRowSelected]}
        onPress={() => toggleItem(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: color + '26' }]}>
          <Ionicons name={icon as never} size={18} color={color} />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {item.bodyParts.slice(0, 2).join(', ')}
          </Text>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />}
      </TouchableOpacity>
    )
  }, [selectedIds])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{routine ? 'Edit Routine' : 'New Routine'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nameSection}>
          <TextInput
            style={[styles.nameInput, nameError && styles.nameInputError]}
            value={name}
            onChangeText={t => { setName(t); setNameError(false) }}
            placeholder="Routine name (e.g. Glute Day)"
            placeholderTextColor={COLORS.secondaryText}
          />
          {nameError && <Text style={styles.errorText}>Please enter a routine name</Text>}
        </View>

        {selectedIds.length > 0 && (
          <View style={styles.selectedBar}>
            <Ionicons name="list-outline" size={14} color={COLORS.accent} />
            <Text style={styles.selectedCount}>
              {selectedIds.length} workout{selectedIds.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={COLORS.secondaryText} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search your library…"
            placeholderTextColor={COLORS.secondaryText}
          />
        </View>

        <FlatList
          data={[null, ...BODY_PARTS]}
          horizontal
          keyExtractor={item => item ?? 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterStrip}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, bodyPartFilter === item && styles.filterChipActive]}
              onPress={() => setBodyPartFilter(item)}
            >
              <Text style={[styles.filterChipText, bodyPartFilter === item && styles.filterChipTextActive]}>
                {item ?? 'All'}
              </Text>
            </TouchableOpacity>
          )}
        />

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderWorkout}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No workouts match</Text>
            </View>
          }
        />
      </View>
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
  cancelText: { fontSize: 17, color: COLORS.secondaryText, minWidth: 60 },
  saveText: { fontSize: 17, fontWeight: '600', color: COLORS.accent, minWidth: 60, textAlign: 'right' },
  nameSection: { padding: 16, paddingBottom: 8 },
  nameInput: {
    borderWidth: 0.5,
    borderColor: COLORS.separator,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  nameInputError: { borderColor: COLORS.destructive },
  errorText: { fontSize: 12, color: COLORS.destructive, marginTop: 4 },
  selectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selectedCount: { fontSize: 13, color: COLORS.accent, fontWeight: '500' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  filterStrip: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.secondaryBackground,
  },
  filterChipActive: { backgroundColor: COLORS.accent },
  filterChipText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  list: { paddingBottom: 32 },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.separator,
  },
  workoutRowSelected: { backgroundColor: COLORS.accent + '0D' },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  rowMeta: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: COLORS.secondaryText, fontSize: 15 },
})

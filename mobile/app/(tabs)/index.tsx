import React, { useCallback, useMemo, useState } from 'react'
import {
  ActionSheetIOS,
  FlatList,
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
import { BODY_PARTS, COLORS } from '../../constants'
import { useWorkouts } from '../../context/WorkoutContext'
import { BodyPart, WorkoutItem } from '../../types'
import AddWorkoutModal from '../../components/AddWorkoutModal'
import PhotoImportModal from '../../components/PhotoImportModal'
import WorkoutDetailModal from '../../components/WorkoutDetailModal'
import FilterChip from '../../components/FilterChip'
import WorkoutRow from '../../components/WorkoutRow'

export default function MyWorkoutsScreen() {
  const { workouts, addWorkout } = useWorkouts()
  const [searchText, setSearchText] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<BodyPart | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showPhotoImport, setShowPhotoImport] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutItem | null>(null)

  const filteredWorkouts = useMemo(() => {
    let result = workouts
    if (selectedFilter) {
      result = result.filter((w) => w.bodyParts.includes(selectedFilter))
    }
    if (searchText.trim()) {
      const lower = searchText.toLowerCase()
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(lower) ||
          w.url.toLowerCase().includes(lower) ||
          w.notes.toLowerCase().includes(lower),
      )
    }
    return result
  }, [workouts, selectedFilter, searchText])

  const handleSelectFilter = useCallback((part: BodyPart | null) => {
    setSelectedFilter(part)
  }, [])

  const handleSelectWorkout = useCallback((workout: WorkoutItem) => {
    setSelectedWorkout(workout)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedWorkout(null)
  }, [])

  const handleOpenAdd = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Add Link', 'Import from Photos'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) setShowAdd(true)
          if (index === 2) setShowPhotoImport(true)
        }
      )
    } else {
      setShowAdd(true)
    }
  }, [])

  const handleCloseAdd = useCallback(() => {
    setShowAdd(false)
  }, [])

  const handlePhotoSave = useCallback(
    (data: Omit<WorkoutItem, 'id' | 'dateAdded' | 'isFavorite'>) => {
      addWorkout({ ...data, isFavorite: false })
      setShowPhotoImport(false)
    },
    [addWorkout]
  )

  const renderItem: ListRenderItem<WorkoutItem> = useCallback(
    ({ item }) => <WorkoutRow workout={item} onPress={() => handleSelectWorkout(item)} />,
    [handleSelectWorkout],
  )

  const keyExtractor = useCallback((item: WorkoutItem) => item.id, [])

  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FitVault</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={COLORS.secondaryText} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search workouts..."
          placeholderTextColor={COLORS.secondaryText}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={COLORS.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScroll}
        style={styles.filtersContainer}
      >
        <FilterChip
          label="All"
          isSelected={selectedFilter === null}
          onPress={() => handleSelectFilter(null)}
        />
        {BODY_PARTS.map((part) => (
          <FilterChip
            key={part}
            label={part}
            isSelected={selectedFilter === part}
            onPress={() => handleSelectFilter(part)}
          />
        ))}
      </ScrollView>

      {filteredWorkouts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="barbell-outline" size={60} color={COLORS.secondaryText} />
          {workouts.length === 0 ? (
            <>
              <Text style={styles.emptyTitle}>No Workouts Yet</Text>
              <Text style={styles.emptySubtitle}>Save your favorite workout links to get started</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleOpenAdd} activeOpacity={0.8}>
                <Text style={styles.emptyButtonText}>Add First Workout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>No Results</Text>
              <Text style={styles.emptySubtitle}>Try a different search or filter</Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredWorkouts}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AddWorkoutModal visible={showAdd} onClose={handleCloseAdd} />

      <PhotoImportModal
        visible={showPhotoImport}
        onClose={() => setShowPhotoImport(false)}
        onSave={handlePhotoSave}
      />

      {selectedWorkout && (
        <WorkoutDetailModal workout={selectedWorkout} onClose={handleCloseDetail} />
      )}
    </SafeAreaView>
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
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
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
  emptyButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
})

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SOURCE_COLORS, SOURCE_ICONS } from '../constants'
import { WorkoutItem } from '../types'

interface WorkoutRowProps {
  workout: WorkoutItem
  onPress: () => void
}

export default function WorkoutRow({ workout, onPress }: WorkoutRowProps) {
  const sourceColor = SOURCE_COLORS[workout.sourceType]
  const sourceIcon = SOURCE_ICONS[workout.sourceType]
  const displayedBodyParts = workout.bodyParts.slice(0, 3)
  const overflow = workout.bodyParts.length - 3

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBox, { backgroundColor: sourceColor + '26' }]}>
        <Ionicons name={sourceIcon as never} size={22} color={sourceColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {workout.title}
          </Text>
          {workout.isFavorite && (
            <Ionicons name="star" size={14} color="#FFD700" style={styles.star} />
          )}
        </View>
        <View style={styles.chipsRow}>
          {displayedBodyParts.map((part) => (
            <View key={part} style={styles.chip}>
              <Text style={styles.chipText}>{part}</Text>
            </View>
          ))}
          {overflow > 0 && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>+{overflow}</Text>
            </View>
          )}
        </View>
        <Text style={styles.url} numberOfLines={1}>
          {workout.url}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.secondaryText} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  star: {
    flexShrink: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    backgroundColor: COLORS.secondaryBackground,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.secondaryText,
    fontWeight: '500',
  },
  url: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
})

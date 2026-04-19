import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BODY_PART_ICONS, COLORS } from '../constants'
import { BodyPart } from '../types'

interface BodyPartCardProps {
  bodyPart: BodyPart
  count: number
  onPress: () => void
}

export default function BodyPartCard({ bodyPart, count, onPress }: BodyPartCardProps) {
  const icon = BODY_PART_ICONS[bodyPart]

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as never} size={32} color={COLORS.accent} />
      <Text style={styles.name}>{bodyPart}</Text>
      <Text style={styles.count}>
        {count} {count === 1 ? 'workout' : 'workouts'}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    margin: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  count: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
})

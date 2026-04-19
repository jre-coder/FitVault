import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import { AIWorkoutSuggestion } from '../types'

interface AIResultRowProps {
  result: AIWorkoutSuggestion
  onSave: () => void
  onPress: () => void
}

function rankColor(rank: number): string {
  if (rank === 1) return '#FFD700'
  if (rank === 2) return '#C0C0C0'
  if (rank === 3) return '#CD7F32'
  return COLORS.accent
}

export default function AIResultRow({ result, onSave, onPress }: AIResultRowProps) {
  const badgeColor = rankColor(result.rank)

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.rankText}>{result.rank}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {result.title}
        </Text>
        {result.creator ? (
          <Text style={styles.creator} numberOfLines={1}>{result.creator}</Text>
        ) : null}
        <Text style={styles.meta}>
          {result.platform} · {result.difficulty} · {result.durationMinutes} min
        </Text>
        <Text style={styles.explanation} numberOfLines={2}>
          {result.explanation}
        </Text>
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="add-circle" size={28} color={COLORS.accent} />
      </TouchableOpacity>
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
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  creator: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.accent,
  },
  meta: {
    fontSize: 12,
    color: COLORS.secondaryText,
    textTransform: 'capitalize',
  },
  explanation: {
    fontSize: 13,
    color: COLORS.secondaryText,
  },
  saveButton: {
    flexShrink: 0,
  },
})

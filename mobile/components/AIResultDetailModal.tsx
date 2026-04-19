import React, { useCallback } from 'react'
import {
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import { AIWorkoutSuggestion } from '../types'
import { safeURL } from '../services/claudeService'

interface AIResultDetailModalProps {
  result: AIWorkoutSuggestion
  onSave: () => void
  onClose: () => void
}

function rankColor(rank: number): string {
  if (rank === 1) return '#FFD700'
  if (rank === 2) return '#C0C0C0'
  if (rank === 3) return '#CD7F32'
  return COLORS.accent
}

export default function AIResultDetailModal({ result, onSave, onClose }: AIResultDetailModalProps) {
  const badgeColor = rankColor(result.rank)

  const handleOpenLink = useCallback(() => {
    Linking.openURL(safeURL(result))
  }, [result])

  const handleSave = useCallback(() => {
    onSave()
    onClose()
  }, [onSave, onClose])

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerCard}>
            <View style={[styles.rankBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.rankText}>{result.rank}</Text>
            </View>
            <Text style={styles.title}>{result.title}</Text>
            {result.creator ? (
              <Text style={styles.creator}>{result.creator}</Text>
            ) : null}
            <Text style={styles.meta}>
              {result.platform} · {result.durationMinutes} min
            </Text>
          </View>

          <TouchableOpacity style={styles.openLinkButton} onPress={handleOpenLink} activeOpacity={0.8}>
            <Ionicons name="open-outline" size={18} color="#FFFFFF" />
            <Text style={styles.openLinkText}>Open Link</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={16} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Why We Recommend This</Text>
            </View>
            <Text style={styles.bodyText}>{result.explanation}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bodyText}>{result.description}</Text>
          </View>

          {result.targetMuscles.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Target Muscles</Text>
              <View style={styles.chipsWrap}>
                {result.targetMuscles.map((muscle) => (
                  <View key={muscle} style={styles.chip}>
                    <Text style={styles.chipText}>{muscle}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.difficultyRow}>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{result.difficulty}</Text>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            AI-generated recommendations. Results may vary. Always consult a fitness professional before starting a new workout program.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  headerCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  creator: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.accent,
    textAlign: 'center',
  },
  meta: {
    fontSize: 14,
    color: COLORS.secondaryText,
    textTransform: 'capitalize',
  },
  openLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  openLinkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.secondaryBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  difficultyRow: {
    flexDirection: 'row',
  },
  difficultyBadge: {
    backgroundColor: COLORS.accent + '1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.secondaryText,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
})

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import { extractDomain } from '../services/clipboardService'

interface ClipboardBannerProps {
  url: string
  onAdd: () => void
  onDismiss: () => void
}

export default function ClipboardBanner({ url, onAdd, onDismiss }: ClipboardBannerProps) {
  const domain = extractDomain(url) ?? url

  return (
    <View style={styles.container}>
      <Ionicons name="clipboard-outline" size={18} color={COLORS.accent} style={styles.icon} />
      <View style={styles.textGroup}>
        <Text style={styles.label}>Copied link detected</Text>
        <Text style={styles.domain} numberOfLines={1}>{domain}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={onAdd}>
        <Text style={styles.addText}>Add</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={18} color={COLORS.secondaryText} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryBackground,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    flexShrink: 0,
  },
  textGroup: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
  domain: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    padding: 2,
  },
})

import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { COLORS } from '../constants'

interface FilterChipProps {
  label: string
  isSelected: boolean
  onPress: () => void
}

export default function FilterChip({ label, isSelected, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, isSelected ? styles.labelSelected : styles.labelUnselected]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipSelected: {
    backgroundColor: COLORS.accent,
  },
  chipUnselected: {
    backgroundColor: COLORS.secondaryBackground,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
  labelUnselected: {
    color: COLORS.text,
  },
})

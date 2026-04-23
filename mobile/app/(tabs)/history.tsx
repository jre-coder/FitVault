import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../constants'
import { useWorkoutLogs } from '../../context/WorkoutLogContext'
import { WorkoutLog } from '../../types'

function formatDuration(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDateLabel(isoString: string): string {
  const date = new Date(isoString)
  const today = new Date()
  const diffDays = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
    86400000
  )
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface StatCardProps {
  icon: string
  value: string
  label: string
  color?: string
}

function StatCard({ icon, value, label, color = COLORS.accent }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statIcon]}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function LogEntry({ log }: { log: WorkoutLog }) {
  return (
    <View style={styles.logRow}>
      <View style={styles.logLeft}>
        <Text style={styles.logDate}>{formatDateLabel(log.completedAt)}</Text>
        <Text style={styles.logName}>{log.routineName}</Text>
      </View>
      <View style={styles.logRight}>
        <Text style={styles.logDuration}>{formatDuration(log.durationSeconds)}</Text>
        <Text style={styles.logSets}>{log.totalSetsLogged} {log.totalSetsLogged === 1 ? 'set' : 'sets'}</Text>
      </View>
    </View>
  )
}

export default function HistoryScreen() {
  const { logs, stats } = useWorkoutLogs()

  const weekTime = formatDuration(stats.weeklyDurationSeconds)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="🔥"
            value={String(stats.currentStreak)}
            label="day streak"
            color="#FF9500"
          />
          <StatCard
            icon="⏱"
            value={weekTime}
            label="this week"
          />
          <StatCard
            icon="💪"
            value={String(stats.weeklySets)}
            label="sets this week"
          />
          <StatCard
            icon="🏆"
            value={String(stats.allTimeCount)}
            label="all-time"
            color="#AF52DE"
          />
        </View>

        {/* Log list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Past Workouts</Text>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={COLORS.secondaryText} />
              <Text style={styles.emptyTitle}>No workouts yet</Text>
              <Text style={styles.emptySubtitle}>Complete your first one to start your streak!</Text>
            </View>
          ) : (
            logs.map(log => <LogEntry key={log.id} log={log} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 32, fontWeight: '800', color: COLORS.text },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.secondaryBackground,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 28, fontWeight: '800', color: COLORS.accent },
  statLabel: { fontSize: 13, color: COLORS.secondaryText, fontWeight: '500' },

  section: { paddingHorizontal: 16, marginTop: 12, marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.separator,
  },
  logLeft: { flex: 1 },
  logDate: { fontSize: 13, fontWeight: '600', color: COLORS.secondaryText, marginBottom: 2 },
  logName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  logRight: { alignItems: 'flex-end', gap: 2 },
  logDuration: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  logSets: { fontSize: 12, color: COLORS.secondaryText },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.secondaryText },
  emptySubtitle: { fontSize: 14, color: COLORS.secondaryText, textAlign: 'center' },
})

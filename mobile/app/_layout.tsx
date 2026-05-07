import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SubscriptionProvider } from '../context/SubscriptionContext'
import { WorkoutProvider } from '../context/WorkoutContext'
import { RoutineProvider } from '../context/RoutineContext'
import { WorkoutLogProvider } from '../context/WorkoutLogContext'
import { ProfileProvider } from '../context/ProfileContext'
import { useClipboardDetection } from '../hooks/useClipboardDetection'
import { usePendingShareItems } from '../hooks/usePendingShareItems'
import ClipboardBanner from '../components/ClipboardBanner'
import ShareToast from '../components/ShareToast'
import AddWorkoutModal from '../components/AddWorkoutModal'

function AppShell() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { pendingURL, dismiss } = useClipboardDetection()
  const { recentlyAddedCount, clearRecentCount } = usePendingShareItems()
  const [addModalURL, setAddModalURL] = useState<string | null>(null)

  useEffect(() => {
    if (recentlyAddedCount > 0) {
      router.navigate('/')
    }
  }, [recentlyAddedCount, router])

  function handleClipboardAdd() {
    setAddModalURL(pendingURL)
    dismiss()
  }

  function handleModalClose() {
    setAddModalURL(null)
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      {pendingURL ? (
        <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 100 }}>
          <ClipboardBanner url={pendingURL} onAdd={handleClipboardAdd} onDismiss={dismiss} />
        </View>
      ) : null}
      {recentlyAddedCount > 0 ? (
        <View style={{ position: 'absolute', bottom: 90, left: 0, right: 0, zIndex: 100 }}>
          <ShareToast count={recentlyAddedCount} onDismiss={clearRecentCount} />
        </View>
      ) : null}
      <AddWorkoutModal
        visible={addModalURL !== null}
        onClose={handleModalClose}
        initialURL={addModalURL ?? undefined}
      />
      <StatusBar style="auto" />
    </View>
  )
}

export default function RootLayout() {
  return (
    <SubscriptionProvider>
      <WorkoutProvider>
        <RoutineProvider>
          <WorkoutLogProvider>
            <ProfileProvider>
              <AppShell />
            </ProfileProvider>
          </WorkoutLogProvider>
        </RoutineProvider>
      </WorkoutProvider>
    </SubscriptionProvider>
  )
}

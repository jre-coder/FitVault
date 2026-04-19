import React, { useState } from 'react'
import { View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SubscriptionProvider } from '../context/SubscriptionContext'
import { WorkoutProvider } from '../context/WorkoutContext'
import { useClipboardDetection } from '../hooks/useClipboardDetection'
import ClipboardBanner from '../components/ClipboardBanner'
import AddWorkoutModal from '../components/AddWorkoutModal'

function AppShell() {
  const insets = useSafeAreaInsets()
  const { pendingURL, dismiss } = useClipboardDetection()
  const [addModalURL, setAddModalURL] = useState<string | null>(null)

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
        <AppShell />
      </WorkoutProvider>
    </SubscriptionProvider>
  )
}

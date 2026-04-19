import React from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SubscriptionProvider } from '../context/SubscriptionContext'
import { WorkoutProvider } from '../context/WorkoutContext'

export default function RootLayout() {
  return (
    <SubscriptionProvider>
      <WorkoutProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </WorkoutProvider>
    </SubscriptionProvider>
  )
}

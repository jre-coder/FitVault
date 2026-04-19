import { useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { isWorkoutURL } from '../services/clipboardService'

export function useClipboardDetection() {
  const [pendingURL, setPendingURL] = useState<string | null>(null)
  const dismissedURLs = useRef<Set<string>>(new Set())
  const appState = useRef(AppState.currentState)

  async function checkClipboard() {
    try {
      const text = await Clipboard.getStringAsync()
      const trimmed = text?.trim() ?? ''
      if (isWorkoutURL(trimmed) && !dismissedURLs.current.has(trimmed)) {
        setPendingURL(trimmed)
      }
    } catch {
      // clipboard access denied — ignore silently
    }
  }

  function dismiss() {
    if (pendingURL) {
      dismissedURLs.current.add(pendingURL)
    }
    setPendingURL(null)
  }

  useEffect(() => {
    checkClipboard()

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        checkClipboard()
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, [])

  return { pendingURL, dismiss }
}

import { useEffect, useCallback, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useWorkouts } from '../context/WorkoutContext'
import { readPendingShareItems, clearPendingShareItems } from '../services/shareExtensionStorage'

interface UsePendingShareItemsResult {
  recentlyAddedCount: number
  clearRecentCount: () => void
}

export function usePendingShareItems(): UsePendingShareItemsResult {
  const { addWorkout } = useWorkouts()
  const isProcessing = useRef(false)
  const [recentlyAddedCount, setRecentlyAddedCount] = useState(0)

  const processPending = useCallback(async () => {
    console.log('[usePendingShareItems] processPending called, isProcessing:', isProcessing.current)
    if (isProcessing.current) return
    isProcessing.current = true
    try {
      const items = await readPendingShareItems()
      console.log('[usePendingShareItems] items found:', items.length)
      if (items.length === 0) return
      const valid = items.filter((item) => item.url.trim().length > 0)
      for (const item of valid) {
        addWorkout({
          title: item.title,
          url: item.url,
          sourceType: item.sourceType,
          bodyParts: item.bodyParts.length > 0 ? item.bodyParts : ['Full Body'],
          notes: item.notes,
          isFavorite: false,
        })
      }
      await clearPendingShareItems()
      if (valid.length > 0) {
        setRecentlyAddedCount((prev) => prev + valid.length)
      }
    } finally {
      isProcessing.current = false
    }
  }, [addWorkout])

  useEffect(() => {
    processPending()
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') processPending()
    })
    return () => sub.remove()
  }, [processPending])

  return { recentlyAddedCount, clearRecentCount: () => setRecentlyAddedCount(0) }
}

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWorkoutTimerOptions {
  restDuration?: number
}

interface UseWorkoutTimerReturn {
  stopwatchSeconds: number
  isStopwatchRunning: boolean
  startStopwatch: () => void
  pauseStopwatch: () => void
  resetStopwatch: () => void
  restSecondsRemaining: number
  isRestActive: boolean
  startRest: () => void
  cancelRest: () => void
  onRestComplete: (cb: () => void) => void
}

export function useWorkoutTimer(
  { restDuration = 90 }: UseWorkoutTimerOptions = {}
): UseWorkoutTimerReturn {
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false)
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(0)
  const [isRestActive, setIsRestActive] = useState(false)

  const stopwatchInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const restInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const restCompleteCallback = useRef<(() => void) | null>(null)

  const startStopwatch = useCallback(() => {
    if (stopwatchInterval.current) return
    setIsStopwatchRunning(true)
    stopwatchInterval.current = setInterval(() => {
      setStopwatchSeconds(s => s + 1)
    }, 1000)
  }, [])

  const pauseStopwatch = useCallback(() => {
    if (stopwatchInterval.current) {
      clearInterval(stopwatchInterval.current)
      stopwatchInterval.current = null
    }
    setIsStopwatchRunning(false)
  }, [])

  const resetStopwatch = useCallback(() => {
    if (stopwatchInterval.current) {
      clearInterval(stopwatchInterval.current)
      stopwatchInterval.current = null
    }
    setIsStopwatchRunning(false)
    setStopwatchSeconds(0)
  }, [])

  const cancelRest = useCallback(() => {
    if (restInterval.current) {
      clearInterval(restInterval.current)
      restInterval.current = null
    }
    setIsRestActive(false)
    setRestSecondsRemaining(0)
  }, [])

  const startRest = useCallback(() => {
    if (restInterval.current) {
      clearInterval(restInterval.current)
      restInterval.current = null
    }
    setRestSecondsRemaining(restDuration)
    setIsRestActive(true)
    restInterval.current = setInterval(() => {
      setRestSecondsRemaining(s => {
        if (s <= 1) {
          clearInterval(restInterval.current!)
          restInterval.current = null
          setIsRestActive(false)
          restCompleteCallback.current?.()
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [restDuration])

  const onRestComplete = useCallback((cb: () => void) => {
    restCompleteCallback.current = cb
  }, [])

  useEffect(() => {
    return () => {
      if (stopwatchInterval.current) clearInterval(stopwatchInterval.current)
      if (restInterval.current) clearInterval(restInterval.current)
    }
  }, [])

  return {
    stopwatchSeconds,
    isStopwatchRunning,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    restSecondsRemaining,
    isRestActive,
    startRest,
    cancelRest,
    onRestComplete,
  }
}

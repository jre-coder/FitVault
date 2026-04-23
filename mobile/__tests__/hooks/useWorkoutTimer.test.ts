import { act, renderHook } from '@testing-library/react-native'
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer'

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('useWorkoutTimer', () => {
  describe('stopwatch', () => {
    it('starts at 0 and not running', () => {
      const { result } = renderHook(() => useWorkoutTimer())
      expect(result.current.stopwatchSeconds).toBe(0)
      expect(result.current.isStopwatchRunning).toBe(false)
    })

    it('increments stopwatchSeconds each second after startStopwatch', () => {
      const { result } = renderHook(() => useWorkoutTimer())
      act(() => { result.current.startStopwatch() })
      act(() => { jest.advanceTimersByTime(3000) })
      expect(result.current.stopwatchSeconds).toBe(3)
      expect(result.current.isStopwatchRunning).toBe(true)
    })

    it('pauseStopwatch stops incrementing without resetting', () => {
      const { result } = renderHook(() => useWorkoutTimer())
      act(() => { result.current.startStopwatch() })
      act(() => { jest.advanceTimersByTime(2000) })
      act(() => { result.current.pauseStopwatch() })
      act(() => { jest.advanceTimersByTime(3000) })
      expect(result.current.stopwatchSeconds).toBe(2)
      expect(result.current.isStopwatchRunning).toBe(false)
    })

    it('resetStopwatch resets to 0 and stops', () => {
      const { result } = renderHook(() => useWorkoutTimer())
      act(() => { result.current.startStopwatch() })
      act(() => { jest.advanceTimersByTime(5000) })
      act(() => { result.current.resetStopwatch() })
      expect(result.current.stopwatchSeconds).toBe(0)
      expect(result.current.isStopwatchRunning).toBe(false)
      act(() => { jest.advanceTimersByTime(2000) })
      expect(result.current.stopwatchSeconds).toBe(0)
    })

    it('startStopwatch while already running is a no-op (no double counting)', () => {
      const { result } = renderHook(() => useWorkoutTimer())
      act(() => { result.current.startStopwatch() })
      act(() => { result.current.startStopwatch() })
      act(() => { jest.advanceTimersByTime(3000) })
      expect(result.current.stopwatchSeconds).toBe(3)
    })

    it('resumes from paused position after startStopwatch again', () => {
      const { result } = renderHook(() => useWorkoutTimer())
      act(() => { result.current.startStopwatch() })
      act(() => { jest.advanceTimersByTime(3000) })
      act(() => { result.current.pauseStopwatch() })
      act(() => { result.current.startStopwatch() })
      act(() => { jest.advanceTimersByTime(2000) })
      expect(result.current.stopwatchSeconds).toBe(5)
    })
  })

  describe('rest countdown', () => {
    it('starts with 0 remaining and not active', () => {
      const { result } = renderHook(() => useWorkoutTimer())
      expect(result.current.restSecondsRemaining).toBe(0)
      expect(result.current.isRestActive).toBe(false)
    })

    it('startRest sets countdown to restDuration and marks active', () => {
      const { result } = renderHook(() => useWorkoutTimer({ restDuration: 90 }))
      act(() => { result.current.startRest() })
      expect(result.current.restSecondsRemaining).toBe(90)
      expect(result.current.isRestActive).toBe(true)
    })

    it('decrements restSecondsRemaining each second', () => {
      const { result } = renderHook(() => useWorkoutTimer({ restDuration: 90 }))
      act(() => { result.current.startRest() })
      act(() => { jest.advanceTimersByTime(5000) })
      expect(result.current.restSecondsRemaining).toBe(85)
    })

    it('fires onRestComplete callback and deactivates when countdown reaches 0', () => {
      const onComplete = jest.fn()
      const { result } = renderHook(() => useWorkoutTimer({ restDuration: 3 }))
      act(() => { result.current.onRestComplete(onComplete) })
      act(() => { result.current.startRest() })
      act(() => { jest.advanceTimersByTime(3000) })
      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(result.current.isRestActive).toBe(false)
      expect(result.current.restSecondsRemaining).toBe(0)
    })

    it('cancelRest stops countdown and resets to 0', () => {
      const { result } = renderHook(() => useWorkoutTimer({ restDuration: 90 }))
      act(() => { result.current.startRest() })
      act(() => { jest.advanceTimersByTime(10000) })
      act(() => { result.current.cancelRest() })
      expect(result.current.restSecondsRemaining).toBe(0)
      expect(result.current.isRestActive).toBe(false)
      act(() => { jest.advanceTimersByTime(5000) })
      expect(result.current.restSecondsRemaining).toBe(0)
    })

    it('startRest while active resets to restDuration', () => {
      const { result } = renderHook(() => useWorkoutTimer({ restDuration: 10 }))
      act(() => { result.current.startRest() })
      act(() => { jest.advanceTimersByTime(5000) })
      act(() => { result.current.startRest() })
      expect(result.current.restSecondsRemaining).toBe(10)
    })

    it('does not fire onRestComplete when cancelled before reaching 0', () => {
      const onComplete = jest.fn()
      const { result } = renderHook(() => useWorkoutTimer({ restDuration: 5 }))
      act(() => { result.current.onRestComplete(onComplete) })
      act(() => { result.current.startRest() })
      act(() => { jest.advanceTimersByTime(3000) })
      act(() => { result.current.cancelRest() })
      act(() => { jest.advanceTimersByTime(5000) })
      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('clears intervals on unmount without errors', () => {
      const { result, unmount } = renderHook(() => useWorkoutTimer())
      act(() => {
        result.current.startStopwatch()
        result.current.startRest()
      })
      expect(() => unmount()).not.toThrow()
    })
  })
})

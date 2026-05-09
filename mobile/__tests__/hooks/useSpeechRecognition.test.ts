import { act, renderHook } from '@testing-library/react-native'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'

// --- Mock @react-native-voice/voice ---
// mockVoice is built inside the factory (avoids TDZ from jest.mock hoisting)
// then exposed via the module-level reference so tests can interact with it.

type VoiceMock = {
  start: jest.Mock
  stop: jest.Mock
  cancel: jest.Mock
  destroy: jest.Mock
  isAvailable: jest.Mock
  removeAllListeners: jest.Mock
  onSpeechStart: ((e: unknown) => void) | undefined
  onSpeechEnd: ((e: unknown) => void) | undefined
  onSpeechResults: ((e: unknown) => void) | undefined
  onSpeechPartialResults: ((e: unknown) => void) | undefined
  onSpeechError: ((e: unknown) => void) | undefined
}

let mockVoice: VoiceMock

jest.mock('@react-native-voice/voice', () => {
  const v: VoiceMock = {
    start: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    destroy: jest.fn(),
    isAvailable: jest.fn(),
    removeAllListeners: jest.fn(),
    onSpeechStart: undefined,
    onSpeechEnd: undefined,
    onSpeechResults: undefined,
    onSpeechPartialResults: undefined,
    onSpeechError: undefined,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).__mockVoice = v
  return { __esModule: true, default: v }
})

function fireVoiceEvent(event: keyof VoiceMock, payload: unknown) {
  const handler = mockVoice[event] as ((p: unknown) => void) | undefined
  if (handler) handler(payload)
}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockVoice = (global as any).__mockVoice
  jest.clearAllMocks()
  mockVoice.start.mockResolvedValue(undefined)
  mockVoice.stop.mockResolvedValue(undefined)
  mockVoice.cancel.mockResolvedValue(undefined)
  mockVoice.destroy.mockResolvedValue(undefined)
  mockVoice.isAvailable.mockResolvedValue(1)
  mockVoice.onSpeechStart = undefined
  mockVoice.onSpeechEnd = undefined
  mockVoice.onSpeechResults = undefined
  mockVoice.onSpeechPartialResults = undefined
  mockVoice.onSpeechError = undefined
})

describe('useSpeechRecognition', () => {
  describe('initial state', () => {
    it('isListening starts as false', () => {
      const { result } = renderHook(() => useSpeechRecognition())
      expect(result.current.isListening).toBe(false)
    })

    it('transcript starts as empty string', () => {
      const { result } = renderHook(() => useSpeechRecognition())
      expect(result.current.transcript).toBe('')
    })

    it('partialTranscript starts as empty string', () => {
      const { result } = renderHook(() => useSpeechRecognition())
      expect(result.current.partialTranscript).toBe('')
    })

    it('error starts as null', () => {
      const { result } = renderHook(() => useSpeechRecognition())
      expect(result.current.error).toBeNull()
    })
  })

  describe('start()', () => {
    it('calls Voice.start with en-US locale', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => {
        result.current.start()
      })
      expect(mockVoice.start).toHaveBeenCalledWith('en-US')
    })

    it('sets isListening to true when speech starts', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => { fireVoiceEvent('onSpeechStart', {}) })
      expect(result.current.isListening).toBe(true)
    })

    it('sets isListening to false when speech ends', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => { fireVoiceEvent('onSpeechStart', {}) })
      act(() => { fireVoiceEvent('onSpeechEnd', {}) })
      expect(result.current.isListening).toBe(false)
    })
  })

  describe('stop()', () => {
    it('calls Voice.stop', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      await act(async () => { result.current.stop() })
      expect(mockVoice.stop).toHaveBeenCalled()
    })
  })

  describe('transcript updates', () => {
    it('updates transcript when onSpeechResults fires', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => {
        fireVoiceEvent('onSpeechResults', { value: ['bench press 4 sets of 8 reps'] })
      })
      expect(result.current.transcript).toBe('bench press 4 sets of 8 reps')
    })

    it('uses the first result value from onSpeechResults', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => {
        fireVoiceEvent('onSpeechResults', { value: ['first result', 'second result'] })
      })
      expect(result.current.transcript).toBe('first result')
    })

    it('updates partialTranscript when onSpeechPartialResults fires', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => {
        fireVoiceEvent('onSpeechPartialResults', { value: ['bench press'] })
      })
      expect(result.current.partialTranscript).toBe('bench press')
    })

    it('clears partialTranscript when final results arrive', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => { fireVoiceEvent('onSpeechPartialResults', { value: ['bench press'] }) })
      act(() => { fireVoiceEvent('onSpeechResults', { value: ['bench press 4 sets'] }) })
      expect(result.current.partialTranscript).toBe('')
    })
  })

  describe('error handling', () => {
    it('sets error when onSpeechError fires', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => {
        fireVoiceEvent('onSpeechError', { error: { message: 'Recognition failed' } })
      })
      expect(result.current.error).toBeTruthy()
    })

    it('sets isListening to false on error', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => { fireVoiceEvent('onSpeechStart', {}) })
      act(() => {
        fireVoiceEvent('onSpeechError', { error: { message: 'Recognition failed' } })
      })
      expect(result.current.isListening).toBe(false)
    })
  })

  describe('reset()', () => {
    it('clears transcript', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => { fireVoiceEvent('onSpeechResults', { value: ['some text'] }) })
      act(() => { result.current.reset() })
      expect(result.current.transcript).toBe('')
    })

    it('clears error', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => { fireVoiceEvent('onSpeechError', { error: { message: 'fail' } }) })
      act(() => { result.current.reset() })
      expect(result.current.error).toBeNull()
    })

    it('clears partialTranscript', async () => {
      const { result } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      act(() => { fireVoiceEvent('onSpeechPartialResults', { value: ['partial'] }) })
      act(() => { result.current.reset() })
      expect(result.current.partialTranscript).toBe('')
    })
  })

  describe('cleanup', () => {
    it('calls Voice.destroy on unmount', async () => {
      const { result, unmount } = renderHook(() => useSpeechRecognition())
      await act(async () => { result.current.start() })
      unmount()
      expect(mockVoice.destroy).toHaveBeenCalled()
    })

    it('calls Voice.removeAllListeners on unmount', async () => {
      const { unmount } = renderHook(() => useSpeechRecognition())
      unmount()
      expect(mockVoice.removeAllListeners).toHaveBeenCalled()
    })
  })
})

import { useCallback, useEffect, useRef, useState } from 'react'
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice'

export interface SpeechRecognitionState {
  isListening: boolean
  transcript: string
  partialTranscript: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

export function useSpeechRecognition(): SpeechRecognitionState {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const registeredRef = useRef(false)

  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true)
    Voice.onSpeechEnd = () => setIsListening(false)
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const value = e.value?.[0] ?? ''
      setTranscript(value)
      setPartialTranscript('')
    }
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      setPartialTranscript(e.value?.[0] ?? '')
    }
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setError(e.error?.message ?? 'Speech recognition error')
      setIsListening(false)
    }
    registeredRef.current = true

    return () => {
      Voice.removeAllListeners()
      Voice.destroy()
    }
  }, [])

  const start = useCallback(() => {
    setError(null)
    Voice.start('en-US')
  }, [])

  const stop = useCallback(() => {
    Voice.stop()
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setPartialTranscript('')
    setError(null)
  }, [])

  return { isListening, transcript, partialTranscript, error, start, stop, reset }
}

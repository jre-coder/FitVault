import { useRef } from 'react'
import { CameraView } from 'expo-camera'

export interface VideoRecordingHook {
  cameraRef: React.RefObject<CameraView>
  start: () => void
  stop: () => Promise<string>
}

export function useVideoRecording(): VideoRecordingHook {
  const cameraRef = useRef<CameraView>(null)
  const pendingRef = useRef<Promise<{ uri: string } | undefined> | null>(null)

  function start() {
    // recordAsync resolves when stopRecording is called
    pendingRef.current = cameraRef.current?.recordAsync() ?? null
  }

  async function stop(): Promise<string> {
    cameraRef.current?.stopRecording()
    const result = await pendingRef.current
    return result?.uri ?? ''
  }

  return { cameraRef, start, stop }
}

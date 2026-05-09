import { requireNativeModule } from 'expo-modules-core'

const ExpoSetAnalyzer = requireNativeModule('ExpoSetAnalyzer')

export interface JointAngleFrame {
  timestamp: number    // seconds into video
  angle: number        // degrees, 0–180
  confidence: number   // 0–1
}

export interface RawRepTimestamp {
  start: number        // seconds
  end: number          // seconds
}

export interface RawSetAnalysis {
  frameCount: number
  jointAngles: JointAngleFrame[]
  repCount: number
  repTimestamps: RawRepTimestamp[]
  primaryJoint: string  // e.g. 'rightElbow', 'rightKnee'
}

export async function analyzeVideo(videoUri: string): Promise<RawSetAnalysis> {
  return ExpoSetAnalyzer.analyzeVideo(videoUri)
}

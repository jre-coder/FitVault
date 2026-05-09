import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import SetRecordingModal from '../../components/SetRecordingModal'
import { SetAnalysisResult } from '../../services/setAnalysisService'

// --- mock expo-camera ---
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(),
}))

// --- mock useVideoRecording ---
const mockStart = jest.fn()
const mockStop = jest.fn()

jest.mock('../../hooks/useVideoRecording', () => ({
  useVideoRecording: () => ({
    cameraRef: { current: null },
    start: mockStart,
    stop: mockStop,
  }),
}))

// --- mock analyzeSet ---
const mockAnalyzeSet = jest.fn()
jest.mock('../../services/setAnalysisService', () => ({
  analyzeSet: (...args: unknown[]) => mockAnalyzeSet(...args),
}))

import { useCameraPermissions } from 'expo-camera'
const mockUseCameraPermissions = useCameraPermissions as jest.Mock

// ─── fixtures ──────────────────────────────────────────────────────────────────

const CONTROLLED_RESULT: SetAnalysisResult = {
  repCount: 4,
  averageTempoSeconds: 2.5,
  minTempoSeconds: 2.1,
  maxTempoSeconds: 2.9,
  tempoCategory: 'controlled',
  summary: 'FitVault counted 4 reps at an average of 2.5 seconds per rep.',
  guidance: null,
  contentSuggestion: null,
}

const FAST_RESULT: SetAnalysisResult = {
  repCount: 5,
  averageTempoSeconds: 1.0,
  minTempoSeconds: 0.8,
  maxTempoSeconds: 1.2,
  tempoCategory: 'fast',
  summary: 'FitVault counted 5 reps at an average of 1.0 seconds per rep.',
  guidance: 'Slower, more controlled reps (2–4 seconds each) can increase muscle engagement during each set. Want to explore content focused on tempo training?',
  contentSuggestion: 'tempo training',
}

const NO_REPS_RESULT: SetAnalysisResult = {
  repCount: 0,
  averageTempoSeconds: null,
  minTempoSeconds: null,
  maxTempoSeconds: null,
  tempoCategory: null,
  summary: "FitVault couldn't detect any reps in this recording.",
  guidance: null,
  contentSuggestion: null,
}

const defaultProps = {
  visible: true,
  exerciseName: 'Bicep Curl',
  onClose: jest.fn(),
  onContentSuggestion: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()])
  mockStop.mockResolvedValue('file://recording.mp4')
  mockAnalyzeSet.mockResolvedValue(CONTROLLED_RESULT)
})

// ─── consent step ──────────────────────────────────────────────────────────────

describe('consent step', () => {
  it('shows the consent step by default', () => {
    render(<SetRecordingModal {...defaultProps} />)
    expect(screen.getByText(/analyzed on-device/i)).toBeTruthy()
  })

  it('shows the exercise name in the title', () => {
    render(<SetRecordingModal {...defaultProps} />)
    expect(screen.getByText(/bicep curl/i)).toBeTruthy()
  })

  it('shows a never stored privacy disclaimer', () => {
    render(<SetRecordingModal {...defaultProps} />)
    expect(screen.getByText(/never stored/i)).toBeTruthy()
  })

  it('shows a Start Recording button', () => {
    render(<SetRecordingModal {...defaultProps} />)
    expect(screen.getByText(/start recording/i)).toBeTruthy()
  })

  it('shows a Skip option', () => {
    render(<SetRecordingModal {...defaultProps} />)
    expect(screen.getByText(/skip/i)).toBeTruthy()
  })

  it('calls onClose when Skip is pressed', () => {
    render(<SetRecordingModal {...defaultProps} />)
    fireEvent.press(screen.getByText(/skip/i))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('does not render when visible is false', () => {
    render(<SetRecordingModal {...defaultProps} visible={false} />)
    expect(screen.queryByText(/start recording/i)).toBeNull()
  })
})

// ─── permission denied ─────────────────────────────────────────────────────────

describe('camera permission denied', () => {
  beforeEach(() => {
    mockUseCameraPermissions.mockReturnValue([{ granted: false }, jest.fn()])
  })

  it('shows a camera permission message', () => {
    render(<SetRecordingModal {...defaultProps} />)
    expect(screen.getByText(/camera permission/i)).toBeTruthy()
  })

  it('does not show Start Recording when permission is denied', () => {
    render(<SetRecordingModal {...defaultProps} />)
    expect(screen.queryByText(/start recording/i)).toBeNull()
  })
})

// ─── recording step ────────────────────────────────────────────────────────────

describe('recording step', () => {
  it('transitions to the recording view after Start Recording is pressed', async () => {
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    expect(screen.getByText(/stop recording/i)).toBeTruthy()
  })

  it('calls useVideoRecording.start when recording begins', async () => {
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    expect(mockStart).toHaveBeenCalled()
  })

  it('shows a Stop Recording button', async () => {
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    expect(screen.getByText(/stop/i)).toBeTruthy()
  })
})

// ─── processing step ───────────────────────────────────────────────────────────

describe('processing step', () => {
  it('shows an analyzing indicator after stopping', async () => {
    let resolveStop!: (uri: string) => void
    mockStop.mockReturnValue(new Promise<string>(r => { resolveStop = r }))

    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    await act(async () => { fireEvent.press(screen.getByText(/stop/i)) })

    expect(screen.getByText(/analyzing/i)).toBeTruthy()
    await act(async () => { resolveStop('file://rec.mp4') })
  })
})

// ─── results step — controlled tempo ──────────────────────────────────────────

describe('results step — controlled reps', () => {
  async function renderResults(result = CONTROLLED_RESULT) {
    mockAnalyzeSet.mockResolvedValue(result)
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    await act(async () => { fireEvent.press(screen.getByText(/stop/i)) })
    await waitFor(() => expect(screen.getByText(/4 rep/i)).toBeTruthy())
  }

  it('shows the rep count', async () => {
    await renderResults()
    expect(screen.getByText(/4 rep/i)).toBeTruthy()
  })

  it('shows the tempo in the summary', async () => {
    await renderResults()
    expect(screen.getByText(/2\.5 second/i)).toBeTruthy()
  })

  it('does NOT show guidance for controlled reps', async () => {
    await renderResults()
    expect(screen.queryByText(/tempo training/i)).toBeNull()
  })

  it('shows a Done button', async () => {
    await renderResults()
    expect(screen.getByText('Done')).toBeTruthy()
  })

  it('calls onClose when Done is pressed', async () => {
    await renderResults()
    fireEvent.press(screen.getByText('Done'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})

// ─── results step — fast tempo ─────────────────────────────────────────────────

describe('results step — fast reps', () => {
  async function renderFastResults() {
    mockAnalyzeSet.mockResolvedValue(FAST_RESULT)
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    await act(async () => { fireEvent.press(screen.getByText(/stop/i)) })
    await waitFor(() => expect(screen.getByText(/5 rep/i)).toBeTruthy())
  }

  it('shows the guidance text', async () => {
    await renderFastResults()
    expect(screen.getByText(/controlled reps/i)).toBeTruthy()
  })

  it('shows a content suggestion button', async () => {
    await renderFastResults()
    expect(screen.getByText(/explore tempo training/i)).toBeTruthy()
  })

  it('calls onContentSuggestion with the suggestion when tapped', async () => {
    await renderFastResults()
    fireEvent.press(screen.getByText(/explore tempo training/i))
    expect(defaultProps.onContentSuggestion).toHaveBeenCalledWith('tempo training')
  })
})

// ─── results step — no reps detected ──────────────────────────────────────────

describe('results step — no reps detected', () => {
  it('shows a message when no reps were detected', async () => {
    mockAnalyzeSet.mockResolvedValue(NO_REPS_RESULT)
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    await act(async () => { fireEvent.press(screen.getByText(/stop/i)) })
    await waitFor(() => expect(screen.getByText(/couldn't detect/i)).toBeTruthy())
  })
})

// ─── error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('shows an error message when analysis fails', async () => {
    mockAnalyzeSet.mockRejectedValue(new Error('Vision error'))
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    await act(async () => { fireEvent.press(screen.getByText(/stop/i)) })
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeTruthy())
  })

  it('shows a Try Again button on error', async () => {
    mockAnalyzeSet.mockRejectedValue(new Error('Vision error'))
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    await act(async () => { fireEvent.press(screen.getByText(/stop/i)) })
    await waitFor(() => screen.getByText(/try again/i))
    expect(screen.getByText(/try again/i)).toBeTruthy()
  })

  it('returns to consent step when Try Again is pressed', async () => {
    mockAnalyzeSet.mockRejectedValue(new Error('Vision error'))
    render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    await act(async () => { fireEvent.press(screen.getByText(/stop/i)) })
    await waitFor(() => screen.getByText(/try again/i))
    await act(async () => { fireEvent.press(screen.getByText(/try again/i)) })
    expect(screen.getByText(/start recording/i)).toBeTruthy()
  })
})

// ─── state reset ───────────────────────────────────────────────────────────────

describe('state reset', () => {
  it('resets to consent step when modal is reopened', async () => {
    const { rerender } = render(<SetRecordingModal {...defaultProps} />)
    await act(async () => { fireEvent.press(screen.getByText(/start recording/i)) })
    await act(async () => { fireEvent.press(screen.getByText(/stop/i)) })
    await waitFor(() => screen.getByText(/4 rep/i))

    rerender(<SetRecordingModal {...defaultProps} visible={false} />)
    rerender(<SetRecordingModal {...defaultProps} visible={true} />)

    expect(screen.getByText(/start recording/i)).toBeTruthy()
  })
})

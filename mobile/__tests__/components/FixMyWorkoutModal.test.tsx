import React from 'react'
import { Linking } from 'react-native'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import FixMyWorkoutModal from '../../components/FixMyWorkoutModal'
import { WorkoutAnalysis } from '../../types'

const mockAnalyzeWorkout = jest.fn()
const mockIsPremium = { value: false }

// --- useSpeechRecognition mock ---
type MockSpeechHook = {
  isListening: boolean
  transcript: string
  partialTranscript: string
  error: string | null
  start: jest.Mock
  stop: jest.Mock
  reset: jest.Mock
}
let mockSpeech: MockSpeechHook

jest.mock('../../hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: () => mockSpeech,
}))

jest.mock('../../services/fixMyWorkoutService', () => ({
  analyzeWorkout: (...args: unknown[]) => mockAnalyzeWorkout(...args),
  buildEphemeralExecution: (analysis: WorkoutAnalysis) => ({
    routine: {
      id: 'ephemeral-routine-id',
      name: 'Fix My Workout',
      items: [{ workoutItemId: 'ephemeral-workout-id', order: 0 }],
      createdAt: '2026-05-08T10:00:00.000Z',
    },
    workouts: [{
      id: 'ephemeral-workout-id',
      title: 'Fix My Workout — Optimized Plan',
      url: '',
      sourceType: 'other',
      bodyParts: ['Full Body'],
      notes: '',
      dateAdded: '2026-05-08T10:00:00.000Z',
      isFavorite: false,
      exercises: analysis.optimizedExercises,
    }],
  }),
}))

jest.mock('../../context/SubscriptionContext', () => ({
  useSubscription: () => ({ isPremium: mockIsPremium.value }),
}))

jest.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({
    profile: {
      goals: ['Muscle Growth'],
      fitnessLevel: 'Intermediate',
      age: 30,
      sensitiveAreas: [],
      equipment: ['barbell'],
      preferredDuration: 60,
      preferredPlatforms: ['youtube'],
      preferredWorkoutTypes: [],
    },
  }),
}))

const ANALYSIS: WorkoutAnalysis = {
  parsedExercises: [
    { name: 'Bench Press', sets: 4, reps: '8-10' },
    { name: 'Incline Press', sets: 3, reps: '10-12' },
  ],
  muscleGroups: ['Chest', 'Arms'],
  estimatedDurationMinutes: 45,
  issues: [
    {
      severity: 'warning',
      title: 'No pulling movement',
      description: 'Add a row or pull-up to balance the session.',
    },
    {
      severity: 'error',
      title: 'Redundant exercises',
      description: 'Bench and incline press are similar movements. Swap one for variety.',
    },
  ],
  optimizedExercises: [
    { name: 'Bench Press', sets: 4, reps: '6-8' },
    { name: 'Cable Row', sets: 3, reps: '10-12' },
  ],
  swaps: [
    { original: 'Incline Press', replacement: 'Cable Row', reason: 'Adds pulling movement.' },
  ],
  coachNotes: 'Great start — one swap transforms this into a balanced session.',
}

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onRequestUpgrade: jest.fn(),
  onStartWorkout: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsPremium.value = false
  mockSpeech = {
    isListening: false,
    transcript: '',
    partialTranscript: '',
    error: null,
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  }
})

describe('FixMyWorkoutModal', () => {
  describe('input step', () => {
    it('renders the input screen by default', () => {
      render(<FixMyWorkoutModal {...defaultProps} />)
      expect(screen.getByPlaceholderText(/describe your workout/i)).toBeTruthy()
    })

    it('renders a title and subtitle', () => {
      render(<FixMyWorkoutModal {...defaultProps} />)
      expect(screen.getByText('Fix My Workout')).toBeTruthy()
    })

    it('disables the Analyze button when input is empty', () => {
      render(<FixMyWorkoutModal {...defaultProps} />)
      const button = screen.getByText('Analyze')
      expect(button).toBeTruthy()
      // Button should not trigger analysis when empty
      fireEvent.press(button)
      expect(mockAnalyzeWorkout).not.toHaveBeenCalled()
    })

    it('enables analysis when the user types a description', async () => {
      mockAnalyzeWorkout.mockResolvedValue(ANALYSIS)
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8, incline press 3x10'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
      expect(mockAnalyzeWorkout).toHaveBeenCalledWith(
        'bench press 4x8, incline press 3x10',
        expect.any(Object)
      )
    })

    it('calls onClose when cancel is pressed', () => {
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Cancel'))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('does not render when visible is false', () => {
      render(<FixMyWorkoutModal {...defaultProps} visible={false} />)
      expect(screen.queryByPlaceholderText(/describe your workout/i)).toBeNull()
    })
  })

  describe('loading step', () => {
    it('shows a loading indicator while analyzing', async () => {
      let resolveAnalysis!: (v: WorkoutAnalysis) => void
      mockAnalyzeWorkout.mockReturnValue(
        new Promise<WorkoutAnalysis>(resolve => { resolveAnalysis = resolve })
      )
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
      expect(screen.getByText(/analyzing/i)).toBeTruthy()

      await act(async () => { resolveAnalysis(ANALYSIS) })
    })
  })

  describe('results step — free user', () => {
    beforeEach(() => {
      mockIsPremium.value = false
      mockAnalyzeWorkout.mockResolvedValue(ANALYSIS)
    })

    async function renderResults() {
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8, incline press 3x10'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
    }

    it('shows the issues list', async () => {
      await renderResults()
      expect(screen.getByText('No pulling movement')).toBeTruthy()
      expect(screen.getByText('Redundant exercises')).toBeTruthy()
    })

    it('shows issue descriptions', async () => {
      await renderResults()
      expect(screen.getByText('Add a row or pull-up to balance the session.')).toBeTruthy()
    })

    it('shows the issue count', async () => {
      await renderResults()
      expect(screen.getByText(/2 issue/i)).toBeTruthy()
    })

    it('locks the optimized plan for free users', async () => {
      await renderResults()
      expect(screen.getAllByText(/unlock/i).length).toBeGreaterThanOrEqual(1)
    })

    it('does NOT show the optimized exercises to free users', async () => {
      await renderResults()
      expect(screen.queryByText('Cable Row')).toBeNull()
    })

    it('does NOT show "Start this workout" to free users', async () => {
      await renderResults()
      expect(screen.queryByText(/start this workout/i)).toBeNull()
    })

    it('calls onRequestUpgrade when the unlock button is pressed', async () => {
      await renderResults()
      fireEvent.press(screen.getByText('Unlock with Premium'))
      expect(defaultProps.onRequestUpgrade).toHaveBeenCalled()
    })

    it('shows parsed exercise names', async () => {
      await renderResults()
      expect(screen.getByText('Bench Press')).toBeTruthy()
    })
  })

  describe('results step — premium user', () => {
    beforeEach(() => {
      mockIsPremium.value = true
      mockAnalyzeWorkout.mockResolvedValue(ANALYSIS)
    })

    async function renderResults() {
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8, incline press 3x10'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
    }

    it('shows the optimized exercise list', async () => {
      await renderResults()
      expect(screen.getAllByText('Cable Row').length).toBeGreaterThanOrEqual(1)
    })

    it('shows exercise swaps with reasons', async () => {
      await renderResults()
      expect(screen.getByText('Adds pulling movement.')).toBeTruthy()
    })

    it('shows coach notes', async () => {
      await renderResults()
      expect(screen.getByText(ANALYSIS.coachNotes)).toBeTruthy()
    })

    it('does NOT show the unlock button for premium users', async () => {
      await renderResults()
      expect(screen.queryByText(/unlock/i)).toBeNull()
    })

    it('shows issues to premium users too', async () => {
      await renderResults()
      expect(screen.getByText('No pulling movement')).toBeTruthy()
    })

    it('shows a "Start this workout" button', async () => {
      await renderResults()
      expect(screen.getByText(/start this workout/i)).toBeTruthy()
    })

    it('calls onStartWorkout with a routine and workouts array when Start is pressed', async () => {
      await renderResults()
      fireEvent.press(screen.getByText(/start this workout/i))
      expect(defaultProps.onStartWorkout).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
        expect.arrayContaining([expect.objectContaining({ exercises: expect.any(Array) })])
      )
    })

    it('calls onClose when Start this workout is pressed', async () => {
      await renderResults()
      fireEvent.press(screen.getByText(/start this workout/i))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('shows an error message when analysis fails', async () => {
      mockAnalyzeWorkout.mockRejectedValue(new Error('Network error'))
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
      expect(screen.getByText(/couldn't analyze/i)).toBeTruthy()
    })

    it('allows retrying after an error', async () => {
      mockAnalyzeWorkout.mockRejectedValue(new Error('Network error'))
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
      expect(screen.getByText('Try Again')).toBeTruthy()
    })
  })

  describe('state reset on close', () => {
    it('resets to input step when reopened', async () => {
      mockAnalyzeWorkout.mockResolvedValue(ANALYSIS)
      const { rerender } = render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })

      rerender(<FixMyWorkoutModal {...defaultProps} visible={false} />)
      rerender(<FixMyWorkoutModal {...defaultProps} visible={true} />)

      expect(screen.getByPlaceholderText(/describe your workout/i)).toBeTruthy()
    })
  })

  describe('video suggestions in swaps — premium user', () => {
    const ANALYSIS_WITH_VIDEO: WorkoutAnalysis = {
      ...ANALYSIS,
      swaps: [
        {
          original: 'Incline Press',
          replacement: 'Cable Row',
          reason: 'Adds pulling movement.',
          videoSuggestion: {
            creator: 'Jeff Nippard',
            handle: 'jeffnippard',
            platform: 'youtube',
            url: 'https://youtube.com/@jeffnippard',
          },
        },
      ],
    }

    beforeEach(() => {
      mockIsPremium.value = true
      mockAnalyzeWorkout.mockResolvedValue(ANALYSIS_WITH_VIDEO)
    })

    async function renderResults() {
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8, incline press 3x10'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
    }

    it('shows creator name in the swap row', async () => {
      await renderResults()
      expect(screen.getByText(/Jeff Nippard/)).toBeTruthy()
    })

    it('shows a watch link in the swap row', async () => {
      await renderResults()
      expect(screen.getByTestId('swap-video-link')).toBeTruthy()
    })

    it('opens the creator URL when the link is tapped', async () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      await renderResults()
      fireEvent.press(screen.getByTestId('swap-video-link'))
      expect(openURL).toHaveBeenCalledWith('https://youtube.com/@jeffnippard')
      openURL.mockRestore()
    })

    it('does not show a video link when videoSuggestion is absent', async () => {
      mockAnalyzeWorkout.mockResolvedValue(ANALYSIS)
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.changeText(
        screen.getByPlaceholderText(/describe your workout/i),
        'bench press 4x8'
      )
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
      expect(screen.queryByTestId('swap-video-link')).toBeNull()
    })
  })

  describe('voice input', () => {
    it('shows a mic button in the input step', () => {
      render(<FixMyWorkoutModal {...defaultProps} />)
      expect(screen.getByTestId('mic-button')).toBeTruthy()
    })

    it('calls speech.start when mic button is pressed', () => {
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.press(screen.getByTestId('mic-button'))
      expect(mockSpeech.start).toHaveBeenCalled()
    })

    it('calls speech.stop when mic is pressed while listening', () => {
      mockSpeech.isListening = true
      render(<FixMyWorkoutModal {...defaultProps} />)
      fireEvent.press(screen.getByTestId('mic-button'))
      expect(mockSpeech.stop).toHaveBeenCalled()
    })

    it('shows listening indicator when isListening is true', () => {
      mockSpeech.isListening = true
      render(<FixMyWorkoutModal {...defaultProps} />)
      expect(screen.getByText(/listening/i)).toBeTruthy()
    })

    it('fills text input with transcript when speech completes', () => {
      mockSpeech.transcript = 'bench press 4 sets of 8 reps at 80 kilos'
      render(<FixMyWorkoutModal {...defaultProps} />)
      const input = screen.getByPlaceholderText(/describe your workout/i)
      expect(input.props.value).toBe('bench press 4 sets of 8 reps at 80 kilos')
    })

    it('shows partial transcript while listening', () => {
      mockSpeech.isListening = true
      mockSpeech.partialTranscript = 'bench press…'
      render(<FixMyWorkoutModal {...defaultProps} />)
      expect(screen.getByText('bench press…')).toBeTruthy()
    })

    it('shows speech error when recognition fails', () => {
      mockSpeech.error = 'Microphone not available'
      render(<FixMyWorkoutModal {...defaultProps} />)
      expect(screen.getByText(/microphone not available/i)).toBeTruthy()
    })

    it('can analyze after voice fills the input', async () => {
      mockSpeech.transcript = 'squats 3 sets of 5 reps'
      mockAnalyzeWorkout.mockResolvedValue(ANALYSIS)
      render(<FixMyWorkoutModal {...defaultProps} />)
      await act(async () => {
        fireEvent.press(screen.getByText('Analyze'))
      })
      expect(mockAnalyzeWorkout).toHaveBeenCalledWith(
        'squats 3 sets of 5 reps',
        expect.any(Object)
      )
    })

    it('resets speech on modal close', () => {
      const { rerender } = render(<FixMyWorkoutModal {...defaultProps} />)
      rerender(<FixMyWorkoutModal {...defaultProps} visible={false} />)
      expect(mockSpeech.reset).toHaveBeenCalled()
    })
  })
})

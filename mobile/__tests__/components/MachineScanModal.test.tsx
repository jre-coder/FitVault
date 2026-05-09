import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import MachineScanModal from '../../components/MachineScanModal'
import { MachineIdentificationResult } from '../../types'
import * as ImagePicker from 'expo-image-picker'

// --- mock identifyMachine ---
const mockIdentifyMachine = jest.fn()
jest.mock('../../services/machineIdentificationService', () => ({
  identifyMachine: (...args: unknown[]) => mockIdentifyMachine(...args),
  buildMachineEphemeralExecution: (result: MachineIdentificationResult) => ({
    routine: {
      id: 'machine-routine-id',
      name: result.machineName,
      items: [{ workoutItemId: 'machine-workout-id', order: 0 }],
      createdAt: '2026-05-09T10:00:00.000Z',
    },
    workouts: [{
      id: 'machine-workout-id',
      title: result.machineName,
      url: '',
      sourceType: 'other',
      bodyParts: result.bodyParts,
      notes: result.notes ?? '',
      dateAdded: '2026-05-09T10:00:00.000Z',
      isFavorite: false,
      exercises: result.exercises,
    }],
  }),
}))

jest.mock('expo-image-picker')

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
      equipment: [],
      preferredDuration: 60,
      preferredPlatforms: ['youtube'],
      preferredWorkoutTypes: [],
    },
  }),
}))

const mockIsPremium = { value: true }

const RESULT: MachineIdentificationResult = {
  recognized: true,
  machineName: 'Cable Row Machine',
  exercises: [
    { name: 'Seated Cable Row', sets: 3, reps: '10-12' },
    { name: 'Single-Arm Cable Row', sets: 3, reps: '10 each side' },
  ],
  bodyParts: ['Back', 'Arms'],
  confidence: 'high',
  notes: 'Adjust seat height so handles are at chest level.',
}

const UNRECOGNIZED: MachineIdentificationResult = {
  recognized: false,
  machineName: 'Unknown Machine',
  exercises: [],
  bodyParts: [],
  confidence: 'low',
}

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  onRequestUpgrade: jest.fn(),
  onStartWorkout: jest.fn(),
}

function mockCameraSuccess() {
  ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
  ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://machine.jpg', base64: 'base64imagedata==' }],
  })
}

function mockLibrarySuccess() {
  ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
  ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://machine.jpg', base64: 'base64imagedata==' }],
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsPremium.value = true
  mockIdentifyMachine.mockResolvedValue(RESULT)
  mockCameraSuccess()
  mockLibrarySuccess()
})

// ─── locked state (free users) ─────────────────────────────────────────────────

describe('locked state — free user', () => {
  beforeEach(() => {
    mockIsPremium.value = false
  })

  it('shows an upgrade prompt', () => {
    render(<MachineScanModal {...defaultProps} />)
    expect(screen.getByText(/unlock/i)).toBeTruthy()
  })

  it('does not show camera or library buttons', () => {
    render(<MachineScanModal {...defaultProps} />)
    expect(screen.queryByText(/take a photo/i)).toBeNull()
    expect(screen.queryByText(/choose from library/i)).toBeNull()
  })

  it('calls onRequestUpgrade when upgrade button is pressed', () => {
    render(<MachineScanModal {...defaultProps} />)
    fireEvent.press(screen.getByText(/unlock with premium/i))
    expect(defaultProps.onRequestUpgrade).toHaveBeenCalled()
  })

  it('calls onClose when cancel is pressed', () => {
    render(<MachineScanModal {...defaultProps} />)
    fireEvent.press(screen.getByText('Cancel'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})

// ─── camera step (premium) ─────────────────────────────────────────────────────

describe('camera step — premium user', () => {
  it('renders the modal title', () => {
    render(<MachineScanModal {...defaultProps} />)
    expect(screen.getByText('Scan Machine')).toBeTruthy()
  })

  it('shows a take-photo button', () => {
    render(<MachineScanModal {...defaultProps} />)
    expect(screen.getByText(/take a photo/i)).toBeTruthy()
  })

  it('shows a choose-from-library button', () => {
    render(<MachineScanModal {...defaultProps} />)
    expect(screen.getByText(/choose from library/i)).toBeTruthy()
  })

  it('calls onClose when Cancel is pressed', () => {
    render(<MachineScanModal {...defaultProps} />)
    fireEvent.press(screen.getByText('Cancel'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('does not render when visible is false', () => {
    render(<MachineScanModal {...defaultProps} visible={false} />)
    expect(screen.queryByText('Scan Machine')).toBeNull()
  })
})

// ─── loading step ──────────────────────────────────────────────────────────────

describe('loading step', () => {
  it('shows an identifying indicator while calling the service', async () => {
    let resolve!: (v: MachineIdentificationResult) => void
    mockIdentifyMachine.mockReturnValue(new Promise(r => { resolve = r }))

    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })

    expect(screen.getByText(/identifying/i)).toBeTruthy()
    await act(async () => { resolve(RESULT) })
  })
})

// ─── result step — recognized machine ─────────────────────────────────────────

describe('result step — recognized machine', () => {
  async function renderResult() {
    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })
    await waitFor(() => expect(screen.getByText('Cable Row Machine')).toBeTruthy())
  }

  it('shows the machine name', async () => {
    await renderResult()
    expect(screen.getByText('Cable Row Machine')).toBeTruthy()
  })

  it('shows the suggested exercises', async () => {
    await renderResult()
    expect(screen.getByText('Seated Cable Row')).toBeTruthy()
    expect(screen.getByText('Single-Arm Cable Row')).toBeTruthy()
  })

  it('shows the body parts targeted', async () => {
    await renderResult()
    expect(screen.getByText(/back/i)).toBeTruthy()
  })

  it('shows a "Start Workout" button', async () => {
    await renderResult()
    expect(screen.getByText(/start workout/i)).toBeTruthy()
  })

  it('shows a "Scan Again" button to take another photo', async () => {
    await renderResult()
    expect(screen.getByText(/scan again/i)).toBeTruthy()
  })

  it('calls onStartWorkout with routine and workouts when Start is pressed', async () => {
    await renderResult()
    fireEvent.press(screen.getByText(/start workout/i))
    expect(defaultProps.onStartWorkout).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
      expect.arrayContaining([expect.objectContaining({ exercises: expect.any(Array) })])
    )
  })

  it('calls onClose when Start Workout is pressed', async () => {
    await renderResult()
    fireEvent.press(screen.getByText(/start workout/i))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('returns to camera step when Scan Again is pressed', async () => {
    await renderResult()
    await act(async () => {
      fireEvent.press(screen.getByText(/scan again/i))
    })
    expect(screen.getByText(/take a photo/i)).toBeTruthy()
  })
})

// ─── result step — unrecognized machine ───────────────────────────────────────

describe('result step — unrecognized machine', () => {
  beforeEach(() => {
    mockIdentifyMachine.mockResolvedValue(UNRECOGNIZED)
  })

  it('shows a message when the machine is not recognized', async () => {
    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })
    await waitFor(() => expect(screen.getByText(/couldn't identify/i)).toBeTruthy())
  })

  it('shows Scan Again button for unrecognized machines', async () => {
    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })
    await waitFor(() => screen.getByText(/scan again/i))
    expect(screen.getByText(/scan again/i)).toBeTruthy()
  })

  it('does NOT show Start Workout for unrecognized machines', async () => {
    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })
    await waitFor(() => screen.getByText(/couldn't identify/i))
    expect(screen.queryByText(/start workout/i)).toBeNull()
  })
})

// ─── error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('shows an error message when identification fails', async () => {
    mockIdentifyMachine.mockRejectedValue(new Error('Network error'))
    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })
    await waitFor(() => expect(screen.getByText(/couldn't identify/i)).toBeTruthy())
  })

  it('shows a Try Again button on error', async () => {
    mockIdentifyMachine.mockRejectedValue(new Error('Network error'))
    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })
    await waitFor(() => screen.getByText(/try again/i))
    expect(screen.getByText(/try again/i)).toBeTruthy()
  })

  it('returns to camera step when Try Again is pressed', async () => {
    mockIdentifyMachine.mockRejectedValue(new Error('Network error'))
    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })
    await waitFor(() => screen.getByText(/try again/i))
    await act(async () => {
      fireEvent.press(screen.getByText(/try again/i))
    })
    expect(screen.getByText(/take a photo/i)).toBeTruthy()
  })
})

// ─── library picker ────────────────────────────────────────────────────────────

describe('choose from library', () => {
  it('calls identifyMachine when a photo is picked from library', async () => {
    render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/choose from library/i))
    })
    await waitFor(() => expect(mockIdentifyMachine).toHaveBeenCalledWith(
      'base64imagedata==',
      expect.any(Object)
    ))
  })
})

// ─── state reset ───────────────────────────────────────────────────────────────

describe('state reset on close', () => {
  it('resets to camera step when reopened', async () => {
    const { rerender } = render(<MachineScanModal {...defaultProps} />)
    await act(async () => {
      fireEvent.press(screen.getByText(/take a photo/i))
    })
    await waitFor(() => screen.getByText('Cable Row Machine'))

    rerender(<MachineScanModal {...defaultProps} visible={false} />)
    rerender(<MachineScanModal {...defaultProps} visible={true} />)

    expect(screen.getByText(/take a photo/i)).toBeTruthy()
  })
})

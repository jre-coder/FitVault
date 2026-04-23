import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import PhotoImportModal from '../../components/PhotoImportModal'
import * as ImagePicker from 'expo-image-picker'
import * as photoAnalysisService from '../../services/photoAnalysisService'
import { PhotoAnalysisResult } from '../../types'

jest.mock('expo-image-picker')
jest.mock('../../services/photoAnalysisService')
jest.mock('../../components/PaywallModal', () => () => null)
jest.mock('../../context/SubscriptionContext', () => ({
  useSubscription: jest.fn(),
}))

import { useSubscription } from '../../context/SubscriptionContext'
const mockUseSubscription = useSubscription as jest.Mock

const mockAnalyze = photoAnalysisService.analyzeWorkoutPhotos as jest.Mock

const MOCK_ANALYSIS: PhotoAnalysisResult = {
  title: 'Push Day',
  bodyParts: ['Chest', 'Shoulders'],
  difficulty: 'Intermediate',
  exercises: [
    { name: 'Bench Press', sets: 4, reps: '8-10' },
    { name: 'Shoulder Press', sets: 3, reps: '10' },
  ],
  notes: 'Rest 90s between sets',
}

function defaultProps(overrides = {}) {
  return {
    visible: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
  mockUseSubscription.mockReturnValue({ isPremium: true })
  ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
  ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://photo1.jpg', base64: 'base64data1==' }],
  })
  mockAnalyze.mockResolvedValue(MOCK_ANALYSIS)
})

describe('PhotoImportModal', () => {
  describe('initial state', () => {
    it('renders pick photos button', () => {
      const { getByText } = render(<PhotoImportModal {...defaultProps()} />)
      expect(getByText(/choose photos/i)).toBeTruthy()
    })

    it('renders camera button', () => {
      const { getByText } = render(<PhotoImportModal {...defaultProps()} />)
      expect(getByText(/take photos/i)).toBeTruthy()
    })

    it('calls onClose when cancel is tapped', () => {
      const onClose = jest.fn()
      const { getByText } = render(<PhotoImportModal {...defaultProps({ onClose })} />)
      fireEvent.press(getByText(/cancel/i))
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('premium: AI analysis', () => {
    it('shows loading state while analyzing', async () => {
      mockAnalyze.mockImplementation(() => new Promise(() => {}))
      const { getByText } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() => expect(getByText(/analyzing/i)).toBeTruthy())
    })

    it('shows extracted workout title after analysis', async () => {
      const { getByText, getByDisplayValue } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() => expect(getByDisplayValue('Push Day')).toBeTruthy())
    })

    it('shows extracted exercises after analysis', async () => {
      const { getByText } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() => {
        expect(getByText('Bench Press')).toBeTruthy()
        expect(getByText('Shoulder Press')).toBeTruthy()
      })
    })

    it('calls onSave with photo sourceType and exercises when save is tapped', async () => {
      const onSave = jest.fn()
      const { getByText } = render(<PhotoImportModal {...defaultProps({ onSave })} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() => getByText(/save workout/i))
      fireEvent.press(getByText(/save workout/i))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'photo',
          exercises: MOCK_ANALYSIS.exercises,
          title: 'Push Day',
        })
      )
    })
  })

  describe('free tier: manual entry', () => {
    beforeEach(() => {
      mockUseSubscription.mockReturnValue({ isPremium: false })
    })

    it('does not call AI analysis for free users', async () => {
      const { getByText } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() => getByText(/save workout/i))
      expect(mockAnalyze).not.toHaveBeenCalled()
    })

    it('shows upgrade prompt for free users after photo selection', async () => {
      const { getByText } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() => expect(getByText(/upgrade to premium/i)).toBeTruthy())
    })

    it('shows empty manual form for free users', async () => {
      const { getByPlaceholderText, getByText } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() =>
        expect(getByPlaceholderText(/workout title/i)).toBeTruthy()
      )
    })
  })

  describe('error handling', () => {
    it('shows error message when analysis fails', async () => {
      mockAnalyze.mockRejectedValue(new Error('API error'))
      const { getByText } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() => expect(getByText(/couldn't analyze/i)).toBeTruthy())
    })

    it('still shows manual form after analysis failure', async () => {
      mockAnalyze.mockRejectedValue(new Error('API error'))
      const { getByPlaceholderText, getByText } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      await waitFor(() =>
        expect(getByPlaceholderText(/workout title/i)).toBeTruthy()
      )
    })

    it('does nothing when image picker is cancelled', async () => {
      ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] })
      const { getByText, queryByText } = render(<PhotoImportModal {...defaultProps()} />)
      await act(async () => {
        fireEvent.press(getByText(/choose photos/i))
      })
      expect(queryByText(/analyzing/i)).toBeNull()
      expect(queryByText(/save workout/i)).toBeNull()
    })
  })
})

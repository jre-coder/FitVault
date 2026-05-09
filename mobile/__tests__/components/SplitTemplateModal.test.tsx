import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import SplitTemplateModal from '../../components/SplitTemplateModal'
import { SPLIT_TEMPLATES } from '../../services/splitTemplates'
import { Routine } from '../../types'

const mockAddRoutinesBatch = jest.fn()
const mockSetDaySchedule = jest.fn()

jest.mock('../../context/RoutineContext', () => ({
  useRoutines: () => ({
    addRoutinesBatch: mockAddRoutinesBatch,
    setDaySchedule: mockSetDaySchedule,
  }),
}))

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
}

const PPL = SPLIT_TEMPLATES.find(t => t.id === 'ppl')!
const FULL_BODY = SPLIT_TEMPLATES.find(t => t.id === 'full-body')!

beforeEach(() => {
  jest.clearAllMocks()
  mockAddRoutinesBatch.mockReturnValue([])
})

describe('SplitTemplateModal', () => {
  describe('rendering', () => {
    it('renders the modal title', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      expect(screen.getByText('Split Templates')).toBeTruthy()
    })

    it('renders all 4 template names', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      for (const t of SPLIT_TEMPLATES) {
        expect(screen.getAllByText(t.name).length).toBeGreaterThanOrEqual(1)
      }
    })

    it('renders template descriptions', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      for (const t of SPLIT_TEMPLATES) {
        expect(screen.getByText(t.description)).toBeTruthy()
      }
    })

    it('renders days-per-week for each template', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      expect(screen.getByText(`${PPL.daysPerWeek} days/week`)).toBeTruthy()
      expect(screen.getByText(`${FULL_BODY.daysPerWeek} days/week`)).toBeTruthy()
    })

    it('does not render when visible is false', () => {
      render(<SplitTemplateModal visible={false} onClose={jest.fn()} />)
      expect(screen.queryByText('Split Templates')).toBeNull()
    })
  })

  describe('template selection', () => {
    it('shows Apply button when a template is selected', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText(PPL.name))
      expect(screen.getByText(/Apply/i)).toBeTruthy()
    })

    it('shows the selected template routine names in a preview', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText(PPL.name))
      for (const r of PPL.routines) {
        expect(screen.getAllByText(r.name).length).toBeGreaterThanOrEqual(1)
      }
    })

    it('can switch selection between templates', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText(PPL.name))
      // FULL_BODY.name === FULL_BODY.routines[0].name === "Full Body", so multiple elements exist
      fireEvent.press(screen.getAllByText(FULL_BODY.name)[0])
      expect(screen.getAllByText(FULL_BODY.routines[0].name).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('apply template', () => {
    it('calls addRoutinesBatch with the template routines', () => {
      const createdRoutines: Routine[] = PPL.routines.map((r, i) => ({
        id: `id-${i}`,
        name: r.name,
        items: [],
        createdAt: '2026-05-07T10:00:00.000Z',
      }))
      mockAddRoutinesBatch.mockReturnValue(createdRoutines)

      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText(PPL.name))
      fireEvent.press(screen.getByText(/Apply/i))

      expect(mockAddRoutinesBatch).toHaveBeenCalledWith(
        PPL.routines.map(r => ({ name: r.name, items: [] }))
      )
    })

    it('calls setDaySchedule for each day based on the template pattern', () => {
      const createdRoutines: Routine[] = PPL.routines.map((r, i) => ({
        id: `id-${i}`,
        name: r.name,
        items: [],
        createdAt: '2026-05-07T10:00:00.000Z',
      }))
      mockAddRoutinesBatch.mockReturnValue(createdRoutines)

      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText(PPL.name))
      fireEvent.press(screen.getByText(/Apply/i))

      expect(mockSetDaySchedule).toHaveBeenCalledTimes(7)
    })

    it('calls onClose after applying the template', () => {
      mockAddRoutinesBatch.mockReturnValue([])
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText(PPL.name))
      fireEvent.press(screen.getByText(/Apply/i))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('does not call addRoutinesBatch when no template is selected', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      // No template selected — Apply button should not be present
      expect(screen.queryByText(/Apply/i)).toBeNull()
      expect(mockAddRoutinesBatch).not.toHaveBeenCalled()
    })
  })

  describe('Custom split', () => {
    it('shows a "Custom" option in the template list', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      expect(screen.getByText('Custom')).toBeTruthy()
    })

    it('shows routine name inputs when Custom is selected', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      expect(screen.getAllByPlaceholderText(/routine name/i).length).toBeGreaterThanOrEqual(1)
    })

    it('starts with two empty routine name inputs', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      expect(screen.getAllByPlaceholderText(/routine name/i)).toHaveLength(2)
    })

    it('shows an Add Routine button', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      expect(screen.getByText(/add routine/i)).toBeTruthy()
    })

    it('adds a new input when Add Routine is pressed', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      fireEvent.press(screen.getByText(/add routine/i))
      expect(screen.getAllByPlaceholderText(/routine name/i)).toHaveLength(3)
    })

    it('lets user type a routine name', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      const inputs = screen.getAllByPlaceholderText(/routine name/i)
      fireEvent.changeText(inputs[0], 'Strength')
      expect(inputs[0].props.value).toBe('Strength')
    })

    it('shows day assignment selectors when Custom is selected', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      // Each day label should be visible
      expect(screen.getByText('Mon')).toBeTruthy()
      expect(screen.getByText('Fri')).toBeTruthy()
    })

    it('does NOT show Apply when all routine names are empty', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      expect(screen.queryByText(/Apply/i)).toBeNull()
    })

    it('shows Apply button once at least one routine name is filled', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      const inputs = screen.getAllByPlaceholderText(/routine name/i)
      fireEvent.changeText(inputs[0], 'Strength')
      expect(screen.getByText(/Apply/i)).toBeTruthy()
    })

    it('calls addRoutinesBatch with the non-empty routine names on apply', () => {
      mockAddRoutinesBatch.mockReturnValue([
        { id: 'r1', name: 'Strength', items: [], createdAt: '' },
        { id: 'r2', name: 'Cardio', items: [], createdAt: '' },
      ])
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      const inputs = screen.getAllByPlaceholderText(/routine name/i)
      fireEvent.changeText(inputs[0], 'Strength')
      fireEvent.changeText(inputs[1], 'Cardio')
      fireEvent.press(screen.getByText(/Apply/i))
      expect(mockAddRoutinesBatch).toHaveBeenCalledWith([
        { name: 'Strength', items: [] },
        { name: 'Cardio', items: [] },
      ])
    })

    it('calls setDaySchedule for all 7 days on apply', () => {
      mockAddRoutinesBatch.mockReturnValue([
        { id: 'r1', name: 'Strength', items: [], createdAt: '' },
      ])
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      const inputs = screen.getAllByPlaceholderText(/routine name/i)
      fireEvent.changeText(inputs[0], 'Strength')
      fireEvent.press(screen.getByText(/Apply/i))
      expect(mockSetDaySchedule).toHaveBeenCalledTimes(7)
    })

    it('calls onClose after applying a custom split', () => {
      mockAddRoutinesBatch.mockReturnValue([
        { id: 'r1', name: 'Strength', items: [], createdAt: '' },
      ])
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      const inputs = screen.getAllByPlaceholderText(/routine name/i)
      fireEvent.changeText(inputs[0], 'Strength')
      fireEvent.press(screen.getByText(/Apply/i))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('skips empty routine name inputs when applying', () => {
      mockAddRoutinesBatch.mockReturnValue([
        { id: 'r1', name: 'Strength', items: [], createdAt: '' },
      ])
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Custom'))
      const inputs = screen.getAllByPlaceholderText(/routine name/i)
      fireEvent.changeText(inputs[0], 'Strength')
      // inputs[1] stays empty
      fireEvent.press(screen.getByText(/Apply/i))
      expect(mockAddRoutinesBatch).toHaveBeenCalledWith([
        { name: 'Strength', items: [] },
      ])
    })
  })

  describe('close', () => {
    it('calls onClose when cancel button is pressed', () => {
      render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText('Cancel'))
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('resets selection when reopened', () => {
      const { rerender } = render(<SplitTemplateModal {...defaultProps} />)
      fireEvent.press(screen.getByText(PPL.name))
      expect(screen.getByText(/Apply/i)).toBeTruthy()

      rerender(<SplitTemplateModal visible={false} onClose={defaultProps.onClose} />)
      rerender(<SplitTemplateModal visible={true} onClose={defaultProps.onClose} />)

      expect(screen.queryByText(/Apply/i)).toBeNull()
    })
  })
})

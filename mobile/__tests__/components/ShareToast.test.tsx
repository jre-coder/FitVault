import React from 'react'
import { render, act } from '@testing-library/react-native'
import ShareToast from '../../components/ShareToast'

describe('ShareToast', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('shows singular message for 1 workout', () => {
    const { getByText } = render(<ShareToast count={1} onDismiss={() => {}} />)
    expect(getByText('1 workout saved to FitVault')).toBeTruthy()
  })

  it('shows plural message for multiple workouts', () => {
    const { getByText } = render(<ShareToast count={3} onDismiss={() => {}} />)
    expect(getByText('3 workouts saved to FitVault')).toBeTruthy()
  })

  it('calls onDismiss after 3 seconds', () => {
    const onDismiss = jest.fn()
    render(<ShareToast count={1} onDismiss={onDismiss} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(3000) })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not call onDismiss before 3 seconds', () => {
    const onDismiss = jest.fn()
    render(<ShareToast count={1} onDismiss={onDismiss} />)
    act(() => { jest.advanceTimersByTime(2999) })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('clears the timer on unmount', () => {
    const onDismiss = jest.fn()
    const { unmount } = render(<ShareToast count={1} onDismiss={onDismiss} />)
    unmount()
    act(() => { jest.advanceTimersByTime(5000) })
    expect(onDismiss).not.toHaveBeenCalled()
  })
})

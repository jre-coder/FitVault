import { renderHook, act, waitFor } from '@testing-library/react-native'
import { AppState } from 'react-native'
import { usePendingShareItems } from '../../hooks/usePendingShareItems'
import * as shareStorage from '../../services/shareExtensionStorage'
import { PendingShareItem } from '../../types'

const mockAddWorkout = jest.fn()

jest.mock('../../context/WorkoutContext', () => ({
  useWorkouts: () => ({ addWorkout: mockAddWorkout }),
}))

jest.mock('../../services/shareExtensionStorage', () => ({
  readPendingShareItems: jest.fn(),
  clearPendingShareItems: jest.fn(),
}))

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: { OS: 'ios' },
}))

const mockRead = shareStorage.readPendingShareItems as jest.Mock
const mockClear = shareStorage.clearPendingShareItems as jest.Mock
const mockAddEventListener = AppState.addEventListener as jest.Mock

// Helpers to reach into the mock's recorded calls
function getAppStateHandler(): (state: string) => void {
  return mockAddEventListener.mock.calls[0][1]
}
function getRemoveFn(): jest.Mock {
  return mockAddEventListener.mock.results[0].value.remove
}

const sampleItem: PendingShareItem = {
  id: 'item1',
  url: 'https://www.tiktok.com/@user/video/123',
  title: 'Full Body HIIT',
  notes: 'Great warm-up',
  bodyParts: ['Full Body'],
  sourceType: 'tiktok',
  savedAt: '2026-04-20T10:00:00.000Z',
}

describe('usePendingShareItems', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRead.mockResolvedValue([])
    mockClear.mockResolvedValue(undefined)
    mockAddEventListener.mockReturnValue({ remove: jest.fn() })
  })

  it('checks for pending items on mount', async () => {
    const { unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1))
    unmount()
  })

  it('calls addWorkout for each pending item on mount', async () => {
    mockRead.mockResolvedValue([sampleItem])
    const { unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockAddWorkout).toHaveBeenCalledTimes(1))
    expect(mockAddWorkout).toHaveBeenCalledWith({
      title: sampleItem.title,
      url: sampleItem.url,
      sourceType: sampleItem.sourceType,
      bodyParts: sampleItem.bodyParts,
      notes: sampleItem.notes,
      isFavorite: false,
    })
    unmount()
  })

  it('clears the queue after processing items', async () => {
    mockRead.mockResolvedValue([sampleItem])
    const { unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1))
    unmount()
  })

  it('does not call addWorkout or clear when queue is empty', async () => {
    const { unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1))
    expect(mockAddWorkout).not.toHaveBeenCalled()
    expect(mockClear).not.toHaveBeenCalled()
    unmount()
  })

  it('processes multiple items in order', async () => {
    const item2 = { ...sampleItem, id: 'item2', title: 'Push Day' }
    mockRead.mockResolvedValue([sampleItem, item2])
    const { unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockAddWorkout).toHaveBeenCalledTimes(2))
    expect(mockAddWorkout.mock.calls[0][0].title).toBe('Full Body HIIT')
    expect(mockAddWorkout.mock.calls[1][0].title).toBe('Push Day')
    unmount()
  })

  it('defaults empty bodyParts to Full Body', async () => {
    mockRead.mockResolvedValue([{ ...sampleItem, bodyParts: [] }])
    const { unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() =>
      expect(mockAddWorkout).toHaveBeenCalledWith(
        expect.objectContaining({ bodyParts: ['Full Body'] })
      )
    )
    unmount()
  })

  it('re-checks on app foregrounding', async () => {
    const { unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1))

    mockRead.mockResolvedValue([sampleItem])
    await act(async () => {
      getAppStateHandler()('active')
    })
    await waitFor(() => expect(mockAddWorkout).toHaveBeenCalledTimes(1))
    expect(mockRead).toHaveBeenCalledTimes(2)
    unmount()
  })

  it('does not re-process while already processing', async () => {
    let resolveFirst!: (v: PendingShareItem[]) => void
    mockRead.mockReturnValueOnce(
      new Promise<PendingShareItem[]>((res) => { resolveFirst = res })
    )

    const { unmount } = renderHook(() => usePendingShareItems())
    getAppStateHandler()('active') // trigger second call while first is still pending

    await act(async () => { resolveFirst([sampleItem]) })
    await waitFor(() => expect(mockAddWorkout).toHaveBeenCalledTimes(1))
    unmount()
  })

  it('removes the AppState listener on unmount', async () => {
    const { unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1))
    const remove = getRemoveFn()
    unmount()
    expect(remove).toHaveBeenCalled()
  })

  it('returns recentlyAddedCount equal to number of processed items', async () => {
    mockRead.mockResolvedValue([sampleItem])
    const { result, unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(result.current.recentlyAddedCount).toBe(1))
    unmount()
  })

  it('accumulates recentlyAddedCount across multiple foreground events', async () => {
    mockRead.mockResolvedValue([sampleItem])
    const { result, unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(result.current.recentlyAddedCount).toBe(1))

    mockRead.mockResolvedValue([{ ...sampleItem, id: 'item2' }])
    await act(async () => { getAppStateHandler()('active') })
    await waitFor(() => expect(result.current.recentlyAddedCount).toBe(2))
    unmount()
  })

  it('clearRecentCount resets recentlyAddedCount to 0', async () => {
    mockRead.mockResolvedValue([sampleItem])
    const { result, unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(result.current.recentlyAddedCount).toBe(1))
    act(() => result.current.clearRecentCount())
    expect(result.current.recentlyAddedCount).toBe(0)
    unmount()
  })

  it('returns 0 recentlyAddedCount when queue is empty', async () => {
    const { result, unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1))
    expect(result.current.recentlyAddedCount).toBe(0)
    unmount()
  })

  it('skips items with empty URL and does not count them', async () => {
    mockRead.mockResolvedValue([{ ...sampleItem, url: '' }])
    const { result, unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1))
    expect(mockAddWorkout).not.toHaveBeenCalled()
    expect(result.current.recentlyAddedCount).toBe(0)
    unmount()
  })

  it('saves valid items and skips empty-URL items in the same batch', async () => {
    const emptyURL = { ...sampleItem, id: 'bad', url: '' }
    const valid = { ...sampleItem, id: 'good' }
    mockRead.mockResolvedValue([emptyURL, valid])
    const { result, unmount } = renderHook(() => usePendingShareItems())
    await waitFor(() => expect(result.current.recentlyAddedCount).toBe(1))
    expect(mockAddWorkout).toHaveBeenCalledTimes(1)
    expect(mockAddWorkout.mock.calls[0][0].url).toBe(sampleItem.url)
    unmount()
  })
})

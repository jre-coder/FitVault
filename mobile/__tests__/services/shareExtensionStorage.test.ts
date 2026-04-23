import { NativeModules, Platform } from 'react-native'
import { readPendingShareItems, clearPendingShareItems } from '../../services/shareExtensionStorage'
import { PendingShareItem } from '../../types'

jest.mock('react-native', () => ({
  NativeModules: {
    SharedDefaultsBridge: {
      readPendingItems: jest.fn(),
      clearPendingItems: jest.fn(),
    },
  },
  Platform: { OS: 'ios' },
}))

// Access mock functions via NativeModules after jest.mock is in place
const mockBridge = NativeModules.SharedDefaultsBridge as {
  readPendingItems: jest.Mock
  clearPendingItems: jest.Mock
}

const sampleItem: PendingShareItem = {
  id: 'abc123',
  url: 'https://www.tiktok.com/@user/video/123',
  title: 'Leg Day Workout',
  notes: 'Great for beginners',
  bodyParts: ['Legs'],
  sourceType: 'tiktok',
  savedAt: '2026-04-20T10:00:00.000Z',
}

describe('readPendingShareItems', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns parsed items when native module returns valid JSON array', async () => {
    mockBridge.readPendingItems.mockResolvedValue(JSON.stringify([sampleItem]))
    const result = await readPendingShareItems()
    expect(result).toEqual([sampleItem])
  })

  it('returns multiple items', async () => {
    const items = [sampleItem, { ...sampleItem, id: 'def456', title: 'Push Day' }]
    mockBridge.readPendingItems.mockResolvedValue(JSON.stringify(items))
    const result = await readPendingShareItems()
    expect(result).toHaveLength(2)
    expect(result[1].title).toBe('Push Day')
  })

  it('returns empty array when native module returns empty JSON array', async () => {
    mockBridge.readPendingItems.mockResolvedValue('[]')
    const result = await readPendingShareItems()
    expect(result).toEqual([])
  })

  it('returns empty array on malformed JSON', async () => {
    mockBridge.readPendingItems.mockResolvedValue('not valid json {{')
    const result = await readPendingShareItems()
    expect(result).toEqual([])
  })

  it('returns empty array when JSON is a non-array value', async () => {
    mockBridge.readPendingItems.mockResolvedValue('{"title":"oops"}')
    const result = await readPendingShareItems()
    expect(result).toEqual([])
  })

  it('returns empty array when native module rejects', async () => {
    mockBridge.readPendingItems.mockRejectedValue(new Error('native crash'))
    const result = await readPendingShareItems()
    expect(result).toEqual([])
  })

  it('returns empty array on non-iOS platform', async () => {
    ;(Platform as { OS: string }).OS = 'android'
    const result = await readPendingShareItems()
    expect(result).toEqual([])
    ;(Platform as { OS: string }).OS = 'ios'
  })

  it('returns empty array when native module is not available', async () => {
    const original = NativeModules.SharedDefaultsBridge
    ;(NativeModules as Record<string, unknown>).SharedDefaultsBridge = undefined
    const result = await readPendingShareItems()
    expect(result).toEqual([])
    ;(NativeModules as Record<string, unknown>).SharedDefaultsBridge = original
  })
})

describe('clearPendingShareItems', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls native clearPendingItems', async () => {
    mockBridge.clearPendingItems.mockResolvedValue(null)
    await clearPendingShareItems()
    expect(mockBridge.clearPendingItems).toHaveBeenCalledTimes(1)
  })

  it('resolves without throwing when native module rejects', async () => {
    mockBridge.clearPendingItems.mockRejectedValue(new Error('storage error'))
    await expect(clearPendingShareItems()).resolves.toBeUndefined()
  })

  it('does nothing on non-iOS platform', async () => {
    ;(Platform as { OS: string }).OS = 'android'
    await clearPendingShareItems()
    expect(mockBridge.clearPendingItems).not.toHaveBeenCalled()
    ;(Platform as { OS: string }).OS = 'ios'
  })

  it('does nothing when native module is not available', async () => {
    const original = NativeModules.SharedDefaultsBridge
    ;(NativeModules as Record<string, unknown>).SharedDefaultsBridge = undefined
    await expect(clearPendingShareItems()).resolves.toBeUndefined()
    ;(NativeModules as Record<string, unknown>).SharedDefaultsBridge = original
  })
})

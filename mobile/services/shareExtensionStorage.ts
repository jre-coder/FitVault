import { NativeModules, Platform } from 'react-native'
import { PendingShareItem } from '../types'

const bridge = () => NativeModules.SharedDefaultsBridge as {
  readPendingItems: () => Promise<string>
  clearPendingItems: () => Promise<null>
} | undefined

export async function readPendingShareItems(): Promise<PendingShareItem[]> {
  if (Platform.OS !== 'ios') return []
  const mod = bridge()
  console.log('[ShareExt] bridge available:', !!mod, '| all NativeModules:', Object.keys(NativeModules).filter(k => k.toLowerCase().includes('share') || k.toLowerCase().includes('default') || k.toLowerCase().includes('bridge')))
  if (!mod) return []
  try {
    const json = await mod.readPendingItems()
    console.log('[ShareExt] readPendingItems raw:', json)
    const parsed: unknown = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed as PendingShareItem[]
  } catch (e) {
    console.log('[ShareExt] readPendingItems error:', e)
    return []
  }
}

export async function clearPendingShareItems(): Promise<void> {
  if (Platform.OS !== 'ios') return
  const mod = bridge()
  if (!mod) return
  try {
    await mod.clearPendingItems()
  } catch {
    // ignore — items will be re-read next time but are idempotent
  }
}

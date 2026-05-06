import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_PREFIX = 'aiCache:'

export const TTL_24H = 24 * 60 * 60 * 1000
export const TTL_7D = 7 * 24 * 60 * 60 * 1000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

function stableStringify(val: unknown): string {
  if (Array.isArray(val)) return '[' + [...val].sort().map(stableStringify).join(',') + ']'
  if (val !== null && typeof val === 'object') {
    const keys = Object.keys(val as object).sort()
    return '{' + keys.map(k => `"${k}":${stableStringify((val as Record<string, unknown>)[k])}`).join(',') + '}'
  }
  return JSON.stringify(val)
}

export function hashParams(params: object): string {
  const str = stableStringify(params)
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

export async function getCachedResults<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(KEY_PREFIX + key)
      return null
    }
    return entry.value
  } catch {
    return null
  }
}

export async function setCachedResults<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs }
    await AsyncStorage.setItem(KEY_PREFIX + key, JSON.stringify(entry))
  } catch {
    // Cache write failure is non-fatal
  }
}

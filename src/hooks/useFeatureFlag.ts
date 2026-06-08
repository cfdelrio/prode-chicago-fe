import { useState, useEffect } from 'react'

const FF_PREFIX = 'ff_'

export function getFeatureFlag(key: string): boolean {
  try {
    return localStorage.getItem(`${FF_PREFIX}${key}`) === 'true'
  } catch {
    return false
  }
}

export function setFeatureFlag(key: string, value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(`${FF_PREFIX}${key}`, 'true')
    } else {
      localStorage.removeItem(`${FF_PREFIX}${key}`)
    }
    window.dispatchEvent(new StorageEvent('storage', { key: `${FF_PREFIX}${key}`, newValue: value ? 'true' : null }))
  } catch {
    // Silently ignore storage errors (private mode, quota exceeded)
  }
}

export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState(() => getFeatureFlag(key))

  useEffect(() => {
    const storageKey = `${FF_PREFIX}${key}`
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        setEnabled(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key])

  return enabled
}

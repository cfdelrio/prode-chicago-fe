import { useState } from 'react'

const AB_PREFIX = 'ab_'

function hashUserId(userId: string): number {
  let h = 0
  for (let i = 0; i < userId.length; i++) {
    h = Math.imul(31, h) + userId.charCodeAt(i) | 0
  }
  return (Math.abs(h) % 10_000) / 10_000
}

export type ABVariant = 'control' | 'test'

export function getABVariant(key: string, userId: string, ratio = 0.5): ABVariant {
  try {
    const stored = localStorage.getItem(`${AB_PREFIX}${key}`)
    if (stored === 'control' || stored === 'test') return stored
    const variant: ABVariant = hashUserId(userId) < ratio ? 'test' : 'control'
    localStorage.setItem(`${AB_PREFIX}${key}`, variant)
    return variant
  } catch {
    return 'control'
  }
}

export function useABTest(key: string, userId: string | null, ratio = 0.5): ABVariant {
  const [variant] = useState<ABVariant>(() => {
    if (!userId) return 'control'
    return getABVariant(key, userId, ratio)
  })
  return variant
}

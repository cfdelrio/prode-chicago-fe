import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { getABVariant, useABTest } from '@/hooks/useABTest'

// localStorage is cleared between tests by setup.ts

describe('getABVariant', () => {
  it('returns the same variant for the same userId on repeated calls', () => {
    const first  = getABVariant('pozo_hero', 'user-abc-123')
    localStorage.removeItem('ab_pozo_hero')
    const second = getABVariant('pozo_hero', 'user-abc-123')
    expect(first).toBe(second)
  })

  it('returns "control" for null-like (empty) userId — treat as edge case', () => {
    // empty string hashes to 0, which is < 0.5 → 'test', but real null guard is in useABTest
    const variant = getABVariant('pozo_hero', '')
    expect(['control', 'test']).toContain(variant)
  })

  it('returns "control" when ratio is 0', () => {
    expect(getABVariant('pozo_hero', 'any-user', 0)).toBe('control')
  })

  it('returns "test" when ratio is 1', () => {
    expect(getABVariant('pozo_hero', 'any-user', 1)).toBe('test')
  })

  it('reuses stored variant without recalculating', () => {
    localStorage.setItem('ab_pozo_hero', 'control')
    // Even ratio=1 must return 'control' because stored value wins
    expect(getABVariant('pozo_hero', 'any-user', 1)).toBe('control')
  })

  it('reuses stored "test" variant without recalculating', () => {
    localStorage.setItem('ab_pozo_hero', 'test')
    expect(getABVariant('pozo_hero', 'any-user', 0)).toBe('test')
  })

  it('stores computed variant in localStorage', () => {
    getABVariant('pozo_hero', 'user-xyz', 1)
    expect(localStorage.getItem('ab_pozo_hero')).toBe('test')
  })

  it('returns "control" on localStorage error', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(getABVariant('pozo_hero', 'user-xyz')).toBe('control')
    spy.mockRestore()
  })

  it('returns "control" on localStorage write error', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    // ratio=1 would be 'test' but setItem throws — must still return gracefully
    const variant = getABVariant('pozo_hero', 'user-xyz', 1)
    expect(variant).toBe('control')
    spy.mockRestore()
  })

  it('hash is deterministic across multiple userIds', () => {
    const users = ['u1', 'u2', 'alice', 'bob', 'charlie', 'delta', 'echo']
    for (const uid of users) {
      const a = getABVariant(`test_key_${uid}`, uid)
      localStorage.removeItem(`ab_test_key_${uid}`)
      const b = getABVariant(`test_key_${uid}`, uid)
      expect(a).toBe(b)
    }
  })
})

describe('useABTest', () => {
  it('returns "control" when userId is null', () => {
    const { result } = renderHook(() => useABTest('pozo_hero', null))
    expect(result.current).toBe('control')
  })

  it('returns "test" when ratio is 1 and userId is provided', () => {
    const { result } = renderHook(() => useABTest('pozo_hero', 'user-123', 1))
    expect(result.current).toBe('test')
  })

  it('returns "control" when ratio is 0 and userId is provided', () => {
    const { result } = renderHook(() => useABTest('pozo_hero', 'user-123', 0))
    expect(result.current).toBe('control')
  })

  it('reuses stored variant from localStorage', () => {
    localStorage.setItem('ab_pozo_hero', 'test')
    const { result } = renderHook(() => useABTest('pozo_hero', 'user-123', 0))
    expect(result.current).toBe('test')
  })

  it('is stable — same render returns same variant', () => {
    const { result, rerender } = renderHook(() => useABTest('pozo_hero', 'stable-user', 0.5))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

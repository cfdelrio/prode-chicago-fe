import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { getFeatureFlag, setFeatureFlag, useFeatureFlag } from '@/hooks/useFeatureFlag'

// localStorage is cleared between tests by setup.ts

describe('getFeatureFlag', () => {
  it('returns false when key is not set', () => {
    expect(getFeatureFlag('pozo_hero')).toBe(false)
  })

  it('returns true when localStorage has "true" for the key', () => {
    localStorage.setItem('ff_pozo_hero', 'true')
    expect(getFeatureFlag('pozo_hero')).toBe(true)
  })

  it('returns false when localStorage has "false" for the key', () => {
    localStorage.setItem('ff_pozo_hero', 'false')
    expect(getFeatureFlag('pozo_hero')).toBe(false)
  })

  it('returns false when localStorage has any non-"true" value', () => {
    localStorage.setItem('ff_pozo_hero', '1')
    expect(getFeatureFlag('pozo_hero')).toBe(false)
  })

  it('handles localStorage access errors gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(getFeatureFlag('pozo_hero')).toBe(false)
    spy.mockRestore()
  })
})

describe('setFeatureFlag', () => {
  it('sets localStorage key to "true" when value is true', () => {
    setFeatureFlag('pozo_hero', true)
    expect(localStorage.getItem('ff_pozo_hero')).toBe('true')
  })

  it('removes localStorage key when value is false', () => {
    localStorage.setItem('ff_pozo_hero', 'true')
    setFeatureFlag('pozo_hero', false)
    expect(localStorage.getItem('ff_pozo_hero')).toBeNull()
  })

  it('dispatches a storage event with the correct key', () => {
    const events: StorageEvent[] = []
    const handler = (e: StorageEvent) => events.push(e)
    window.addEventListener('storage', handler)

    setFeatureFlag('pozo_hero', true)

    window.removeEventListener('storage', handler)
    expect(events).toHaveLength(1)
    expect(events[0].key).toBe('ff_pozo_hero')
    expect(events[0].newValue).toBe('true')
  })

  it('dispatches a storage event with newValue null when disabling', () => {
    const events: StorageEvent[] = []
    const handler = (e: StorageEvent) => events.push(e)
    window.addEventListener('storage', handler)

    setFeatureFlag('pozo_hero', false)

    window.removeEventListener('storage', handler)
    expect(events[0].newValue).toBeNull()
  })

  it('handles localStorage write errors gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => setFeatureFlag('test_key', true)).not.toThrow()
    spy.mockRestore()
  })
})

describe('useFeatureFlag', () => {
  it('returns false when flag is not set', () => {
    const { result } = renderHook(() => useFeatureFlag('pozo_hero'))
    expect(result.current).toBe(false)
  })

  it('returns true when flag is set in localStorage before render', () => {
    localStorage.setItem('ff_pozo_hero', 'true')
    const { result } = renderHook(() => useFeatureFlag('pozo_hero'))
    expect(result.current).toBe(true)
  })

  it('updates to true when storage event fires with "true"', () => {
    const { result } = renderHook(() => useFeatureFlag('pozo_hero'))
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'ff_pozo_hero', newValue: 'true' }))
    })

    expect(result.current).toBe(true)
  })

  it('updates to false when storage event fires with null', () => {
    localStorage.setItem('ff_pozo_hero', 'true')
    const { result } = renderHook(() => useFeatureFlag('pozo_hero'))
    expect(result.current).toBe(true)

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'ff_pozo_hero', newValue: null }))
    })

    expect(result.current).toBe(false)
  })

  it('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useFeatureFlag('pozo_hero'))

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'ff_other_flag', newValue: 'true' }))
    })

    expect(result.current).toBe(false)
  })

  it('removes event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useFeatureFlag('pozo_hero'))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function))
    removeSpy.mockRestore()
  })
})

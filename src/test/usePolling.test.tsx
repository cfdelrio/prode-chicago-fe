import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePolling } from '@/hooks/usePolling'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setHidden(false)
  })
  afterEach(() => {
    vi.useRealTimers()
    setHidden(false)
  })

  it('ejecuta callback cada intervalMs cuando active=true', () => {
    const cb = vi.fn()
    renderHook(() => usePolling(cb, 1000, true))
    expect(cb).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(cb).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('active=false → nunca ejecuta callback', () => {
    const cb = vi.fn()
    renderHook(() => usePolling(cb, 500, false))
    act(() => { vi.advanceTimersByTime(2000) })
    expect(cb).not.toHaveBeenCalled()
  })

  it('cuando la pestaña se oculta, pausa; al volverse visible, ejecuta inmediato y resume', () => {
    const cb = vi.fn()
    renderHook(() => usePolling(cb, 1000, true))

    act(() => { vi.advanceTimersByTime(1000) })
    expect(cb).toHaveBeenCalledTimes(1)

    // Ocultar pestaña → pausa
    setHidden(true)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    act(() => { vi.advanceTimersByTime(5000) })
    expect(cb).toHaveBeenCalledTimes(1) // no progress mientras oculta

    // Volver visible → catch-up call + resume
    setHidden(false)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(cb).toHaveBeenCalledTimes(2)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('si arranca con pestaña oculta no inicia el intervalo hasta que se vuelva visible', () => {
    setHidden(true)
    const cb = vi.fn()
    renderHook(() => usePolling(cb, 1000, true))
    act(() => { vi.advanceTimersByTime(3000) })
    expect(cb).not.toHaveBeenCalled()

    setHidden(false)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('llamar a visibilitychange dos veces seguidas en visible no duplica el intervalo', () => {
    const cb = vi.fn()
    renderHook(() => usePolling(cb, 1000, true))
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    act(() => { vi.advanceTimersByTime(1000) })
    // Cada visibilitychange (visible) hace un catch-up call y reusa el mismo interval
    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(cb.mock.calls.length).toBeLessThanOrEqual(3)
  })

  it('unmount limpia el intervalo y el listener', () => {
    const cb = vi.fn()
    const { unmount } = renderHook(() => usePolling(cb, 1000, true))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(cb).toHaveBeenCalledTimes(1)
    unmount()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(cb).toHaveBeenCalledTimes(1)
    // visibilitychange después del unmount no debería disparar el callback
    setHidden(false)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('callback actualizado se ejecuta vía ref sin reiniciar el intervalo', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const { rerender } = renderHook(({ fn }) => usePolling(fn, 1000, true), {
      initialProps: { fn: cb1 },
    })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(cb1).toHaveBeenCalledTimes(1)
    rerender({ fn: cb2 })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(cb1).toHaveBeenCalledTimes(1)
    expect(cb2).toHaveBeenCalledTimes(1)
  })
})

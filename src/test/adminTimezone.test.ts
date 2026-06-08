import { describe, it, expect } from 'vitest'

// Inline the helpers (same logic as Admin.tsx) to test them in isolation
const toArgentinaInput = (utcStr: string) => {
  const d = new Date(utcStr)
  const argMs = d.getTime() - 3 * 60 * 60 * 1000
  return new Date(argMs).toISOString().slice(0, 16)
}
const fromArgentinaInput = (local: string) => local ? local + ':00-03:00' : local

describe('toArgentinaInput', () => {
  it('converts UTC to Argentina (UTC-3)', () => {
    // 23:20 UTC → 20:20 Argentina
    expect(toArgentinaInput('2026-05-15T23:20:00.000Z')).toBe('2026-05-15T20:20')
  })

  it('handles midnight crossover', () => {
    // 01:00 UTC → 22:00 previous day Argentina
    expect(toArgentinaInput('2026-05-16T01:00:00.000Z')).toBe('2026-05-15T22:00')
  })

  it('round-trips with fromArgentinaInput', () => {
    const utc = '2026-06-14T02:00:00.000Z'
    const argInput = toArgentinaInput(utc)           // '2026-06-13T23:00'
    const roundTrip = new Date(fromArgentinaInput(argInput)).toISOString()
    expect(roundTrip).toBe(utc)
  })
})

describe('fromArgentinaInput', () => {
  it('appends -03:00 offset', () => {
    expect(fromArgentinaInput('2026-05-15T23:20')).toBe('2026-05-15T23:20:00-03:00')
  })

  it('converts Argentina 23:20 to correct UTC', () => {
    const utc = new Date(fromArgentinaInput('2026-05-15T23:20')).toISOString()
    expect(utc).toBe('2026-05-16T02:20:00.000Z')
  })

  it('returns empty string unchanged', () => {
    expect(fromArgentinaInput('')).toBe('')
  })
})

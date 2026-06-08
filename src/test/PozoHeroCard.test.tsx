import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PozoHeroCard, calcPozoStats, formatMoney, PRICE_PER_PLANILLA } from '@/components/PozoHeroCard'
import type { RankingEntry } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<RankingEntry> = {}): RankingEntry {
  return {
    planilla_id: 'p1',
    nombre_planilla: 'Planilla 1',
    user_id: 'u1',
    user_name: 'Test User',
    puntos_totales: 0,
    exactos_count: 0,
    aciertos_celeste: 0,
    aciertos_rojo: 0,
    aciertos_verde: 0,
    aciertos_amarillo: 0,
    position: 1,
    precio_pagado: false,
    ...overrides,
  }
}

const NOW = new Date('2026-06-04T12:00:00Z')

// ─── formatMoney ──────────────────────────────────────────────────────────────

describe('formatMoney', () => {
  it('formats 0 correctly', () => {
    expect(formatMoney(0)).toBe('$0')
  })

  it('formats 20000 with Argentine thousand separator', () => {
    const result = formatMoney(20_000)
    expect(result).toMatch(/^\$/)
    expect(result).toContain('20')
  })

  it('formats 360000 starting with $', () => {
    expect(formatMoney(360_000)).toMatch(/^\$/)
  })

  it('formats 840000 starting with $', () => {
    expect(formatMoney(840_000)).toMatch(/^\$/)
  })
})

// ─── PRICE_PER_PLANILLA ───────────────────────────────────────────────────────

describe('PRICE_PER_PLANILLA', () => {
  it('is 20000', () => {
    expect(PRICE_PER_PLANILLA).toBe(20_000)
  })
})

// ─── calcPozoStats ────────────────────────────────────────────────────────────

describe('calcPozoStats', () => {
  it('returns all zeros for empty ranking', () => {
    const stats = calcPozoStats([])
    expect(stats).toEqual({ totalPlayers: 0, paidPlayers: 0, paidPct: 0, recaudado: 0, pozoTotal: 0 })
  })

  it('counts totalPlayers as ranking.length', () => {
    const ranking = [makeEntry(), makeEntry({ planilla_id: 'p2', user_id: 'u2' })]
    expect(calcPozoStats(ranking).totalPlayers).toBe(2)
  })

  it('counts paidPlayers as entries with precio_pagado = true', () => {
    const ranking = [
      makeEntry({ precio_pagado: true }),
      makeEntry({ planilla_id: 'p2', precio_pagado: false }),
      makeEntry({ planilla_id: 'p3', precio_pagado: true }),
    ]
    expect(calcPozoStats(ranking).paidPlayers).toBe(2)
  })

  it('computes paidPct correctly', () => {
    const ranking = [
      makeEntry({ precio_pagado: true }),
      makeEntry({ planilla_id: 'p2', precio_pagado: false }),
      makeEntry({ planilla_id: 'p3', precio_pagado: false }),
      makeEntry({ planilla_id: 'p4', precio_pagado: false }),
    ]
    expect(calcPozoStats(ranking).paidPct).toBe(25)
  })

  it('rounds paidPct correctly (floor semantics)', () => {
    // 1/3 = 33.33... → rounds to 33
    const ranking = [
      makeEntry({ precio_pagado: true }),
      makeEntry({ planilla_id: 'p2', precio_pagado: false }),
      makeEntry({ planilla_id: 'p3', precio_pagado: false }),
    ]
    expect(calcPozoStats(ranking).paidPct).toBe(33)
  })

  it('computes recaudado = paidPlayers * PRICE_PER_PLANILLA', () => {
    const ranking = [
      makeEntry({ precio_pagado: true }),
      makeEntry({ planilla_id: 'p2', precio_pagado: true }),
      makeEntry({ planilla_id: 'p3', precio_pagado: false }),
    ]
    expect(calcPozoStats(ranking).recaudado).toBe(2 * PRICE_PER_PLANILLA)
  })

  it('computes pozoTotal = totalPlayers * PRICE_PER_PLANILLA', () => {
    const ranking = [makeEntry(), makeEntry({ planilla_id: 'p2' }), makeEntry({ planilla_id: 'p3' })]
    expect(calcPozoStats(ranking).pozoTotal).toBe(3 * PRICE_PER_PLANILLA)
  })

  it('paidPct is 100 when all players paid', () => {
    const ranking = [
      makeEntry({ precio_pagado: true }),
      makeEntry({ planilla_id: 'p2', precio_pagado: true }),
    ]
    expect(calcPozoStats(ranking).paidPct).toBe(100)
  })

  it('paidPct is 0 when no players paid', () => {
    const ranking = [makeEntry({ precio_pagado: false }), makeEntry({ planilla_id: 'p2', precio_pagado: false })]
    expect(calcPozoStats(ranking).paidPct).toBe(0)
  })
})

// ─── PozoHeroCard component ───────────────────────────────────────────────────

describe('PozoHeroCard', () => {
  const paidEntry = makeEntry({ precio_pagado: true })
  const unpaidEntry1 = makeEntry({ planilla_id: 'p2', precio_pagado: false })
  const unpaidEntry2 = makeEntry({ planilla_id: 'p3', precio_pagado: false })
  const ranking = [paidEntry, unpaidEntry1, unpaidEntry2]

  it('renders "EL PREMIO CRECE" badge', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    expect(screen.getByText(/EL PREMIO CRECE/i)).toBeInTheDocument()
  })

  it('renders "PRODE 2026" badge', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    expect(screen.getByText(/PRODE 2026/i)).toBeInTheDocument()
  })

  it('renders the main title', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toMatch(/EL PREMIO/i)
    expect(heading.textContent).toMatch(/ESTA X EXPLOTAR/i)
  })

  it('renders the main social proof line', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    expect(screen.getByText(/1 de 3 jugadores ya están adentro/i)).toBeInTheDocument()
  })

  it('renders the prize potential line', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    expect(screen.getByText(/El premio potencial ya alcanza los/i)).toBeInTheDocument()
  })

  it('renders the remaining players line when not all paid', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    // 3 total - 1 paid = 2 remaining
    expect(screen.getByText(/Todavía faltan 2 para completar el premio máximo/i)).toBeInTheDocument()
  })

  it('does not render remaining line when all players paid', () => {
    const allPaid = [
      makeEntry({ precio_pagado: true }),
      makeEntry({ planilla_id: 'p2', precio_pagado: true }),
    ]
    render(<PozoHeroCard ranking={allPaid} now={NOW} />)
    expect(screen.queryByText(/Todavía faltan/i)).not.toBeInTheDocument()
  })

  it('shows correct paidPlayers count (1 of 3)', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    const label = screen.getByLabelText(/1 jugadores pagaron/i)
    expect(label).toBeInTheDocument()
  })

  it('shows "de 3 jugadores" in the paid players block', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    // The exact small label inside bloque 1: "de 3 jugadores"
    expect(screen.getAllByText(/de 3 jugadores/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows 33% paidPct', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('renders progress bar with aria attributes', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '33')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('shows formatted recaudado amount', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    const label = screen.getByLabelText(/Recaudado:/i)
    expect(label).toBeInTheDocument()
    // 1 paid * $20,000
    expect(label.textContent).toMatch(/^\$/)
  })

  it('shows formatted pozoTotal amount', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    const label = screen.getByLabelText(/Pozo potencial:/i)
    expect(label).toBeInTheDocument()
    // 3 total * $20,000
    expect(label.textContent).toMatch(/^\$/)
  })

  it('shows "si pagan los 3 anotados"', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    expect(screen.getByText(/si pagan los 3 anotados/i)).toBeInTheDocument()
  })

  it('renders the date', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    // date shown in footer: "jueves, 4 jun 2026"
    const dateEl = document.querySelector('p.text-white\\/25')
    expect(dateEl?.textContent).toMatch(/2026/i)
  })

  it('renders correctly with empty ranking (zero state)', () => {
    render(<PozoHeroCard ranking={[]} now={NOW} />)
    expect(screen.getByText(/EL PREMIO CRECE/i)).toBeInTheDocument()
    expect(screen.getByText(/0 de 0 jugadores ya están adentro/i)).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('shows 100% when all players paid', () => {
    const allPaid = [
      makeEntry({ precio_pagado: true }),
      makeEntry({ planilla_id: 'p2', precio_pagado: true }),
    ]
    render(<PozoHeroCard ranking={allPaid} now={NOW} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows "de planilla" price info in Recaudado block', () => {
    render(<PozoHeroCard ranking={ranking} now={NOW} />)
    expect(screen.getByText(/c\/planilla/i)).toBeInTheDocument()
  })
})

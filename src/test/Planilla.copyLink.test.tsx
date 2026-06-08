import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Planilla } from '@/pages/Planilla'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({ badges: {}, loadBadges: vi.fn() }),
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({ match }: { match: { id: string; home_team: string; away_team: string } }) => (
    <div data-testid="match-card">{match.home_team} vs {match.away_team}</div>
  ),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}))

const PLANILLA = {
  id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true,
  puntos_totales: 15, exactos_count: 3,
}

async function setupApi() {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/planillas/')) return Promise.resolve({ data: { data: PLANILLA } })
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: [] } } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderPlanilla() {
  return render(
    <MemoryRouter initialEntries={['/planilla/p1']}>
      <Routes><Route path="/planilla/:planillaId" element={<Planilla />} /></Routes>
    </MemoryRouter>
  )
}

describe('Planilla — botón Copiar link', () => {
  beforeEach(() => {
    mockShow.mockReset()
  })
  afterEach(() => vi.clearAllMocks())

  it('muestra el botón con aria-label "Copiar link"', async () => {
    await setupApi()
    renderPlanilla()
    await waitFor(() => expect(screen.getByLabelText('Copiar link')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('al click llama a navigator.clipboard.writeText con la URL actual', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    await setupApi()
    renderPlanilla()
    const btn = await screen.findByLabelText('Copiar link')
    await userEvent.click(btn)

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toBe(window.location.href)
  })

  it('toast de éxito cuando copia funciona', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    })

    await setupApi()
    renderPlanilla()
    await userEvent.click(await screen.findByLabelText('Copiar link'))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('Link copiado ✓', 'success')
    })
  })

  it('toast de error cuando clipboard.writeText rechaza', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      writable: true,
      configurable: true,
    })

    await setupApi()
    renderPlanilla()
    await userEvent.click(await screen.findByLabelText('Copiar link'))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('No se pudo copiar', 'error')
    })
  })
})

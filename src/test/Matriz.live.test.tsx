import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Matriz } from '@/pages/Matriz'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = {
      user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' },
      isAdmin: () => false,
    }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ addToast: vi.fn(), show: vi.fn() }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({ badges: {}, loadBadges: vi.fn() }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

function makeMatch(id: string, estado: 'scheduled' | 'live' | 'finished') {
  return {
    id, home_team: `Home${id}`, away_team: `Away${id}`,
    estado, finished: estado === 'finished',
    resultado_local: estado === 'finished' ? 1 : null,
    resultado_visitante: estado === 'finished' ? 0 : null,
    time_cutoff: '2026-04-01T00:00:00Z',
    start_time: '2026-04-01T00:00:00Z',
    halftime_minutes: 0,
  }
}

const RANKING = [
  { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos', puntos_totales: 0, position: 1, precio_pagado: true },
]

async function setupApi(matches: ReturnType<typeof makeMatch>[]) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
    if (url.startsWith('/ranking/favorites')) return Promise.resolve({ data: { data: [] } })
    if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: RANKING } } })
    if (url.includes('/bets/all-for-matrix')) return Promise.resolve({ data: { data: {} } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderMatriz() {
  return render(<MemoryRouter><Matriz /></MemoryRouter>)
}

describe('Matriz — indicador LIVE', () => {
  afterEach(() => vi.clearAllMocks())

  it('NO muestra el chip LIVE si no hay partidos en estado live', async () => {
    await setupApi([makeMatch('m1', 'scheduled'), makeMatch('m2', 'finished')])
    renderMatriz()
    await waitFor(() => expect(screen.queryByText('LIVE')).not.toBeInTheDocument(), { timeout: 3000 })
  })

  it('muestra el chip LIVE cuando al menos un partido está en estado live', async () => {
    await setupApi([makeMatch('m1', 'scheduled'), makeMatch('m2', 'live')])
    renderMatriz()
    await waitFor(() => expect(screen.getByText('LIVE')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('el chip LIVE tiene aria-live="polite" para que screen readers anuncien el cambio', async () => {
    await setupApi([makeMatch('m1', 'live')])
    renderMatriz()
    await waitFor(() => {
      const chip = screen.getByText('LIVE').closest('[aria-live]')
      expect(chip).not.toBeNull()
      expect(chip).toHaveAttribute('aria-live', 'polite')
    }, { timeout: 3000 })
  })
})

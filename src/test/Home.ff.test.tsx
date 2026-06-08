import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Home } from '@/pages/Home'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ addToast: vi.fn(), show: vi.fn() }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({ state: { type: 'unavailable' }, install: vi.fn() }),
}))

vi.mock('@/pages/LeaderHome', () => ({
  LeaderHome: () => <div data-testid="leader-home" />,
}))

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({}),
  getTeamBadge: () => null,
}))

vi.mock('@/components/match/MatchCard', () => ({
  MatchCard: ({ match }: { match: { home_team: string; away_team: string } }) => (
    <div data-testid="match-card">{match.home_team} vs {match.away_team}</div>
  ),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLANILLA_UNPAID = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: false, locked: false }
const PLANILLA_PAID   = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true,  locked: false }

// Partido pendiente dentro de la ventana de 7 días (sin apuesta asociada)
const PENDING_MATCH = {
  id: 'm1', home_team: 'Argentina', away_team: 'Brasil',
  start_time: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
  time_cutoff: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
  estado: 'pending', finished: false,
}

// u1 must NOT be at position 1 with points > 0, otherwise Home redirects to LeaderHome
const RANKING_ENTRIES = [
  { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos', nombre_planilla: 'Mi planilla', puntos_totales: 0, exactos_count: 0, aciertos_celeste: 0, aciertos_rojo: 0, aciertos_verde: 0, aciertos_amarillo: 0, position: 3, precio_pagado: true },
  { planilla_id: 'p2', user_id: 'u2', user_name: 'Ana', nombre_planilla: 'Planilla 2', puntos_totales: 5, exactos_count: 0, aciertos_celeste: 0, aciertos_rojo: 0, aciertos_verde: 0, aciertos_amarillo: 0, position: 1, precio_pagado: false },
  { planilla_id: 'p3', user_id: 'u3', user_name: 'Juan', nombre_planilla: 'Planilla 3', puntos_totales: 3, exactos_count: 0, aciertos_celeste: 0, aciertos_rojo: 0, aciertos_verde: 0, aciertos_amarillo: 0, position: 2, precio_pagado: false },
]

async function setupApi(paid = false, matches: unknown[] = []) {
  const planilla = paid ? PLANILLA_PAID : PLANILLA_UNPAID
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches } } })
    if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [planilla] } })
    if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: RANKING_ENTRIES } } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

afterEach(() => vi.clearAllMocks())

// ─── PozoHeroCard — usuario NO pagó ──────────────────────────────────────────

describe('Home — PozoHeroCard (precio_pagado: false)', () => {
  it('muestra "EL PREMIO CRECE"', async () => {
    await setupApi(false)
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/EL PREMIO CRECE/i)).toBeInTheDocument()
    })
  })

  it('no muestra el título "EL MUNDIAL"', async () => {
    await setupApi(false)
    renderHome()
    await waitFor(() => {
      expect(screen.queryByText(/EL MUNDIAL/i)).not.toBeInTheDocument()
    })
  })

  it('muestra métricas de jugadores que pagaron', async () => {
    await setupApi(false)
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/¿Cuántos ya pagaron\?/i)).toBeInTheDocument()
    })
  })

  it('muestra métricas de recaudado', async () => {
    await setupApi(false)
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/¿Cuánto recaudado\?/i)).toBeInTheDocument()
    })
  })

  it('muestra métricas del pozo potencial', async () => {
    await setupApi(false)
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Pozo si todos pagan/i)).toBeInTheDocument()
    })
  })

  it('llama al ranking con límite 200', async () => {
    await setupApi(false)
    const { api } = await import('@/api/client')
    renderHome()
    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls.map((c: any[]) => c[0])
      expect(calls.some((url: string) => url.includes('/ranking') && url.includes('200'))).toBe(true)
    })
  })
})

// ─── IncompleteProdeHero — pagó pero le faltan pronósticos ───────────────────

describe('Home — IncompleteProdeHero (precio_pagado: true, partidos sin apostar)', () => {
  it('muestra "TU PRODE INCOMPLETO"', async () => {
    await setupApi(true, [PENDING_MATCH])
    renderHome()
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toMatch(/TU PRODE/i)
      expect(heading.textContent).toMatch(/INCOMPLETO/i)
    })
  })

  it('muestra el CTA "Completar mi prode"', async () => {
    await setupApi(true, [PENDING_MATCH])
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Completar mi prode/i)).toBeInTheDocument()
    })
  })

  it('no muestra PozoHeroCard ni hero clásico', async () => {
    await setupApi(true, [PENDING_MATCH])
    renderHome()
    await waitFor(() => {
      expect(screen.queryByText(/EL PREMIO CRECE/i)).not.toBeInTheDocument()
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).not.toMatch(/EL MUNDIAL/i)
    })
  })
})

// ─── Hero clásico — pagó y tiene todo pronosticado ────────────────────────────

describe('Home — Hero clásico (precio_pagado: true, sin partidos pendientes)', () => {
  it('muestra el hero clásico con "EL MUNDIAL"', async () => {
    await setupApi(true, [])
    renderHome()
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading.textContent).toMatch(/EL MUNDIAL/i)
    })
  })

  it('no pagado con planilla completa igual muestra PozoHeroCard', async () => {
    await setupApi(false, [])
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/EL PREMIO CRECE/i)).toBeInTheDocument()
    })
  })
})

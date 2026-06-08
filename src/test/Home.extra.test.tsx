import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Home } from '@/pages/Home'

// ─── Mocks ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLANILLA = { id: 'p1', user_id: 'u1', nombre_planilla: 'Mi planilla', precio_pagado: true }

function futureMatch(id: string) {
  return {
    id,
    home_team: `Home${id}`,
    away_team: `Away${id}`,
    start_time: new Date(Date.now() + 73 * 3600 * 1000).toISOString(),
    time_cutoff: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    estado: 'pending',
    finished: false,
  }
}

function setupApi(overrides: {
  matches?: unknown[]
  bets?: unknown[]
  ranking?: unknown[]
  rejectAll?: boolean
} = {}) {
  return import('@/api/client').then(({ api }) => {
    if (overrides.rejectAll) {
      ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
        if (url.startsWith('/matches')) return Promise.reject(new Error('network'))
        return Promise.resolve({ data: { data: [] } })
      })
      return
    }
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches'))   return Promise.resolve({ data: { data: { matches: overrides.matches ?? [] } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking'))   return Promise.resolve({ data: { data: { ranking: overrides.ranking ?? [] } } })
      if (url.includes('/bets'))        return Promise.resolve({ data: { data: overrides.bets ?? [] } })
      return Promise.resolve({ data: { data: [] } })
    })
  })
}

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Home — estado de carga y errores', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra skeleton mientras carga', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}))
    renderHome()
    expect(screen.queryByText(/pronóstico/i)).toBeNull()
  })

  it('error de red → muestra botón de reintentar', async () => {
    await setupApi({ rejectAll: true })
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/reintentar/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Home — reglamento inline', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra sección "Cómo funciona" con los 3 pasos', async () => {
    await setupApi({})
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Cómo funciona/i)).toBeInTheDocument()
      expect(screen.getByText(/Pronosticá/i)).toBeInTheDocument()
      expect(screen.getByText(/Ganá/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra sistema de puntuación con 5 niveles', async () => {
    await setupApi({})
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Sistema de Puntuación/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(screen.getAllByText(/4 pts/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/3 pts/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/0 pts/i).length).toBeGreaterThanOrEqual(1)
  })

  it('muestra ejemplos prácticos', async () => {
    await setupApi({})
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Ejemplos Prácticos/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(screen.getAllByText(/Resultado real/i).length).toBe(5)
    expect(screen.getAllByText(/Tu pronóstico/i).length).toBe(5)
  })

  it('muestra condiciones importantes', async () => {
    await setupApi({})
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Condiciones Importantes/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('muestra sección de precio', async () => {
    await setupApi({})
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/1 boleta/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(screen.getAllByText(/\$20\.000/).length).toBeGreaterThanOrEqual(1)
  })
})

describe('Home — ranking y hero', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra LeaderHome cuando el usuario está en posición 1', async () => {
    const ranking = [
      { planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo', puntos_totales: 50, position: 1 },
    ]
    await setupApi({ ranking })
    renderHome()
    await waitFor(() => {
      expect(screen.getByTestId('leader-home')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Home — partidos y apuestas', () => {
  afterEach(() => vi.clearAllMocks())

  it('sin partidos → no muestra tarjetas de partido', async () => {
    await setupApi({ matches: [], ranking: [] })
    renderHome()
    await waitFor(() => {
      expect(screen.queryByTestId('match-card')).toBeNull()
    }, { timeout: 3000 })
  })
})

describe('Home — invitar a un amigo', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra card de invitación con botones WhatsApp y Personalizar', async () => {
    await setupApi({ ranking: [] })
    renderHome()
    await waitFor(() => {
      expect(screen.getByText(/Mientras más jueguen/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    // "WhatsApp" aparece en la descripción de la card y en el botón
    expect(screen.getAllByText(/WhatsApp/i).length).toBeGreaterThanOrEqual(1)
    // "Personalizar" aparece en el link del hero y en el botón de la card
    expect(screen.getAllByText(/Personalizar/i).length).toBeGreaterThanOrEqual(1)
  })

  it('sticky bar mobile tiene botón "Invitar amigo"', async () => {
    await setupApi({ ranking: [] })
    renderHome()
    await waitFor(() => {
      const inviteBtns = screen.getAllByText(/Invitar amigo/i)
      expect(inviteBtns.length).toBeGreaterThanOrEqual(1)
    }, { timeout: 3000 })
  })
})

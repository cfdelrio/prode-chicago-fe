import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Matriz } from '@/pages/Matriz'

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

vi.mock('@/utils/teamFlags', () => ({
  teamFlag: () => '',
  teamAbbr: (name: string) => name.slice(0, 3).toUpperCase(),
}))

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PAST = new Date(Date.now() - 4 * 3600000).toISOString()
const FUTURE = new Date(Date.now() + 72 * 3600000).toISOString()

const MATCH_FINISHED = {
  id: 'mf1', home_team: 'HomeF', away_team: 'AwayF',
  estado: 'finished', resultado_local: 2, resultado_visitante: 1,
  start_time: PAST, time_cutoff: PAST, halftime_minutes: 90,
}

const MATCH_PENDING = {
  id: 'mp1', home_team: 'HomeP', away_team: 'AwayP',
  estado: 'scheduled', resultado_local: null, resultado_visitante: null,
  start_time: FUTURE, time_cutoff: FUTURE, halftime_minutes: 0,
}

const MATCH_PAST_CUTOFF = {
  id: 'mpc1', home_team: 'HomeCut', away_team: 'AwayCut',
  estado: 'scheduled', resultado_local: null, resultado_visitante: null,
  start_time: PAST, time_cutoff: PAST, halftime_minutes: 0,
}

const ROW_ME = {
  planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos',
  nombre_planilla: 'Mi planilla', puntos_totales: 6, position: 1, precio_pagado: true,
}
const ROW_OTHER = {
  planilla_id: 'p2', user_id: 'u2', user_name: 'Ana',
  nombre_planilla: null, puntos_totales: 3, position: 2, precio_pagado: true,
}
const ROW_UNPAID = {
  planilla_id: 'p3', user_id: 'u3', user_name: 'Bob',
  nombre_planilla: null, puntos_totales: 0, position: 3, precio_pagado: false,
}

// default bets: home/away format (what the API /bets/all-for-matrix returns)
const DEFAULT_BETS = {
  p1: { mf1: { home: 2, away: 1 }, mp1: { home: 1, away: 0 } },
  p2: { mf1: { home: 1, away: 1 } },
}

const BETS_WITH_PENDING_LOCK = {
  p1: { mf1: { home: 2, away: 1 }, mp1: { home: 1, away: 0 } },
  p2: { mf1: { home: 1, away: 1 }, mp1: { home: 0, away: 2 } },
}

async function setupApi(overrides: {
  matches?: unknown[]
  ranking?: unknown[]
  bets?: unknown
  favorites?: string[]
} = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('favorites'))
      return Promise.resolve({ data: { data: overrides.favorites ?? [] } })
    if (url.includes('/ranking'))
      return Promise.resolve({ data: { data: { ranking: overrides.ranking ?? [ROW_ME, ROW_OTHER] } } })
    if (url.includes('/matches'))
      return Promise.resolve({ data: { data: { matches: overrides.matches ?? [MATCH_FINISHED, MATCH_PENDING] } } })
    if (url.includes('/bets/all-for-matrix'))
      return Promise.resolve({ data: { data: overrides.bets ?? DEFAULT_BETS } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderMatriz() {
  return render(<MemoryRouter><Matriz /></MemoryRouter>)
}

const waitForLoad = () =>
  waitFor(() => expect(screen.getByText('Carlos')).toBeInTheDocument(), { timeout: 3000 })

// ─── BetPopover ───────────────────────────────────────────────────────────────

describe('Matriz — BetPopover', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en badge de partido finalizado abre el popover con los equipos', async () => {
    await setupApi()
    const { container } = renderMatriz()
    await waitForLoad()

    const badge = container.querySelector('span[title*="HomeF vs AwayF"]')
    expect(badge).not.toBeNull()
    fireEvent.click(badge!)

    await waitFor(() => expect(screen.getByText('HomeF')).toBeInTheDocument())
    expect(screen.getByText('AwayF')).toBeInTheDocument()
  })

  it('click en badge muestra el pronóstico y los puntos en el popover', async () => {
    await setupApi()
    const { container } = renderMatriz()
    await waitForLoad()

    fireEvent.click(container.querySelector('span[title*="HomeF vs AwayF"]')!)

    await waitFor(() => {
      // t.match.yourBet = 'Tu pronóstico'
      expect(screen.getByText('Tu pronóstico')).toBeInTheDocument()
      // exacto → +3
      expect(screen.getByText('+3')).toBeInTheDocument()
    })
  })

  it('click en el mismo badge dos veces cierra el popover', async () => {
    await setupApi()
    const { container } = renderMatriz()
    await waitForLoad()

    const badge = container.querySelector('span[title*="HomeF vs AwayF"]')!
    fireEvent.click(badge)
    await waitFor(() => expect(screen.getByText('HomeF')).toBeInTheDocument())

    fireEvent.click(badge)
    await waitFor(() => expect(screen.queryByText('HomeF')).toBeNull())
  })

  it('mousedown fuera del popover lo cierra', async () => {
    await setupApi()
    const { container } = renderMatriz()
    await waitForLoad()

    fireEvent.click(container.querySelector('span[title*="HomeF vs AwayF"]')!)
    await waitFor(() => expect(screen.getByText('HomeF')).toBeInTheDocument())

    fireEvent.mouseDown(document.body)
    await waitFor(() => expect(screen.queryByText('HomeF')).toBeNull())
  })

  it('click en el contenedor principal cierra el popover', async () => {
    await setupApi()
    const { container } = renderMatriz()
    await waitForLoad()

    fireEvent.click(container.querySelector('span[title*="HomeF vs AwayF"]')!)
    await waitFor(() => expect(screen.getByText('HomeF')).toBeInTheDocument())

    // El div raíz tiene onClick={() => setActiveCell(null)}
    fireEvent.click(container.querySelector('div.space-y-3')!)
    await waitFor(() => expect(screen.queryByText('HomeF')).toBeNull())
  })

  it('popover celeste con bonus muestra nota de bonus', async () => {
    // 3-2 = 5 goles → exacto + bonus → celeste
    const bonusMatch = {
      ...MATCH_FINISHED,
      id: 'mb1', resultado_local: 3, resultado_visitante: 2,
      home_team: 'BonusHome', away_team: 'BonusAway',
    }
    await setupApi({
      matches: [bonusMatch],
      bets: { p1: { mb1: { home: 3, away: 2 } }, p2: {} },
    })
    const { container } = renderMatriz()
    await waitForLoad()

    fireEvent.click(container.querySelector('span[title*="BonusHome vs BonusAway"]')!)
    await waitFor(() => {
      // t.match.bonusNote = 'Incluye +1 bonus...'
      expect(screen.getByText(/incluye.*bonus/i)).toBeInTheDocument()
    })
  })
})

// ─── handleToggleFavorite ─────────────────────────────────────────────────────

describe('Matriz — togglear favorito', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en ☆ → llama API con el planilla_id correcto', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { action: 'added' } })

    await setupApi()
    renderMatriz()
    await waitForLoad()

    const starBtn = screen.getByTitle('Agregar a mi grupo')
    await user.click(starBtn)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/ranking/favorites/p2', {})
    })
  })

  it('acción "added" → el botón cambia a ⭐ (marcado)', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { action: 'added' } })

    await setupApi()
    renderMatriz()
    await waitForLoad()

    await user.click(screen.getByTitle('Agregar a mi grupo'))

    await waitFor(() => {
      expect(screen.getByTitle('Quitar de mi grupo')).toBeInTheDocument()
    })
  })

  it('click en ⭐ ya favorito → llama API y la acción "removed" desmarca', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { action: 'removed' } })

    await setupApi({ favorites: ['p2'] })
    renderMatriz()
    await waitForLoad()

    await user.click(screen.getByTitle('Quitar de mi grupo'))

    await waitFor(() => {
      expect(screen.getByTitle('Agregar a mi grupo')).toBeInTheDocument()
    })
  })

  it('error en API de favorito → muestra toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'))

    await setupApi()
    renderMatriz()
    await waitForLoad()

    await user.click(screen.getByTitle('Agregar a mi grupo'))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error')
    })
  })
})

// ─── Carga con error en favorites ────────────────────────────────────────────

describe('Matriz — fallo en API de favorites al cargar', () => {
  afterEach(() => vi.clearAllMocks())

  it('si favorites falla la matriz igual carga (catch silencioso)', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('favorites')) return Promise.reject(new Error('favorites down'))
      if (url.includes('/ranking'))
        return Promise.resolve({ data: { data: { ranking: [ROW_ME, ROW_OTHER] } } })
      if (url.includes('/matches'))
        return Promise.resolve({ data: { data: { matches: [MATCH_FINISHED] } } })
      if (url.includes('/bets/all-for-matrix'))
        return Promise.resolve({ data: { data: DEFAULT_BETS } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderMatriz()
    await waitFor(() => expect(screen.getByText('Carlos')).toBeInTheDocument(), { timeout: 3000 })
    // No crash → matriz renderizada correctamente
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })
})

// ─── Celdas pendientes ────────────────────────────────────────────────────────

describe('Matriz — celdas de partidos pendientes', () => {
  afterEach(() => vi.clearAllMocks())

  it('el usuario propio ve su apuesta en partido pendiente', async () => {
    await setupApi()
    renderMatriz()
    await waitForLoad()

    // Carlos (isMe) tiene mp1: {home:1, away:0} → texto "1-0"
    await waitFor(() => expect(screen.getByText('1-0')).toBeInTheDocument())
  })

  it('partido pendiente con cutoff pasado → otros jugadores ven la apuesta', async () => {
    await setupApi({
      matches: [MATCH_PAST_CUTOFF],
      bets: {
        p1: { mpc1: { home: 1, away: 0 } },
        p2: { mpc1: { home: 0, away: 2 } },
      },
    })
    renderMatriz()
    await waitForLoad()

    // Ambas apuestas visibles (cutoff pasado)
    await waitFor(() => {
      expect(screen.getByText('1-0')).toBeInTheDocument()
      expect(screen.getByText('0-2')).toBeInTheDocument()
    })
  })

  it('otro jugador con apuesta en partido aún vedado → muestra 🔒', async () => {
    await setupApi({ bets: BETS_WITH_PENDING_LOCK })
    renderMatriz()
    await waitForLoad()

    await waitFor(() => {
      expect(screen.getAllByTitle('Período de veda activo').length).toBeGreaterThan(0)
    })
  })
})

// ─── Modal de veda ────────────────────────────────────────────────────────────

describe('Matriz — modal de período de veda', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en 🔒 abre el modal de veda', async () => {
    await setupApi({ bets: BETS_WITH_PENDING_LOCK })
    renderMatriz()
    await waitForLoad()

    await waitFor(() =>
      expect(screen.getAllByTitle('Período de veda activo').length).toBeGreaterThan(0)
    )
    fireEvent.click(screen.getAllByTitle('Período de veda activo')[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Entendido/i })).toBeInTheDocument()
    })
  })

  it('click "Entendido" cierra el modal', async () => {
    await setupApi({ bets: BETS_WITH_PENDING_LOCK })
    renderMatriz()
    await waitForLoad()

    await waitFor(() =>
      expect(screen.getAllByTitle('Período de veda activo').length).toBeGreaterThan(0)
    )
    fireEvent.click(screen.getAllByTitle('Período de veda activo')[0])
    await waitFor(() => expect(screen.getByRole('button', { name: /Entendido/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Entendido/i }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Entendido/i })).toBeNull()
    })
  })

  it('click en backdrop cierra el modal de veda', async () => {
    await setupApi({ bets: BETS_WITH_PENDING_LOCK })
    const { container } = renderMatriz()
    await waitForLoad()

    await waitFor(() =>
      expect(screen.getAllByTitle('Período de veda activo').length).toBeGreaterThan(0)
    )
    fireEvent.click(screen.getAllByTitle('Período de veda activo')[0])
    await waitFor(() => expect(screen.getByRole('button', { name: /Entendido/i })).toBeInTheDocument())

    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/40')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Entendido/i })).toBeNull()
    })
  })
})

// ─── Rendering de filas ───────────────────────────────────────────────────────

describe('Matriz — rendering de filas', () => {
  afterEach(() => vi.clearAllMocks())

  it('planilla no pagada muestra badge IMPAGO', async () => {
    await setupApi({ ranking: [ROW_ME, ROW_UNPAID] })
    renderMatriz()
    await waitForLoad()

    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    expect(screen.getByText(/IMPAGO/)).toBeInTheDocument()
  })

  it('nombre_planilla se muestra cuando está definido', async () => {
    await setupApi()
    renderMatriz()

    await waitFor(() => {
      expect(screen.getByText('Mi planilla')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('user_avatar muestra <img> cuando está definido', async () => {
    const rowWithAvatar = { ...ROW_OTHER, user_avatar: 'https://cdn.test/av.jpg' }
    await setupApi({ ranking: [ROW_ME, rowWithAvatar] })
    const { container } = renderMatriz()
    await waitForLoad()

    await waitFor(() => {
      expect(container.querySelector('img[src="https://cdn.test/av.jpg"]')).toBeInTheDocument()
    })
  })

  it('link de WhatsApp se muestra cuando el jugador tiene número', async () => {
    const rowWithWA = { ...ROW_OTHER, whatsapp_number: '5491155554444' }
    await setupApi({ ranking: [ROW_ME, rowWithWA] })
    renderMatriz()
    await waitForLoad()

    const waLink = await screen.findByTitle(/WhatsApp/)
    expect(waLink.getAttribute('href')).toContain('wa.me/5491155554444')
  })

  it('click en link de WhatsApp no propaga el evento (stopPropagation)', async () => {
    const rowWithWA = { ...ROW_OTHER, whatsapp_number: '5491155554444' }
    await setupApi({ ranking: [ROW_ME, rowWithWA] })
    renderMatriz()
    await waitForLoad()

    const waLink = await screen.findByTitle(/WhatsApp a Ana/)
    fireEvent.click(waLink)
    // No crash y el link sigue en el DOM
    expect(waLink).toBeInTheDocument()
  })

  it('celda sin apuesta en partido terminado muestra —', async () => {
    // Ana no tiene apuesta en mf1 → celda "—"
    await setupApi({ bets: { p1: { mf1: { home: 2, away: 1 } }, p2: {} } })
    renderMatriz()
    await waitForLoad()

    await waitFor(() => {
      // La celda vacía muestra "—" (emdash)
      const dashes = screen.queryAllByText('—')
      expect(dashes.length).toBeGreaterThan(0)
    })
  })
})

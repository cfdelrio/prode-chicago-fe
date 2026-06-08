import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Home } from '@/pages/Home'

const mockShow = vi.hoisted(() => vi.fn())
const mockPwaInstall = vi.hoisted(() => vi.fn())
const mockPwaState = vi.hoisted(() => ({ current: { type: 'unavailable' } as { type: string } }))

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos Foo', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow, addToast: vi.fn() }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({ state: mockPwaState.current, install: mockPwaInstall }),
}))

vi.mock('@/pages/LeaderHome', () => ({
  LeaderHome: ({ onBetDeleted, onBetSaved }: any) => (
    <div data-testid="leader-home">
      <button onClick={() => onBetDeleted('m1')}>delete-bet</button>
      <button onClick={() => onBetSaved()}>save-bet</button>
    </div>
  ),
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

async function setupApi(opts: { rejectAll?: boolean; ranking?: unknown[] } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (opts.rejectAll && url.startsWith('/matches')) return Promise.reject(new Error('network'))
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: [] } } })
    if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
    if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: opts.ranking ?? [] } } })
    if (url.includes('/bets')) return Promise.resolve({ data: { data: [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderHome() {
  return render(<MemoryRouter><Home /></MemoryRouter>)
}

// ─── Mocks de window/navigator para inviteVia ────────────────────────────────

let openSpy: ReturnType<typeof vi.spyOn>
let origLocation: Location
let mockLocation: { href: string }

function setupBrowserMocks() {
  openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any)
  origLocation = window.location
  mockLocation = { href: '' }
  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true,
  })
}

function restoreBrowserMocks() {
  openSpy.mockRestore()
  Object.defineProperty(window, 'location', {
    value: origLocation,
    writable: true,
    configurable: true,
  })
}

// ─── Retry tras error de carga ───────────────────────────────────────────────

describe('Home — botón reintentar tras error', () => {
  afterEach(() => vi.clearAllMocks())

  it('click en "Reintentar" llama nuevamente a loadData', async () => {
    const user = userEvent.setup()
    await setupApi({ rejectAll: true })
    const { api } = await import('@/api/client')
    renderHome()

    const retryBtn = await screen.findByText(/reintentar/i, undefined, { timeout: 3000 })
    const callsBefore = (api.get as ReturnType<typeof vi.fn>).mock.calls.length

    // Próxima llamada exitosa
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: [] } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })

    await user.click(retryBtn)

    await waitFor(() => {
      expect((api.get as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore)
    })
  })
})

// ─── inviteVia: WhatsApp directo desde InviteFriendCard ─────────────────────

describe('Home — inviteVia (WhatsApp desde InviteFriendCard)', () => {
  beforeEach(() => setupBrowserMocks())
  afterEach(() => { restoreBrowserMocks(); vi.clearAllMocks() })

  it('click en "💬 WhatsApp" abre wa.me en nueva pestaña', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderHome()

    const btn = await screen.findByText(/💬 WhatsApp/i, undefined, { timeout: 3000 })
    await user.click(btn)

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/?text='),
      '_blank'
    )
  })
})

// ─── Modal de invitación: abrir / cerrar / canales ───────────────────────────

describe('Home — modal de invitación multi-canal', () => {
  beforeEach(() => setupBrowserMocks())
  afterEach(() => { restoreBrowserMocks(); vi.clearAllMocks() })

  async function openModal() {
    const user = userEvent.setup()
    await setupApi()
    renderHome()

    const personalize = await screen.findByText('✏️ Personalizar', undefined, { timeout: 3000 })
    await user.click(personalize)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    return user
  }

  it('click en "Personalizar mensaje" abre el modal con textarea pre-cargado', async () => {
    await openModal()
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value.length).toBeGreaterThan(0)
  })

  it('editar el textarea actualiza el mensaje', async () => {
    const user = await openModal()
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    await user.clear(textarea)
    await user.type(textarea, 'Mensaje custom 123')
    expect(textarea.value).toBe('Mensaje custom 123')
  })

  it('click en botón WhatsApp dentro del modal abre wa.me', async () => {
    const user = await openModal()
    // El primer botón "WhatsApp" del grid de canales
    const waBtns = screen.getAllByText('WhatsApp')
    await user.click(waBtns[0])
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/?text='),
      '_blank'
    )
  })

  it('click en botón SMS asigna location.href con sms:', async () => {
    const user = await openModal()
    await user.click(screen.getByText('SMS'))
    expect(mockLocation.href).toMatch(/^sms:\?body=/)
  })

  it('click en botón Email asigna location.href con mailto:', async () => {
    const user = await openModal()
    await user.click(screen.getByText('Email'))
    expect(mockLocation.href).toMatch(/^mailto:/)
    expect(mockLocation.href).toContain('subject=')
    expect(mockLocation.href).toContain('body=')
  })

  it('click en "Copiar" usa clipboard.writeText y muestra toast success', async () => {
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        writable: true, configurable: true,
      })
    }
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

    const user = await openModal()
    await user.click(screen.getByText('Copiar'))

    await waitFor(() => expect(writeTextSpy).toHaveBeenCalled())
    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('copiado'), 'success')
    })
    writeTextSpy.mockRestore()
  })

  it('click en "Copiar" con clipboard.writeText que falla muestra toast error', async () => {
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        writable: true, configurable: true,
      })
    }
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('blocked'))

    const user = await openModal()
    await user.click(screen.getByText('Copiar'))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('No se pudo copiar'), 'error')
    })
    writeTextSpy.mockRestore()
  })

  it('click en "Más opciones de compartir" llama a navigator.share cuando está disponible', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...window.navigator, share })

    const user = await openModal()
    const nativeBtn = await screen.findByText(/Más opciones de compartir/)
    await user.click(nativeBtn)

    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text: expect.any(String) }))
    vi.unstubAllGlobals()
  })

  it('click en "Cerrar" cierra el modal', async () => {
    const user = await openModal()
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('click en backdrop cierra el modal', async () => {
    await openModal()
    const backdrop = document.querySelector('div[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})

// ─── Botones de invite card y sticky mobile bar ──────────────────────────────

describe('Home — invite card y sticky mobile bar', () => {
  beforeEach(() => setupBrowserMocks())
  afterEach(() => { restoreBrowserMocks(); vi.clearAllMocks() })

  it('click en "💬 WhatsApp" del invite card abre wa.me', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderHome()

    // El botón "💬 WhatsApp" está SOLO en el invite card (el modal está cerrado)
    const waBtn = await screen.findByText(/💬 WhatsApp/i, undefined, { timeout: 3000 })
    await user.click(waBtn)
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank')
  })

  it('click en "✏️ Personalizar" del invite card abre el modal', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderHome()

    const btn = await screen.findByText('✏️ Personalizar', undefined, { timeout: 3000 })
    await user.click(btn)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
  })

  it('click en "💬 Invitar amigo" de la sticky bar abre wa.me', async () => {
    const user = userEvent.setup()
    await setupApi()
    renderHome()

    const btn = await screen.findByText(/💬 Invitar amigo/i, undefined, { timeout: 3000 })
    await user.click(btn)
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank')
  })
})

// ─── closingSoon: 2+ matches dispara sort ────────────────────────────────────

describe('Home — sort de partidos que cierran pronto', () => {
  afterEach(() => vi.clearAllMocks())

  it('con 2+ matches pending dentro de 6h, el sort comparator se ejecuta', async () => {
    const { api } = await import('@/api/client')
    const m1 = {
      id: 'm1', home_team: 'A', away_team: 'B',
      estado: 'pending', finished: false,
      time_cutoff: new Date(Date.now() + 5 * 3600000).toISOString(),
      start_time: new Date(Date.now() + 5 * 3600000).toISOString(),
    }
    const m2 = {
      id: 'm2', home_team: 'C', away_team: 'D',
      estado: 'pending', finished: false,
      time_cutoff: new Date(Date.now() + 2 * 3600000).toISOString(),
      start_time: new Date(Date.now() + 2 * 3600000).toISOString(),
    }
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: [m1, m2] } } })
      if (url.startsWith('/planillas')) return Promise.resolve({ data: { data: [PLANILLA] } })
      if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: [] } } })
      if (url.includes('/bets')) return Promise.resolve({ data: { data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })

    renderHome()
    // No crash con sort de 2+ elementos: el hero termina renderizando
    await waitFor(
      () => expect(screen.getAllByText(/EL MUNDIAL/i).length).toBeGreaterThan(0),
      { timeout: 3000 },
    )
  })
})

// ─── LeaderHome callbacks ────────────────────────────────────────────────────

describe('Home — callbacks pasados a LeaderHome', () => {
  afterEach(() => vi.clearAllMocks())

  it('cuando el usuario es líder se renderiza LeaderHome y onBetDeleted no crashea', async () => {
    const user = userEvent.setup()
    await setupApi({
      ranking: [{ planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos', puntos_totales: 50, position: 1 }],
    })
    renderHome()

    await waitFor(() => expect(screen.getByTestId('leader-home')).toBeInTheDocument(), { timeout: 3000 })

    await user.click(screen.getByText('delete-bet'))
    expect(screen.getByTestId('leader-home')).toBeInTheDocument()
  })

  it('save-bet desde LeaderHome dispara refreshBets (api.get a /bets/planillas/...)', async () => {
    const user = userEvent.setup()
    await setupApi({
      ranking: [{ planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos', puntos_totales: 50, position: 1 }],
    })
    const { api } = await import('@/api/client')
    renderHome()

    await waitFor(() => expect(screen.getByTestId('leader-home')).toBeInTheDocument(), { timeout: 3000 })

    await user.click(screen.getByText('save-bet'))

    await waitFor(() => {
      const calls = (api.get as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.some(([url]) => url.includes('/bets/planillas/p1/bets'))).toBe(true)
    })
  })
})

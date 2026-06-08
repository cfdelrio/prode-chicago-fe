import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const FINISHED_MATCH = {
  id: 'm1', home_team: 'Argentina', away_team: 'Brasil',
  estado: 'finished' as const, finished: true,
  resultado_local: 2, resultado_visitante: 1,
  time_cutoff: '2026-04-01T00:00:00Z', start_time: '2026-04-01T00:00:00Z',
  halftime_minutes: 0,
}

const RANKING = [
  { planilla_id: 'p1', user_id: 'u2', user_name: 'Ana', puntos_totales: 30, position: 1, precio_pagado: true },
]

const BETS = {
  p1: {
    m1: { planilla_id: 'p1', match_id: 'm1', goles_local: 2, goles_visitante: 1 },
  },
}

async function setupApi() {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.startsWith('/matches')) return Promise.resolve({ data: { data: { matches: [FINISHED_MATCH] } } })
    if (url.startsWith('/ranking/favorites')) return Promise.resolve({ data: { data: [] } })
    if (url.startsWith('/ranking')) return Promise.resolve({ data: { data: { ranking: RANKING } } })
    if (url.includes('/bets/all-for-matrix')) return Promise.resolve({ data: { data: BETS } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderMatriz() {
  return render(<MemoryRouter><Matriz /></MemoryRouter>)
}

describe('Matriz — persistencia de filtros en localStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => vi.clearAllMocks())

  it('al activar un filtro persiste el color en localStorage', async () => {
    await setupApi()
    renderMatriz()
    const chip = await screen.findByText('3pts')
    await userEvent.click(chip)

    await waitFor(() => {
      const raw = localStorage.getItem('matriz.filterColors')
      expect(raw).not.toBeNull()
      expect(JSON.parse(raw as string)).toEqual(['rojo'])
    })
  })

  it('al limpiar todos los filtros borra la key de localStorage', async () => {
    await setupApi()
    renderMatriz()
    await userEvent.click(await screen.findByText('3pts'))
    await waitFor(() => expect(localStorage.getItem('matriz.filterColors')).not.toBeNull())

    await userEvent.click(screen.getByText(/limpiar/i))

    await waitFor(() => {
      expect(localStorage.getItem('matriz.filterColors')).toBeNull()
    })
  })

  it('al montar restaura los filtros guardados en localStorage', async () => {
    localStorage.setItem('matriz.filterColors', JSON.stringify(['rojo', 'celeste']))
    await setupApi()
    renderMatriz()

    // El botón "✕ limpiar" solo aparece cuando hay filtros activos.
    expect(await screen.findByText(/limpiar/i)).toBeInTheDocument()
  })

  it('ignora datos corruptos en localStorage (no rompe el render)', async () => {
    localStorage.setItem('matriz.filterColors', 'no-es-json-{')
    await setupApi()
    renderMatriz()

    // Debe renderizar sin filtros activos
    await screen.findByText('3pts')
    expect(screen.queryByText(/limpiar/i)).not.toBeInTheDocument()
  })

  it('filtra colores inválidos del localStorage', async () => {
    localStorage.setItem('matriz.filterColors', JSON.stringify(['rojo', 'inventado', 42, null]))
    await setupApi()
    renderMatriz()

    // 'rojo' es válido → debería haber filtro activo
    expect(await screen.findByText(/limpiar/i)).toBeInTheDocument()
  })

  it('si localStorage falla al escribir, el filtro sigue funcionando en memoria', async () => {
    const originalSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = vi.fn(() => { throw new Error('QuotaExceededError') })

    try {
      await setupApi()
      renderMatriz()
      await userEvent.click(await screen.findByText('3pts'))

      // No debería haber roto el render; el botón "limpiar" sí aparece (estado en memoria)
      await waitFor(() => expect(screen.getByText(/limpiar/i)).toBeInTheDocument())
    } finally {
      Storage.prototype.setItem = originalSetItem
    }
  })
})

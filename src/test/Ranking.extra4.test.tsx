import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Ranking } from '@/pages/Ranking'

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

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

const RANKING = [
  {
    planilla_id: 'p1', user_id: 'u1', user_name: 'Carlos Foo',
    puntos_totales: 30, position: 1, exactos_count: 5,
    aciertos_celeste: 1, aciertos_verde: 2, aciertos_amarillo: 3,
    precio_pagado: true, nombre_planilla: 'Mi Planilla',
  },
  {
    planilla_id: 'p2', user_id: 'u2', user_name: 'Ana García',
    puntos_totales: 20, position: 2, exactos_count: 3,
    aciertos_celeste: 0, aciertos_verde: 1, aciertos_amarillo: 2,
    precio_pagado: true, nombre_planilla: 'Ana P',
  },
]

function renderRanking() {
  return render(<MemoryRouter><Ranking /></MemoryRouter>)
}

describe('Ranking — favoritos fetch falla → ranking igual carga', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('si /ranking/favorites rechaza, el ranking sigue mostrándose', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('favorites')) return Promise.reject(new Error('fail'))
      if (url.includes('/ranking')) return Promise.resolve({ data: { data: { ranking: RANKING } } })
      return Promise.resolve({ data: { data: [] } })
    })
    renderRanking()
    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument())
  })
})

describe('Ranking — share con navigator.share disponible', () => {
  let shareSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    shareSpy = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      value: shareSpy,
      writable: true, configurable: true,
    })
  })
  afterEach(() => {
    vi.clearAllMocks()
    // limpiar navigator.share
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true })
  })

  async function loadRanking() {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('favorites')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/ranking')) return Promise.resolve({ data: { data: { ranking: RANKING } } })
      return Promise.resolve({ data: { data: [] } })
    })
    renderRanking()
    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument())
  }

  it('handleShareMine usa navigator.share cuando está disponible', async () => {
    await loadRanking()
    const user = userEvent.setup()
    // El botón "Compartir posición" del hero
    const shareBtn = screen.getByText(/Compartir posición/i)
    await user.click(shareBtn)
    expect(shareSpy).toHaveBeenCalled()
  })

  it('handleShare desde drawer usa navigator.share cuando está disponible', async () => {
    await loadRanking()
    const user = userEvent.setup()
    // Abrir drawer del usuario logueado (Carlos)
    const rows = screen.getAllByText('Carlos Foo')
    await user.click(rows[0])
    // Botón "↗ Compartir" dentro del drawer
    const shareBtn = await screen.findByText(/↗ Compartir/i)
    await user.click(shareBtn)
    expect(shareSpy).toHaveBeenCalled()
  })
})

describe('Ranking — toggle favorito con error', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('si /ranking/favorites/:id falla, muestra toast de error', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('favorites')) return Promise.resolve({ data: { data: [] } })
      if (url.includes('/ranking')) return Promise.resolve({ data: { data: { ranking: RANKING } } })
      return Promise.resolve({ data: { data: [] } })
    })
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fail'))

    renderRanking()
    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument())

    const user = userEvent.setup()
    // Click en estrella de Ana (no isMe)
    const stars = screen.getAllByRole('button').filter(b => b.textContent === '☆')
    await user.click(stars[0])
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error'))
  })
})

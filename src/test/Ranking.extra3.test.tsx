import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Ranking } from '@/pages/Ranking'

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user' } }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: vi.fn() }),
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
    precio_pagado: true, whatsapp_number: '5491111111111',
    nombre_planilla: 'Ana P',
  },
]

async function setupApi(overrides: { ranking?: unknown[]; favorites?: string[] } = {}) {
  const { api } = await import('@/api/client')
  ;(api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('favorites')) return Promise.resolve({ data: { data: overrides.favorites ?? [] } })
    if (url.includes('/ranking')) return Promise.resolve({ data: { data: { ranking: overrides.ranking ?? RANKING } } })
    return Promise.resolve({ data: { data: [] } })
  })
  ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: {} } })
}

function renderRanking() {
  return render(<MemoryRouter><Ranking /></MemoryRouter>)
}

describe('Ranking — empty state filtro favoritos sin favoritos', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('CTA "Entendido" en empty state desactiva el filtro de favoritos', async () => {
    // Ranking sin el user actual → al filtrar por favoritos sin tener ninguno, queda vacío
    const otherOnly = [
      {
        planilla_id: 'p2', user_id: 'u2', user_name: 'Ana García',
        puntos_totales: 20, position: 1, exactos_count: 3,
        aciertos_celeste: 0, aciertos_verde: 1, aciertos_amarillo: 2,
        precio_pagado: true, nombre_planilla: 'Ana P',
      },
    ]
    await setupApi({ ranking: otherOnly, favorites: [] })
    renderRanking()
    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument())

    const user = userEvent.setup()
    const favBtn = screen.getByRole('button', { name: /⭐ Favoritos/ })
    await user.click(favBtn)

    // EmptyState con CTA "Entendido"
    const cta = await screen.findByRole('button', { name: 'Entendido' })
    await user.click(cta)
    // Filtro desactivado → vuelve a verse Ana García
    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument())
  })
})

describe('Ranking — click WhatsApp en fila no abre el drawer', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('click en el ícono WhatsApp hace stopPropagation y no abre el drawer', async () => {
    await setupApi()
    renderRanking()
    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument())

    const user = userEvent.setup()
    const waLinks = screen.getAllByTestId('whatsapp-link')
    expect(waLinks[0].getAttribute('href')).toContain('wa.me/5491111111111')
    await user.click(waLinks[0])

    // El drawer no se abrió: el título del drawer ("Ver planilla completa") no aparece
    expect(screen.queryByText(/Ver planilla completa/i)).toBeNull()
  })
})


describe('Ranking — toggle favorito desde el drawer', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('botón de favorito dentro del drawer llama a /ranking/favorites', async () => {
    await setupApi()
    renderRanking()
    await waitFor(() => expect(screen.getByText('Ana García')).toBeInTheDocument())

    const user = userEvent.setup()
    await user.click(screen.getByText('Ana García'))

    // Dentro del drawer, el botón muestra "Agregar a mi grupo" / "Quitar de mi grupo" con un emoji adelante
    const favBtn = await screen.findByText(/Agregar a mi grupo|Quitar de mi grupo/i)
    const { api } = await import('@/api/client')
    await user.click(favBtn)
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/ranking/favorites/p2', expect.anything())
    })
  })
})

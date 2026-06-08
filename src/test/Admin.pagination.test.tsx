import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Admin } from '@/pages/Admin'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const mockShow = vi.hoisted(() => vi.fn())
vi.mock('@/store/toastStore', () => ({
  useToastStore: vi.fn((sel?: (s: any) => any) => {
    const store = { show: mockShow }
    return sel ? sel(store) : store
  }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((sel?: (s: any) => any) => {
    const store = {
      user: { id: 'admin1', nombre: 'Admin', email: 'cfdelrio@gmail.com', rol: 'admin', idioma_pref: 'es', tema_equipo: 'neutral' },
      isAdmin: () => true,
      updateUser: vi.fn(),
      logout: vi.fn(),
    }
    return sel ? sel(store) : store
  }),
}))

vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: () => ({ badges: {}, fetchBadges: vi.fn() }),
}))

const mockApiGet = vi.fn()
vi.mock('@/api/client', () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
    post: vi.fn().mockResolvedValue({ data: { success: true, data: {} } }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}))

const makeUsersPage = (page: number, total = 45) => ({
  data: {
    success: true,
    data: {
      users: Array.from({ length: 20 }, (_, i) => ({
        id: `u${(page - 1) * 20 + i}`,
        nombre: `User ${(page - 1) * 20 + i}`,
        email: `user${(page - 1) * 20 + i}@test.com`,
        rol: 'usuario',
        email_verified: true,
      })),
      pagination: { page, limit: 20, total, pages: Math.ceil(total / 20) },
    },
  },
})

function setupApiMocks(page = 1) {
  mockApiGet.mockImplementation((url: string) => {
    if (url.includes('/users')) return Promise.resolve(makeUsersPage(page))
    if (url.includes('/bets/unlock-requests')) return Promise.resolve({ data: { success: true, data: [] } })
    if (url.includes('/matches')) return Promise.resolve({ data: { success: true, data: { matches: [] } } })
    if (url.includes('/tournaments/admin/all')) return Promise.resolve({ data: { success: true, data: [] } })
    if (url.includes('/planillas/admin/all')) return Promise.resolve({ data: { data: [] } })
    if (url.includes('/campaigns')) return Promise.resolve({ data: { data: [] } })
    if (url.includes('/polls')) return Promise.resolve({ data: { data: [] } })
    return Promise.resolve({ data: { data: [] } })
  })
}

function renderAdmin() {
  return render(<MemoryRouter><Admin /></MemoryRouter>)
}

async function goToUsuariosTab() {
  const user = userEvent.setup()
  renderAdmin()
  const tab = await screen.findByRole('button', { name: /Usuarios/i })
  await user.click(tab)
  return user
}

describe('Admin — paginación de usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupApiMocks()
  })

  it('muestra controles de paginación cuando hay más de una página', async () => {
    await goToUsuariosTab()
    await waitFor(() => {
      expect(screen.getByText(/45 usuarios · página 1 de 3/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /← Anterior/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Siguiente →/i })).toBeInTheDocument()
  })

  it('"← Anterior" está disabled en la primera página', async () => {
    await goToUsuariosTab()
    await waitFor(() => screen.getByText(/página 1 de/i))
    expect(screen.getByRole('button', { name: /← Anterior/i })).toBeDisabled()
  })

  it('"Siguiente →" está habilitado en la primera página', async () => {
    await goToUsuariosTab()
    await waitFor(() => screen.getByText(/página 1 de/i))
    expect(screen.getByRole('button', { name: /Siguiente →/i })).not.toBeDisabled()
  })

  it('click en "Siguiente →" llama la API con page=2', async () => {
    const user = await goToUsuariosTab()
    await waitFor(() => screen.getByText(/página 1 de/i))

    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('/users')) return Promise.resolve(makeUsersPage(2))
      if (url.includes('/bets/unlock-requests')) return Promise.resolve({ data: { success: true, data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })

    await user.click(screen.getByRole('button', { name: /Siguiente →/i }))

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('page=2'))
    })
    await waitFor(() => {
      expect(screen.getByText(/página 2 de/i)).toBeInTheDocument()
    })
  })

  it('"Siguiente →" está disabled en la última página', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('/users')) return Promise.resolve(makeUsersPage(3))
      if (url.includes('/bets/unlock-requests')) return Promise.resolve({ data: { success: true, data: [] } })
      if (url.includes('/matches')) return Promise.resolve({ data: { success: true, data: { matches: [] } } })
      if (url.includes('/tournaments')) return Promise.resolve({ data: { success: true, data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })

    const user = await goToUsuariosTab()
    // Navigate to page 2 then 3
    await waitFor(() => screen.getByText(/página/i))

    // Go to page 2
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('/users')) return Promise.resolve(makeUsersPage(2))
      if (url.includes('/bets/unlock-requests')) return Promise.resolve({ data: { success: true, data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })
    await user.click(screen.getByRole('button', { name: /Siguiente →/i }))
    await waitFor(() => screen.getByText(/página 2 de/i))

    // Go to page 3 (last)
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('/users')) return Promise.resolve(makeUsersPage(3, 45))
      if (url.includes('/bets/unlock-requests')) return Promise.resolve({ data: { success: true, data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })
    await user.click(screen.getByRole('button', { name: /Siguiente →/i }))
    await waitFor(() => screen.getByText(/página 3 de 3/i))

    expect(screen.getByRole('button', { name: /Siguiente →/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /← Anterior/i })).not.toBeDisabled()
  })

  it('no muestra controles de paginación cuando hay una sola página', async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('/users')) return Promise.resolve({
        data: {
          success: true,
          data: {
            users: [{ id: 'u1', nombre: 'Solo', email: 'solo@test.com', rol: 'admin', email_verified: true }],
            pagination: { page: 1, limit: 20, total: 1, pages: 1 },
          },
        },
      })
      if (url.includes('/bets/unlock-requests')) return Promise.resolve({ data: { success: true, data: [] } })
      if (url.includes('/matches')) return Promise.resolve({ data: { success: true, data: { matches: [] } } })
      if (url.includes('/tournaments')) return Promise.resolve({ data: { success: true, data: [] } })
      return Promise.resolve({ data: { data: [] } })
    })

    await goToUsuariosTab()
    await waitFor(() => screen.getByText('Solo'))
    expect(screen.queryByRole('button', { name: /← Anterior/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Siguiente →/i })).not.toBeInTheDocument()
  })
})

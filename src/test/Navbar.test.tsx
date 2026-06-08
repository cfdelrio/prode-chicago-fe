import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { useAuthStore } from '@/store/authStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockLogout = vi.fn()
const mockUpdateUser = vi.fn()
const mockIsAdmin = vi.fn(() => false)

const baseUser = {
  id: 'u1', nombre: 'Carlos', idioma_pref: 'es',
  rol: 'user', foto_url: null, tema_equipo: 'neutral',
}
const baseStore = () => ({
  user: baseUser,
  logout: mockLogout,
  updateUser: mockUpdateUser,
  isAdmin: mockIsAdmin,
})

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((sel?: (s: any) => any) => {
    const store = baseStore()
    return sel ? sel(store) : store
  }),
}))

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/hooks/useNotificationHistory', () => ({
  useNotificationHistory: () => ({ notifications: [], loading: false, error: null, unreadCount: 0, markAsRead: vi.fn(), deleteNotification: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/components/layout/GanadoresModal', () => ({
  GanadoresModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="ganadores-modal">
      <button onClick={onClose}>cerrar ganadores</button>
    </div>
  ),
}))

function renderNavbar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar — renderizado básico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(false)
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = baseStore()
      return sel ? sel(store) : store
    })
  })

  it('muestra el logo PRODE Caballito', () => {
    renderNavbar()
    expect(screen.getByText('PRODE Caballito')).toBeInTheDocument()
  })

  it('retorna null cuando no hay usuario', () => {
    vi.mocked(useAuthStore).mockImplementationOnce((sel?: (s: any) => any) => {
      const store = { user: null, logout: mockLogout, updateUser: mockUpdateUser, isAdmin: mockIsAdmin }
      return sel ? sel(store) : store
    })
    const { container } = renderNavbar()
    expect(container.firstChild).toBeNull()
  })

  it('muestra la inicial del nombre cuando no hay foto_url', () => {
    renderNavbar()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('muestra img de foto cuando hay foto_url', () => {
    vi.mocked(useAuthStore).mockImplementationOnce((sel?: (s: any) => any) => {
      const store = {
        user: { ...baseUser, foto_url: 'https://img.test/foto.jpg' },
        logout: mockLogout, updateUser: mockUpdateUser, isAdmin: mockIsAdmin,
      }
      return sel ? sel(store) : store
    })
    const { container } = renderNavbar()
    const img = container.querySelector('img[src="https://img.test/foto.jpg"]')
    expect(img).not.toBeNull()
  })

  it('muestra la bandera argentina cuando idioma_pref es es', () => {
    renderNavbar()
    expect(screen.getByText('🇦🇷')).toBeInTheDocument()
  })

  it('muestra la bandera brasileña cuando idioma_pref es pt', () => {
    vi.mocked(useAuthStore).mockImplementationOnce((sel?: (s: any) => any) => {
      const store = {
        user: { ...baseUser, idioma_pref: 'pt' },
        logout: mockLogout, updateUser: mockUpdateUser, isAdmin: mockIsAdmin,
      }
      return sel ? sel(store) : store
    })
    renderNavbar()
    expect(screen.getByText('🇧🇷')).toBeInTheDocument()
  })
})

describe('Navbar — links de navegación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(false)
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = baseStore()
      return sel ? sel(store) : store
    })
  })

  it('muestra links de navegación principales', () => {
    renderNavbar()
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/apuestas')
    expect(hrefs).toContain('/ranking')
    expect(hrefs).toContain('/fixture')
  })

  it('no muestra links de admin para usuario normal', () => {
    renderNavbar()
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'))
    expect(hrefs).not.toContain('/admin')
    expect(hrefs).not.toContain('/messages')
  })

  it('muestra links de admin cuando isAdmin() retorna true', () => {
    mockIsAdmin.mockReturnValue(true)
    renderNavbar()
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/messages')
    expect(hrefs).toContain('/admin')
  })
})

describe('Navbar — logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(false)
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = baseStore()
      return sel ? sel(store) : store
    })
  })

  it('botón logout (desktop) llama a logout() y navega a /login', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    renderNavbar()

    // Desktop logout button says "Salir"
    const logoutBtn = screen.getByRole('button', { name: 'Salir' })
    await user.click(logoutBtn)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('logout funciona aunque api.post falle', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))
    renderNavbar()

    const logoutBtn = screen.getByRole('button', { name: 'Salir' })
    await user.click(logoutBtn)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})

describe('Navbar — menú mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(false)
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = baseStore()
      return sel ? sel(store) : store
    })
  })

  it('el menú mobile (dropdown) está oculto por defecto', () => {
    renderNavbar()
    // Mobile dropdown logout says "Cerrar sesión"
    expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument()
  })

  it('click en hamburger muestra el menú mobile con el botón de cerrar sesión', async () => {
    const user = userEvent.setup()
    renderNavbar()

    const hamburger = screen.getAllByRole('button').find(b => b.className.includes('md:hidden'))!
    await user.click(hamburger)

    await waitFor(() => {
      expect(screen.getByText('Cerrar sesión')).toBeInTheDocument()
    })
  })

  it('el menú mobile muestra links de admin cuando isAdmin() es true', async () => {
    mockIsAdmin.mockReturnValue(true)
    const user = userEvent.setup()
    renderNavbar()

    const hamburger = screen.getAllByRole('button').find(b => b.className.includes('md:hidden'))!
    await user.click(hamburger)

    await waitFor(() => {
      const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'))
      expect(hrefs).toContain('/messages')
    })
  })
})

describe('Navbar — cambio de idioma', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(false)
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = baseStore()
      return sel ? sel(store) : store
    })
  })

  it('click en flag toggle llama a updateUser + api.put con el nuevo idioma', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    renderNavbar()

    // El botón tiene title="Cambiar a Português"
    const langBtn = screen.getByTitle('Cambiar a Português')
    await user.click(langBtn)

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ idioma_pref: 'pt' })
      expect(api.put).toHaveBeenCalledWith('/users/u1', { idioma_pref: 'pt' })
    })
  })

  it('usuario con idioma pt cambia a es al hacer click', async () => {
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = {
        user: { ...baseUser, idioma_pref: 'pt' },
        logout: mockLogout, updateUser: mockUpdateUser, isAdmin: mockIsAdmin,
      }
      return sel ? sel(store) : store
    })

    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    renderNavbar()

    // Con pt, el title dice "Cambiar a Español" (o similar) — buscamos el botón por el flag
    const langBtn = screen.getByText('🇧🇷').closest('button')!
    await user.click(langBtn)

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ idioma_pref: 'es' })
    })
  })
})

describe('Navbar — modal ganadores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(false)
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = baseStore()
      return sel ? sel(store) : store
    })
  })

  it('click en botón ganadores muestra el modal', async () => {
    const user = userEvent.setup()
    renderNavbar()

    const btn = screen.getByRole('button', { name: /ganadores/i })
    await user.click(btn)

    expect(screen.getByTestId('ganadores-modal')).toBeInTheDocument()
  })

  it('cerrar modal de ganadores lo oculta', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(screen.getByRole('button', { name: /ganadores/i }))
    expect(screen.getByTestId('ganadores-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cerrar ganadores/i }))
    expect(screen.queryByTestId('ganadores-modal')).not.toBeInTheDocument()
  })
})

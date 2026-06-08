import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { useAuthStore } from '@/store/authStore'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
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
    get: vi.fn().mockResolvedValue({ data: { data: { history: [] } } }),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/components/layout/GanadoresModal', () => ({
  GanadoresModal: () => <div data-testid="ganadores-modal" />,
}))

function renderNavbar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  )
}

describe('Navbar — mobile dropdown: links cierran el menú', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin.mockReturnValue(true)
    vi.mocked(useAuthStore).mockImplementation((sel?: (s: any) => any) => {
      const store = baseStore()
      return sel ? sel(store) : store
    })
  })

  async function openMobileMenu() {
    const user = userEvent.setup()
    renderNavbar()
    const hamburger = screen.getAllByRole('button').find(b => b.className.includes('md:hidden'))!
    await user.click(hamburger)
    await waitFor(() => expect(screen.getByText('Cerrar sesión')).toBeInTheDocument())
    return user
  }

  it('click en un link del menú mobile cierra el dropdown', async () => {
    const user = await openMobileMenu()
    // Buscamos el link a /apuestas dentro del contenedor mobile (md:hidden)
    const mobileContainer = document.querySelector('.md\\:hidden.border-t')!
    const mobileLink = mobileContainer.querySelector('a[href="/apuestas"]') as HTMLAnchorElement
    expect(mobileLink).not.toBeNull()
    await user.click(mobileLink)
    await waitFor(() => expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument())
  })

  it('click en botón de Ganadores del menú mobile cierra el dropdown y abre el modal', async () => {
    const user = await openMobileMenu()
    // Hay 2 botones "ganadores": el desktop y el mobile. Clickeamos el mobile (el último)
    const ganadoresBtns = screen.getAllByRole('button').filter(b => /ganadores|🏆/i.test(b.textContent || ''))
    const mobileBtn = ganadoresBtns[ganadoresBtns.length - 1]
    await user.click(mobileBtn)
    expect(screen.getByTestId('ganadores-modal')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument())
  })

  it('click en link Admin del menú mobile cierra el dropdown', async () => {
    const user = await openMobileMenu()
    const adminLinks = screen.getAllByRole('link').filter(l => l.getAttribute('href') === '/admin')
    expect(adminLinks.length).toBeGreaterThan(0)
    await user.click(adminLinks[adminLinks.length - 1])
    await waitFor(() => expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument())
  })

  it('click en link Messages (admin) del menú mobile cierra el dropdown', async () => {
    const user = await openMobileMenu()
    const mobileContainer = document.querySelector('.md\\:hidden.border-t')!
    const link = mobileContainer.querySelector('a[href="/messages"]') as HTMLAnchorElement
    expect(link).not.toBeNull()
    await user.click(link)
    await waitFor(() => expect(screen.queryByText('Cerrar sesión')).not.toBeInTheDocument())
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '@/App'

// ── Stub all lazy-loaded pages ──────────────────────────────────────────────
vi.mock('@/pages/Login',               () => ({ Login:               () => <div>Login Page</div> }))
vi.mock('@/pages/Register',            () => ({ Register:            () => <div>Register Page</div> }))
vi.mock('@/pages/RecuperarContrasena', () => ({ RecuperarContrasena: () => <div>Recuperar Page</div> }))
vi.mock('@/pages/Home',                () => ({ Home:                () => <div>Home Page</div> }))
vi.mock('@/pages/Apuestas',            () => ({ Apuestas:            () => <div>Apuestas Page</div> }))
vi.mock('@/pages/Matriz',              () => ({ Matriz:              () => <div>Matriz Page</div> }))
vi.mock('@/pages/Ranking',             () => ({ Ranking:             () => <div>Ranking Page</div> }))
vi.mock('@/pages/Profile',             () => ({ Profile:             () => <div>Profile Page</div> }))
vi.mock('@/pages/Messages',            () => ({ Messages:            () => <div>Messages Page</div> }))
vi.mock('@/pages/Admin',               () => ({ Admin:               () => <div>Admin Page</div> }))
vi.mock('@/pages/Reglamento',          () => ({ Reglamento:          () => <div>Reglamento Page</div> }))
vi.mock('@/pages/Planilla',            () => ({ Planilla:            () => <div>Planilla Page</div> }))
vi.mock('@/pages/Tournaments',         () => ({ Tournaments:         () => <div>Tournaments Page</div> }))
vi.mock('@/pages/Fixture',             () => ({ Fixture:             () => <div>Fixture Page</div> }))

vi.mock('@/components/layout/Navbar',  () => ({ Navbar: () => <nav data-testid="navbar" /> }))
vi.mock('@/components/ui/Toast',       () => ({ ToastContainer: () => <div data-testid="toast" /> }))
vi.mock('@/components/ui/GoogleAdUnit',() => ({ GoogleAdUnit: () => <div data-testid="ad" /> }))
vi.mock('@/utils/theme',               () => ({ applyTheme: vi.fn() }))

const mockLoadBadges = vi.fn()
vi.mock('@/store/teamBadgesStore', () => ({
  useTeamBadgesStore: (sel: (s: any) => any) => sel({ load: mockLoadBadges }),
}))

// Configurable auth state
const mockAuth = { token: null as string | null, user: null as any }
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((sel?: (s: any) => any) => {
    return sel ? sel(mockAuth) : mockAuth
  }),
}))

function setAuth(token: string | null, user: any = null) {
  mockAuth.token = token
  mockAuth.user = user
}

function renderApp(path = '/') {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('App — rutas públicas', () => {
  beforeEach(() => { vi.clearAllMocks(); setAuth(null) })

  it('renderiza Login en /login', async () => {
    renderApp('/login')
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument())
  })

  it('renderiza Register en /register', async () => {
    renderApp('/register')
    await waitFor(() => expect(screen.getByText('Register Page')).toBeInTheDocument())
  })

  it('renderiza RecuperarContrasena en /recuperar-contrasena', async () => {
    renderApp('/recuperar-contrasena')
    await waitFor(() => expect(screen.getByText('Recuperar Page')).toBeInTheDocument())
  })

  it('renderiza Reglamento en / cuando NO hay sesión (HomeRoute)', async () => {
    setAuth(null)
    renderApp('/')
    await waitFor(() => expect(screen.getByText('Reglamento Page')).toBeInTheDocument())
  })

  it('renderiza Reglamento en /reglamento sin autenticación', async () => {
    renderApp('/reglamento')
    await waitFor(() => expect(screen.getByText('Reglamento Page')).toBeInTheDocument())
  })

  it('redirige a / las rutas desconocidas', async () => {
    renderApp('/ruta-inexistente')
    // En / sin token → Reglamento (via HomeRoute)
    await waitFor(() => expect(screen.getByText('Reglamento Page')).toBeInTheDocument())
  })
})

describe('App — RequireAuth (rutas protegidas sin sesión)', () => {
  beforeEach(() => { vi.clearAllMocks(); setAuth(null) })

  it('/apuestas sin token redirige a /login', async () => {
    renderApp('/apuestas')
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument())
  })

  it('/ranking sin token redirige a /login', async () => {
    renderApp('/ranking')
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument())
  })

  it('/profile sin token redirige a /login', async () => {
    renderApp('/profile')
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument())
  })

  it('/fixture sin token redirige a /login', async () => {
    renderApp('/fixture')
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument())
  })
})

describe('App — RequireAuth (rutas protegidas con sesión)', () => {
  beforeEach(() => { vi.clearAllMocks(); setAuth('valid-token', { id: 'u1', nombre: 'Test', rol: 'user', tema_equipo: 'neutral' }) })

  it('/ con token muestra Home Page (HomeRoute)', async () => {
    renderApp('/')
    await waitFor(() => expect(screen.getByText('Home Page')).toBeInTheDocument())
  })

  it('/apuestas con token muestra Apuestas Page', async () => {
    renderApp('/apuestas')
    await waitFor(() => expect(screen.getByText('Apuestas Page')).toBeInTheDocument())
  })

  it('/ranking con token muestra Ranking Page', async () => {
    renderApp('/ranking')
    await waitFor(() => expect(screen.getByText('Ranking Page')).toBeInTheDocument())
  })

  it('/fixture con token muestra Fixture Page', async () => {
    renderApp('/fixture')
    await waitFor(() => expect(screen.getByText('Fixture Page')).toBeInTheDocument())
  })
})

describe('App — RequireAdmin', () => {
  beforeEach(() => vi.clearAllMocks())

  it('/admin sin token redirige a /login', async () => {
    setAuth(null)
    renderApp('/admin')
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument())
  })

  it('/admin con token de user normal redirige a /', async () => {
    setAuth('tok', { id: 'u1', rol: 'user', nombre: 'Test', tema_equipo: 'neutral' })
    renderApp('/admin')
    // RequireAdmin redirige a / → HomeRoute → Home Page (hay token)
    await waitFor(() => expect(screen.getByText('Home Page')).toBeInTheDocument())
  })

  it('/admin con token de admin muestra Admin Page', async () => {
    setAuth('tok', { id: 'u1', rol: 'admin', nombre: 'Admin', tema_equipo: 'neutral' })
    renderApp('/admin')
    await waitFor(() => expect(screen.getByText('Admin Page')).toBeInTheDocument())
  })

  it('/messages con token de user normal redirige a Home', async () => {
    setAuth('tok', { id: 'u1', rol: 'user', nombre: 'Test', tema_equipo: 'neutral' })
    renderApp('/messages')
    await waitFor(() => expect(screen.getByText('Home Page')).toBeInTheDocument())
  })
})

describe('App — efectos secundarios', () => {
  beforeEach(() => vi.clearAllMocks())

  it('llama a applyTheme con el tema del usuario al montar', async () => {
    setAuth('tok', { id: 'u1', rol: 'user', nombre: 'Test', tema_equipo: 'boca' })
    const { applyTheme } = await import('@/utils/theme')
    renderApp('/')
    await waitFor(() => expect(applyTheme).toHaveBeenCalledWith('boca'))
  })

  it('llama a applyTheme con "neutral" cuando no hay usuario', async () => {
    setAuth(null)
    const { applyTheme } = await import('@/utils/theme')
    renderApp('/login')
    await waitFor(() => expect(applyTheme).toHaveBeenCalledWith('neutral'))
  })

  it('llama a loadBadges al montar', async () => {
    setAuth('tok', { id: 'u1', rol: 'user', nombre: 'Test', tema_equipo: 'neutral' })
    renderApp('/')
    await waitFor(() => expect(mockLoadBadges).toHaveBeenCalled())
  })

  it('renderiza el Navbar en rutas con AppLayout', async () => {
    setAuth('tok', { id: 'u1', rol: 'user', nombre: 'Test', tema_equipo: 'neutral' })
    renderApp('/apuestas')
    await waitFor(() => expect(screen.getByTestId('navbar')).toBeInTheDocument())
  })
})

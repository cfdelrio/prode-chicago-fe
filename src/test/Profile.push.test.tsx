import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Profile } from '@/pages/Profile'

const mockShow = vi.hoisted(() => vi.fn())
const mockSubscribe = vi.hoisted(() => vi.fn())
const mockUnsubscribe = vi.hoisted(() => vi.fn())
const mockUsePush = vi.hoisted(() => vi.fn())

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = {
      user: {
        id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user',
        foto_url: null, tema_equipo: 'neutral',
        whatsapp_number: '', whatsapp_consent: false,
      },
      updateUser: vi.fn(),
    }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: mockUsePush,
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: { whatsapp_number: '', whatsapp_consent: false } } }),
    put: vi.fn().mockResolvedValue({ data: { data: { whatsapp_number: '', whatsapp_consent: false } } }),
  },
}))

vi.mock('@/components/onboarding/Tour', () => ({
  resetOnboarding: vi.fn(),
}))

function renderProfile() {
  return render(<MemoryRouter><Profile /></MemoryRouter>)
}

describe('Profile — push notifications (estado default/default)', () => {
  afterEach(() => vi.clearAllMocks())

  it('no muestra sección push cuando state=unsupported', () => {
    mockUsePush.mockReturnValue({ state: 'unsupported', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: false })
    renderProfile()
    expect(screen.queryByText(/notificaciones push/i)).not.toBeInTheDocument()
  })

  it('muestra sección push cuando state=default', async () => {
    mockUsePush.mockReturnValue({ state: 'default', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: false })
    renderProfile()
    await waitFor(() => {
      expect(screen.getByText(/notificaciones push/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /activar notificaciones/i })).toBeInTheDocument()
  })

  it('click en "Activar notificaciones" llama a push.subscribe', async () => {
    const user = userEvent.setup()
    mockUsePush.mockReturnValue({ state: 'default', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: false })
    renderProfile()

    await user.click(await screen.findByRole('button', { name: /activar notificaciones/i }))
    expect(mockSubscribe).toHaveBeenCalled()
  })
})

describe('Profile — push notifications (estado subscribed)', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra botón "Desactivar notificaciones" cuando está suscrito', async () => {
    mockUsePush.mockReturnValue({ state: 'subscribed', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: false })
    renderProfile()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /desactivar notificaciones/i })).toBeInTheDocument()
    })
  })

  it('click en "Desactivar" llama a push.unsubscribe', async () => {
    const user = userEvent.setup()
    mockUsePush.mockReturnValue({ state: 'subscribed', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: false })
    renderProfile()

    await user.click(await screen.findByRole('button', { name: /desactivar notificaciones/i }))
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('botón desactivar se deshabilita cuando loading=true', async () => {
    mockUsePush.mockReturnValue({ state: 'subscribed', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: true })
    renderProfile()
    const btn = await screen.findByRole('button', { name: /\.\.\./i })
    expect(btn).toBeDisabled()
  })
})

describe('Profile — push notifications (estado denied)', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra mensaje de bloqueo cuando state=denied', async () => {
    mockUsePush.mockReturnValue({ state: 'denied', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: false })
    renderProfile()
    await waitFor(() => {
      expect(screen.getByText(/bloqueadas/i)).toBeInTheDocument()
    })
  })

  it('botón activar está deshabilitado cuando state=denied', async () => {
    mockUsePush.mockReturnValue({ state: 'denied', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: false })
    renderProfile()
    const btn = await screen.findByRole('button', { name: /activar notificaciones/i })
    expect(btn).toBeDisabled()
  })
})

describe('Profile — tema visual (manejo de errores)', () => {
  afterEach(() => vi.clearAllMocks())

  it('error al guardar tema muestra toast de warning', async () => {
    const user = userEvent.setup()
    mockUsePush.mockReturnValue({ state: 'unsupported', subscribe: mockSubscribe, unsubscribe: mockUnsubscribe, loading: false })
    const { api } = await import('@/api/client')
    ;(api.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('net'))
    renderProfile()

    const themeButtons = document.querySelectorAll('button.rounded-xl.overflow-hidden')
    expect(themeButtons.length).toBeGreaterThan(0)
    await user.click(themeButtons[0] as HTMLElement)

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(
        expect.stringContaining('tema'),
        'warning'
      )
    })
  })
})

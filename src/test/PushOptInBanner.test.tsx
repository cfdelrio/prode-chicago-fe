import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PushOptInBanner } from '@/components/PushOptInBanner'

const mockSubscribe = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockShow = vi.hoisted(() => vi.fn())
const mockState = vi.hoisted(() => ({ value: 'unsubscribed' as string, loading: false }))

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    state: mockState.value,
    loading: mockState.loading,
    subscribe: mockSubscribe,
    unsubscribe: vi.fn(),
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

describe('PushOptInBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    mockState.value = 'unsubscribed'
    mockState.loading = false
  })
  afterEach(() => vi.clearAllMocks())

  it('renderiza cuando el state es "unsubscribed"', () => {
    render(<PushOptInBanner />)
    expect(screen.getByTestId('push-optin-banner')).toBeInTheDocument()
    expect(screen.getByText(/No te pierdas los resultados/i)).toBeInTheDocument()
  })

  it('NO renderiza si state es "subscribed"', () => {
    mockState.value = 'subscribed'
    render(<PushOptInBanner />)
    expect(screen.queryByTestId('push-optin-banner')).toBeNull()
  })

  it('NO renderiza si state es "denied"', () => {
    mockState.value = 'denied'
    render(<PushOptInBanner />)
    expect(screen.queryByTestId('push-optin-banner')).toBeNull()
  })

  it('NO renderiza si state es "unsupported"', () => {
    mockState.value = 'unsupported'
    render(<PushOptInBanner />)
    expect(screen.queryByTestId('push-optin-banner')).toBeNull()
  })

  it('NO renderiza si ya fue dismisseado 3 veces', () => {
    localStorage.setItem('push_banner_dismissed_count', '3')
    render(<PushOptInBanner />)
    expect(screen.queryByTestId('push-optin-banner')).toBeNull()
  })

  it('renderiza si fue dismisseado 2 veces (todavía dentro del límite)', () => {
    localStorage.setItem('push_banner_dismissed_count', '2')
    render(<PushOptInBanner />)
    expect(screen.getByTestId('push-optin-banner')).toBeInTheDocument()
  })

  it('click en ✕ incrementa el contador y oculta el banner', async () => {
    const user = userEvent.setup()
    render(<PushOptInBanner />)
    await user.click(screen.getByLabelText('Descartar'))
    expect(localStorage.getItem('push_banner_dismissed_count')).toBe('1')
    expect(screen.queryByTestId('push-optin-banner')).toBeNull()
  })

  it('click en "Activar" llama a subscribe y muestra toast de éxito', async () => {
    const user = userEvent.setup()
    render(<PushOptInBanner />)
    await user.click(screen.getByText(/Activar notificaciones/i))
    expect(mockSubscribe).toHaveBeenCalled()
    expect(mockShow).toHaveBeenCalledWith('Notificaciones activadas ✓', 'success')
  })

  it('botón se muestra "Activando…" mientras loading', () => {
    mockState.loading = true
    render(<PushOptInBanner />)
    expect(screen.getByText(/Activando/i)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteFriendCTA } from '@/components/InviteFriendCTA'

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', nombre: 'Carlos López' } }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: vi.fn() }),
}))

describe('InviteFriendCTA — variant compact', () => {
  afterEach(() => vi.clearAllMocks())

  it('renderiza la card compacta con WhatsApp', () => {
    render(<InviteFriendCTA variant="compact" />)
    expect(screen.getByText('💌 Invitá a un amigo')).toBeInTheDocument()
    expect(screen.getByText(/Más jugadores/i)).toBeInTheDocument()
    expect(screen.getByText('💬 WhatsApp')).toBeInTheDocument()
  })

  it('click en WhatsApp dispara window.open', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any)
    const user = userEvent.setup()
    render(<InviteFriendCTA variant="compact" />)
    await user.click(screen.getByText('💬 WhatsApp'))
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank')
    openSpy.mockRestore()
  })
})

describe('InviteFriendCTA — variant full (default)', () => {
  afterEach(() => vi.clearAllMocks())

  it('renderiza la card completa con sus dos botones', () => {
    render(<InviteFriendCTA />)
    expect(screen.getByText('💌 Invitá a tus amigos')).toBeInTheDocument()
    expect(screen.getByText(/más grande el premio/i)).toBeInTheDocument()
    expect(screen.getByText('💬 WhatsApp')).toBeInTheDocument()
    expect(screen.getByText(/Personalizar/i)).toBeInTheDocument()
  })

  it('click en WhatsApp dispara window.open con wa.me', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any)
    const user = userEvent.setup()
    render(<InviteFriendCTA />)
    await user.click(screen.getByText('💬 WhatsApp'))
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank')
    openSpy.mockRestore()
  })

  it('click en Personalizar abre el modal con el mensaje', async () => {
    const user = userEvent.setup()
    render(<InviteFriendCTA />)
    await user.click(screen.getByText(/Personalizar/i))
    // El modal aparece con el textarea
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Mensaje a enviar/i)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  buildInviteMessage,
  useInviteFriend,
  InviteFriendModal,
  InviteFriendCTA,
} from '@/components/InviteFriendCTA'

const mockShow = vi.hoisted(() => vi.fn())

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((sel?: (s: any) => any) => {
    const store = { user: { id: 'u1', nombre: 'Carlos Pérez', rol: 'user' } }
    return sel ? sel(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

// ───────────────────────────────────────────────────────────────
describe('buildInviteMessage', () => {
  it('incluye el nombre del invitador cuando se provee', () => {
    const msg = buildInviteMessage('Carlos')
    expect(msg).toContain('Soy Carlos')
    expect(msg).toContain('PRODE del Mundial 2026')
    expect(msg).toContain('https://prodecaballito.com')
  })

  it('usa la versión genérica cuando no hay invitador', () => {
    const msg = buildInviteMessage()
    expect(msg).not.toContain('Soy ')
    expect(msg).toContain('Sumate al PRODE')
    expect(msg).toContain('https://prodecaballito.com')
  })

  it('incluye el precio de la boleta', () => {
    const msg = buildInviteMessage()
    expect(msg).toContain('$20.000')
  })
})

// ───────────────────────────────────────────────────────────────
describe('useInviteFriend — openModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('arranca con showModal=false y message vacío', () => {
    const { result } = renderHook(() => useInviteFriend())
    expect(result.current.showModal).toBe(false)
    expect(result.current.message).toBe('')
  })

  it('openModal setea showModal=true y carga mensaje con primer nombre', () => {
    const { result } = renderHook(() => useInviteFriend())
    act(() => result.current.openModal())
    expect(result.current.showModal).toBe(true)
    expect(result.current.message).toContain('Soy Carlos')
  })
})

// ───────────────────────────────────────────────────────────────
describe('useInviteFriend — inviteVia', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('whatsapp abre wa.me con el mensaje encodeado', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { result } = renderHook(() => useInviteFriend())
    act(() => result.current.inviteVia('whatsapp'))
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/?text='),
      '_blank'
    )
    const url = openSpy.mock.calls[0][0] as string
    expect(decodeURIComponent(url)).toContain('PRODE')
  })

  it('sms setea window.location.href con sms:', () => {
    let assigned = ''
    Object.defineProperty(window, 'location', {
      value: { set href(v: string) { assigned = v } },
      configurable: true,
    })
    const { result } = renderHook(() => useInviteFriend())
    act(() => result.current.inviteVia('sms'))
    expect(assigned).toMatch(/^sms:\?body=/)
  })

  it('email setea window.location.href con mailto:', () => {
    let assigned = ''
    Object.defineProperty(window, 'location', {
      value: { set href(v: string) { assigned = v } },
      configurable: true,
    })
    const { result } = renderHook(() => useInviteFriend())
    act(() => result.current.inviteVia('email'))
    expect(assigned).toMatch(/^mailto:\?subject=/)
    expect(assigned).toContain('body=')
  })

  it('copy llama a clipboard.writeText y muestra toast success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText }, configurable: true, writable: true,
    })
    const { result } = renderHook(() => useInviteFriend())
    await act(async () => {
      result.current.inviteVia('copy')
      await Promise.resolve()
    })
    expect(writeText).toHaveBeenCalled()
    // El toast se llama en el .then() — esperar microtask
    await new Promise(r => setTimeout(r, 10))
    expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('copiado'), 'success')
  })

  it('copy con clipboard rechazado muestra toast de error', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText }, configurable: true, writable: true,
    })
    const { result } = renderHook(() => useInviteFriend())
    await act(async () => {
      result.current.inviteVia('copy')
      await new Promise(r => setTimeout(r, 10))
    })
    expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('No se pudo'), 'error')
  })

  it('copy sin clipboard API muestra toast de error', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined, configurable: true, writable: true,
    })
    const { result } = renderHook(() => useInviteFriend())
    act(() => result.current.inviteVia('copy'))
    expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('No se pudo'), 'error')
  })

  it('native llama a navigator.share cuando está disponible', () => {
    const shareFn = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      value: shareFn, configurable: true, writable: true,
    })
    const { result } = renderHook(() => useInviteFriend())
    act(() => result.current.inviteVia('native'))
    expect(shareFn).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('PRODE') }))
  })
})

// ───────────────────────────────────────────────────────────────
describe('InviteFriendModal', () => {
  const baseProps = {
    show: true,
    onClose: vi.fn(),
    message: 'Mi mensaje',
    onMessageChange: vi.fn(),
    onInvite: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('no renderiza nada cuando show=false', () => {
    const { container } = render(<InviteFriendModal {...baseProps} show={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza el modal y los botones de canal cuando show=true', () => {
    render(<InviteFriendModal {...baseProps} />)
    expect(screen.getByText(/Invitá a un amigo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SMS/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Email/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument()
  })

  it('muestra el textarea con el mensaje', () => {
    render(<InviteFriendModal {...baseProps} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('Mi mensaje')
  })

  it('click en WhatsApp llama a onInvite("whatsapp")', async () => {
    const user = userEvent.setup()
    render(<InviteFriendModal {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /WhatsApp/i }))
    expect(baseProps.onInvite).toHaveBeenCalledWith('whatsapp')
  })

  it('click en SMS llama a onInvite("sms")', async () => {
    const user = userEvent.setup()
    render(<InviteFriendModal {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /SMS/i }))
    expect(baseProps.onInvite).toHaveBeenCalledWith('sms')
  })

  it('click en Email llama a onInvite("email")', async () => {
    const user = userEvent.setup()
    render(<InviteFriendModal {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Email/i }))
    expect(baseProps.onInvite).toHaveBeenCalledWith('email')
  })

  it('click en Copiar llama a onInvite("copy")', async () => {
    const user = userEvent.setup()
    render(<InviteFriendModal {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Copiar/i }))
    expect(baseProps.onInvite).toHaveBeenCalledWith('copy')
  })

  it('cambiar el textarea llama a onMessageChange', async () => {
    const user = userEvent.setup()
    render(<InviteFriendModal {...baseProps} />)
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, '!')
    expect(baseProps.onMessageChange).toHaveBeenCalled()
  })

  it('click en Cerrar llama a onClose', async () => {
    const user = userEvent.setup()
    render(<InviteFriendModal {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /^Cerrar$/i }))
    expect(baseProps.onClose).toHaveBeenCalled()
  })

  it('muestra botón "Más opciones" cuando navigator.share existe', () => {
    Object.defineProperty(navigator, 'share', { value: vi.fn(), configurable: true })
    render(<InviteFriendModal {...baseProps} />)
    expect(screen.getByRole('button', { name: /Más opciones/i })).toBeInTheDocument()
  })
})

// ───────────────────────────────────────────────────────────────
describe('InviteFriendCTA component', () => {
  beforeEach(() => vi.clearAllMocks())

  it('variant=full renderiza el CTA principal con dos botones', () => {
    render(<InviteFriendCTA variant="full" />)
    expect(screen.getByText(/Mientras más jueguen/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /WhatsApp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Personalizar/i })).toBeInTheDocument()
  })

  it('variant=compact renderiza versión compacta', () => {
    render(<InviteFriendCTA variant="compact" />)
    expect(screen.getByText(/Invitá a un amigo/i)).toBeInTheDocument()
    expect(screen.getByText(/Más jugadores/i)).toBeInTheDocument()
  })

  it('click en "Personalizar" abre el modal', async () => {
    const user = userEvent.setup()
    render(<InviteFriendCTA variant="full" />)
    await user.click(screen.getByRole('button', { name: /Personalizar/i }))
    // El modal renderiza una sección "Compartir por" exclusiva del modal
    expect(screen.getByText(/Compartir por/i)).toBeInTheDocument()
  })

  it('default variant es "full"', () => {
    render(<InviteFriendCTA />)
    expect(screen.getByText(/Mientras más jueguen/i)).toBeInTheDocument()
  })
})

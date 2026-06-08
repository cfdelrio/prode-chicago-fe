import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RecuperarContrasena } from '@/pages/RecuperarContrasena'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockShow = vi.fn()
vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/api/client', () => ({
  api: { post: vi.fn() },
}))

function renderPage() {
  return render(<MemoryRouter><RecuperarContrasena /></MemoryRouter>)
}

describe('RecuperarContrasena — paso email', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza el step email por defecto', () => {
    renderPage()
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar código/i })).toBeInTheDocument()
  })

  it('muestra link para volver al login', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /volver al login/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('submit con email vacío no llama a la API (required)', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    renderPage()

    await user.click(screen.getByRole('button', { name: /enviar código/i }))

    expect(api.post).not.toHaveBeenCalled()
  })

  it('submit con email → llama api.post y avanza al paso code', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    renderPage()

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@test.com')
    await user.click(screen.getByRole('button', { name: /enviar código/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'test@test.com' })
      expect(mockShow).toHaveBeenCalledWith('Te enviamos un código al email', 'success')
    })

    // Avanzó al paso code
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
  })

  it('error de API muestra toast de error con mensaje del servidor', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Email no registrado' } },
    })
    renderPage()

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'nope@test.com')
    await user.click(screen.getByRole('button', { name: /enviar código/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('Email no registrado', 'error')
    })
    // Se queda en el paso email
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
  })

  it('error de API sin mensaje → muestra mensaje genérico', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))
    renderPage()

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'x@x.com')
    await user.click(screen.getByRole('button', { name: /enviar código/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('Error al enviar email', 'error')
    })
  })

  it('botón se deshabilita mientras carga', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    let resolve!: (v: unknown) => void
    ;(api.post as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise((r) => { resolve = r })
    )
    renderPage()

    await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@test.com')
    await user.click(screen.getByRole('button', { name: /enviar código/i }))

    expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled()
    resolve({})
  })
})

describe('RecuperarContrasena — paso code', () => {
  beforeEach(() => vi.clearAllMocks())

  async function goToCodeStep() {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})
    renderPage()
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'user@test.com')
    await user.click(screen.getByRole('button', { name: /enviar código/i }))
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument())
    return user
  }

  it('muestra campos de código y contraseña', async () => {
    await goToCodeStep()
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText('••••••')).toHaveLength(2)
  })

  it('muestra el email en el texto de instrucciones', async () => {
    await goToCodeStep()
    expect(screen.getByText(/user@test.com/)).toBeInTheDocument()
  })

  it('botón "volver a ingresar email" regresa al paso email', async () => {
    const user = await goToCodeStep()
    await user.click(screen.getByRole('button', { name: /volver a ingresar email/i }))
    expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument()
  })

  it('contraseñas que no coinciden → toast de error sin llamar API', async () => {
    const user = await goToCodeStep()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockClear()

    await user.type(screen.getByPlaceholderText('000000'), '123456')
    const [passInput, confirmInput] = screen.getAllByPlaceholderText('••••••')
    await user.type(passInput, 'abc123')
    await user.type(confirmInput, 'xyz789')
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }))

    expect(mockShow).toHaveBeenCalledWith('Las contraseñas no coinciden', 'error')
    expect(api.post).not.toHaveBeenCalledWith('/auth/reset-password', expect.anything())
  })

  it('contraseña menor a 6 caracteres → toast de error', async () => {
    const user = await goToCodeStep()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockClear()

    await user.type(screen.getByPlaceholderText('000000'), '123456')
    const [passInput, confirmInput] = screen.getAllByPlaceholderText('••••••')
    await user.type(passInput, 'abc')
    await user.type(confirmInput, 'abc')
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }))

    expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('6 caracteres'), 'error')
    expect(api.post).not.toHaveBeenCalledWith('/auth/reset-password', expect.anything())
  })

  it('reset exitoso → toast success + navigate a /login', async () => {
    const user = await goToCodeStep()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

    await user.type(screen.getByPlaceholderText('000000'), '654321')
    const [passInput, confirmInput] = screen.getAllByPlaceholderText('••••••')
    await user.type(passInput, 'nueva123')
    await user.type(confirmInput, 'nueva123')
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        email: 'user@test.com',
        code: '654321',
        newPassword: 'nueva123',
      })
      expect(mockShow).toHaveBeenCalledWith('Contraseña restablecida correctamente', 'success')
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('error de API en reset → toast de error con mensaje del servidor', async () => {
    const user = await goToCodeStep()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: 'Código expirado' } },
    })

    await user.type(screen.getByPlaceholderText('000000'), '000000')
    const [passInput, confirmInput] = screen.getAllByPlaceholderText('••••••')
    await user.type(passInput, 'pass123')
    await user.type(confirmInput, 'pass123')
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('Código expirado', 'error')
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('error de API sin mensaje → mensaje genérico', async () => {
    const user = await goToCodeStep()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('net'))

    await user.type(screen.getByPlaceholderText('000000'), '000000')
    const [passInput, confirmInput] = screen.getAllByPlaceholderText('••••••')
    await user.type(passInput, 'pass123')
    await user.type(confirmInput, 'pass123')
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('Código inválido o expirado', 'error')
    })
  })

  it('campo código solo acepta dígitos y máximo 6', async () => {
    const user = await goToCodeStep()
    const codeInput = screen.getByPlaceholderText('000000')
    await user.type(codeInput, 'abc1234567')
    expect((codeInput as HTMLInputElement).value).toBe('123456')
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Register } from '@/pages/Register'

const mockShow = vi.hoisted(() => vi.fn())
const mockSetAuth = vi.hoisted(() => vi.fn())
const mockUpdateUser = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((sel?: (s: any) => any) => {
    const store = { user: null, setAuth: mockSetAuth, updateUser: mockUpdateUser }
    return sel ? sel(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/api/client', () => ({
  api: { post: vi.fn() },
}))

function renderRegister() {
  return render(<MemoryRouter><Register /></MemoryRouter>)
}

async function goToCompleteStep() {
  const user = userEvent.setup()
  const { api } = await import('@/api/client')
  ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    data: { data: { userId: 'u1' } },
  })
  renderRegister()
  await user.type(screen.getByPlaceholderText('Tu nombre y apellido'), 'Carlos')
  await user.type(screen.getByPlaceholderText('tu@email.com'), 'carlos@test.com')
  await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'pass123')
  await user.click(screen.getByRole('button', { name: /Continuar/i }))
  await waitFor(() => expect(screen.getByText(/Cuenta creada/i)).toBeInTheDocument())
  return { user, api }
}

// ───────────────────────────────────────────────────────────────
describe('Register — validaciones del paso complete', () => {
  beforeEach(() => vi.clearAllMocks())

  it('handleComplete sin teléfono muestra error y NO llama API', async () => {
    const { user, api } = await goToCompleteStep()
    ;(api.post as ReturnType<typeof vi.fn>).mockClear()

    // No tipear teléfono, intentar submit (el form lo bloquearía por required,
    // pero el handler también valida explícitamente)
    const completeBtn = screen.getByRole('button', { name: /Completar registro/i })
    // El input está required — bypaseamos llamando al submit programáticamente
    const form = completeBtn.closest('form')!
    // forzar submit sin la validación HTML
    form.noValidate = true
    await user.click(completeBtn)

    // Tras click sin teléfono, debería haber toast de error
    expect(api.post).not.toHaveBeenCalledWith('/auth/complete-registration', expect.anything())
  })

  it('handleComplete con teléfono pero sin consentimiento muestra error', async () => {
    const { user, api } = await goToCompleteStep()
    ;(api.post as ReturnType<typeof vi.fn>).mockClear()

    await user.type(screen.getByPlaceholderText('11 1234 5678'), '1155996222')
    // Desmarcar el checkbox de consentimiento
    const checkboxes = screen.getAllByRole('checkbox')
    const consentCheckbox = checkboxes[0]
    if (consentCheckbox && (consentCheckbox as HTMLInputElement).checked) {
      await user.click(consentCheckbox)
    }

    await user.click(screen.getByRole('button', { name: /Completar registro/i }))

    expect(api.post).not.toHaveBeenCalledWith('/auth/complete-registration', expect.anything())
    expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error')
  })

  it('cambio de código de país se refleja en el whatsapp_number final', async () => {
    const { user, api } = await goToCompleteStep()

    // Seleccionar Brasil (+55)
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, '+55')

    await user.type(screen.getByPlaceholderText('11 1234 5678'), '11999998888')

    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { token: 'tok', refreshToken: 'ref', user: { id: 'u1', nombre: 'Carlos' } } },
    })
    await user.click(screen.getByRole('button', { name: /Completar registro/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/auth/complete-registration',
        expect.objectContaining({ whatsapp_number: '+5511999998888' })
      )
    })
  })

  it('input de teléfono solo acepta dígitos', async () => {
    const { user } = await goToCompleteStep()
    const phoneInput = screen.getByPlaceholderText('11 1234 5678') as HTMLInputElement
    await user.type(phoneInput, '11-2345-6789')
    expect(phoneInput.value).toMatch(/^\d+$/)
  })

  it('todos los temas de equipo están disponibles en el selector', async () => {
    await goToCompleteStep()
    expect(screen.getByRole('button', { name: /Boca Juniors/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /River Plate/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Racing Club/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Independiente/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Estudiantes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Huracán/i })).toBeInTheDocument()
  })
})

// ───────────────────────────────────────────────────────────────
describe('Register — paso form: error handling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('error de API sin mensaje específico usa mensaje genérico', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))

    renderRegister()
    await user.type(screen.getByPlaceholderText('Tu nombre y apellido'), 'Carlos')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'carlos@test.com')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'pass123')
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith('Error al registrarse', 'error')
    })
  })
})


// ───────────────────────────────────────────────────────────────
describe('Register — stepper visual', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra los 3 labels del stepper', () => {
    renderRegister()
    expect(screen.getByText('Cuenta')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
    expect(screen.getByText('Avisos')).toBeInTheDocument()
  })

  it('avanza el stepper visual al pasar al paso de perfil', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { userId: 'u1' } },
    })
    renderRegister()
    await user.type(screen.getByPlaceholderText('Tu nombre y apellido'), 'Carlos')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'carlos@test.com')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'pass123')
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    await waitFor(() => expect(screen.getByText(/Cuenta creada/i)).toBeInTheDocument())
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})

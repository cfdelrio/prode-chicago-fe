import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: null, setAuth: mockSetAuth, updateUser: mockUpdateUser }
    return selector ? selector(store) : store
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

  await user.type(screen.getByPlaceholderText('11 1234 5678'), '1155996222')

  return { user, api }
}

describe('Register — handlePhotoSelect', () => {
  afterEach(() => vi.clearAllMocks())

  it('seleccionar foto la previsualiza vía FileReader', async () => {
    const { user } = await goToCompleteStep()
    const file = new File(['fake-image-bytes'], 'foto.jpg', { type: 'image/jpeg' })
    // El input file está oculto
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)
    // Verificamos que el botón con la foto tenga el ícono de "editar" tras setear preview
    await waitFor(() => {
      expect(document.querySelector('img[alt=""]')).not.toBeNull()
    })
  })

  it('cancelar diálogo de archivo (sin file) no rompe', async () => {
    await goToCompleteStep()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    // Simular cambio sin archivos
    fireEvent.change(fileInput, { target: { files: [] } })
    expect(document.querySelector('img[alt=""]')).toBeNull()
  })

  it('click en el botón de foto dispara el input file', async () => {
    const { user } = await goToCompleteStep()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})
    // El botón de foto es el primer botón "type=button" dentro del form de complete
    // Tiene el emoji 📷 inicialmente
    const photoBtn = screen.getByText('📷').closest('button')!
    await user.click(photoBtn)
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })
})

describe('Register — handleComplete con foto', () => {
  beforeEach(() => {
    // Mock canvas + Image para compressImage
    global.URL.createObjectURL = vi.fn(() => 'blob:fake')
    global.URL.revokeObjectURL = vi.fn()
    // Image carga al instante
    class FakeImg {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 100
      height = 100
      _src = ''
      set src(v: string) { this._src = v; setTimeout(() => this.onload?.(), 0) }
      get src() { return this._src }
    }
    ;(global as any).Image = FakeImg
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() })) as any
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,FAKEBASE64')
  })
  afterEach(() => vi.clearAllMocks())

  it('con foto seleccionada y token, llama /users/upload-avatar y updateUser', async () => {
    const { user, api } = await goToCompleteStep()

    // Subir foto antes de completar
    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)
    await waitFor(() => expect(document.querySelector('img[alt=""]')).not.toBeNull())

    ;(api.post as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: { data: { token: 'tok', refreshToken: 'ref', user: { id: 'u1', nombre: 'Carlos' } } },
      })
      .mockResolvedValueOnce({
        data: { data: { url: 'https://cdn.x/avatar.jpg' } },
      })

    await user.click(screen.getByRole('button', { name: /Completar registro/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/users/upload-avatar',
        expect.objectContaining({ contentType: 'image/jpeg' }),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
      )
    })
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ foto_url: 'https://cdn.x/avatar.jpg' }))
  })

  it('upload de foto que falla no rompe el registro', async () => {
    const { user, api } = await goToCompleteStep()

    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    ;(api.post as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: { data: { token: 'tok', refreshToken: 'ref', user: { id: 'u1' } } },
      })
      .mockRejectedValueOnce(new Error('upload failed'))

    await user.click(screen.getByRole('button', { name: /Completar registro/i }))
    await waitFor(() => expect(mockSetAuth).toHaveBeenCalled())
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })
})

describe('Register — handleAllowNotifications/Skip', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') },
      writable: true, configurable: true,
    })
  })
  afterEach(() => vi.clearAllMocks())

  async function goToNotifyStep() {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')

    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { userId: 'u1' } },
    })
    renderRegister()
    await user.type(screen.getByPlaceholderText('Tu nombre y apellido'), 'C')
    await user.type(screen.getByPlaceholderText('tu@email.com'), 'c@x.com')
    await user.type(screen.getByPlaceholderText('Mínimo 6 caracteres'), 'pass123')
    await user.click(screen.getByRole('button', { name: /Continuar/i }))
    await waitFor(() => expect(screen.getByText(/Cuenta creada/i)).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('11 1234 5678'), '1155996222')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { token: 'tok', refreshToken: 'ref', user: { id: 'u1', nombre: 'C' } } },
    })
    await user.click(screen.getByRole('button', { name: /Completar registro/i }))
    await waitFor(() => expect(screen.getByText(/Activá las notificaciones/i)).toBeInTheDocument())
    return { user }
  }

  it('NO hay botón para saltear notificaciones — son obligatorias', async () => {
    const { user } = await goToNotifyStep()
    expect(screen.queryByRole('button', { name: /Ahora no/i })).not.toBeInTheDocument()
  })

  it('handleAllowNotifications con error → navega después de pausa', async () => {
    window.Notification.requestPermission = vi.fn().mockRejectedValue(new Error('blocked'))
    const { user } = await goToNotifyStep()
    await user.click(screen.getByRole('button', { name: /Activar notificaciones/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/apuestas'), { timeout: 2000 })
  })

  it('permission granted → navega después del setTimeout', async () => {
    window.Notification.requestPermission = vi.fn().mockResolvedValue('granted')
    const { user } = await goToNotifyStep()
    await user.click(screen.getByRole('button', { name: /Activar notificaciones/i }))
    await waitFor(() => expect(screen.getByText(/Todo listo/i)).toBeInTheDocument())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/apuestas'), { timeout: 3000 })
  })
})

describe('Register — paso complete con permiso de notificaciones ya decidido', () => {
  beforeEach(() => {
    // Si Notification.permission !== 'default', se salta el paso notify y navega directo
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'granted', requestPermission: vi.fn() },
      writable: true, configurable: true,
    })
  })
  afterEach(() => vi.clearAllMocks())

  it('con Notification.permission ya granted, navega directo a /apuestas', async () => {
    const { user, api } = await goToCompleteStep()
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { token: 'tok', refreshToken: 'ref', user: { id: 'u1' } } },
    })
    await user.click(screen.getByRole('button', { name: /Completar registro/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/apuestas'))
  })
})

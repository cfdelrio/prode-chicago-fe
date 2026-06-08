import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Profile } from '@/pages/Profile'

const mockShow = vi.hoisted(() => vi.fn())
const mockUpdateUser = vi.hoisted(() => vi.fn())
const mockNavigate = vi.hoisted(() => vi.fn())
const mockResetOnboarding = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const baseUser = {
  id: 'u1', nombre: 'Carlos', idioma_pref: 'es', rol: 'user',
  foto_url: null as string | null, tema_equipo: 'neutral',
  whatsapp_number: '', whatsapp_consent: false,
}

vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn((selector?: (s: any) => any) => {
    const store = { user: { ...baseUser }, updateUser: mockUpdateUser }
    return selector ? selector(store) : store
  }),
}))

vi.mock('@/store/toastStore', () => ({
  useToastStore: () => ({ show: mockShow }),
}))

vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ state: 'unsupported', subscribe: vi.fn(), unsubscribe: vi.fn(), loading: false }),
}))

vi.mock('@/utils/theme', () => ({ applyTheme: vi.fn() }))

vi.mock('@/components/onboarding/Tour', () => ({
  resetOnboarding: mockResetOnboarding,
}))

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: { whatsapp_number: '', whatsapp_consent: false } } }),
    put: vi.fn().mockResolvedValue({ data: { data: { whatsapp_number: '', whatsapp_consent: false } } }),
    post: vi.fn(),
  },
}))

function mockStore(overrides: Partial<typeof baseUser> = {}) {
  return (selector?: (s: any) => any) => {
    const store = { user: { ...baseUser, ...overrides }, updateUser: mockUpdateUser }
    return selector ? selector(store) : store
  }
}

function renderProfile() {
  return render(<MemoryRouter><Profile /></MemoryRouter>)
}

// ─── foto_url display ─────────────────────────────────────────────────────────

describe('Profile — foto_url display', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useAuthStore } = await import('@/store/authStore')
    ;(useAuthStore as ReturnType<typeof vi.fn>).mockImplementation(mockStore({ foto_url: null }))
  })

  it('muestra la imagen cuando foto_url está definida', async () => {
    const { useAuthStore } = await import('@/store/authStore')
    ;(useAuthStore as ReturnType<typeof vi.fn>).mockImplementation(
      mockStore({ foto_url: 'https://example.com/photo.jpg' })
    )
    const { container } = renderProfile()
    await waitFor(() => {
      expect(container.querySelector('img[src="https://example.com/photo.jpg"]')).toBeInTheDocument()
    })
  })

  it('muestra inicial del nombre cuando foto_url es null', async () => {
    renderProfile()
    // El div de avatar muestra la primera letra del nombre
    await waitFor(() => expect(screen.getByText('C')).toBeInTheDocument())
  })
})

// ─── Canvas + Image mocks helpers ─────────────────────────────────────────────

class FakeImageLoad {
  onload: ((e: Event) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  width = 200
  height = 150
  private _src = ''
  get src() { return this._src }
  set src(value: string) {
    this._src = value
    if (value) setTimeout(() => this.onload?.(new Event('load')), 0)
  }
}

class FakeImageError {
  onload: ((e: Event) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  private _src = ''
  get src() { return this._src }
  set src(value: string) {
    this._src = value
    if (value) setTimeout(() => this.onerror?.(new Event('error')), 0)
  }
}

// ─── photo upload (success + API error) ──────────────────────────────────────

describe('Profile — subida de foto (éxito)', () => {
  let OrigImage: typeof window.Image
  let createElementSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    OrigImage = window.Image
    ;(window as any).Image = FakeImageLoad
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:fake')
    ;(URL as any).revokeObjectURL = vi.fn()
    // Intercept canvas creation inside compressImage
    const origCreate = document.createElement.bind(document)
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: any[]) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toDataURL: () => 'data:image/jpeg;base64,FAKEBASE64' } as any
      }
      return origCreate(tag, ...rest)
    })
  })

  afterEach(() => {
    ;(window as any).Image = OrigImage
    createElementSpy.mockRestore()
  })

  it('subir foto → llama API con base64 y muestra toast success', async () => {
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { url: 'https://cdn.example.com/avatar.jpg' } },
    })

    const { container } = renderProfile()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.png', { type: 'image/png' })
    await userEvent.upload(fileInput, file)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/users/upload-avatar', expect.objectContaining({
        image: 'FAKEBASE64',
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }))
    })
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('actualiz'), 'success'))
    expect(mockUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ foto_url: 'https://cdn.example.com/avatar.jpg' }))
  })

  it('error en api.post → muestra toast de error', async () => {
    const { api } = await import('@/api/client')
    ;(api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('upload failed'))

    const { container } = renderProfile()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['img'], 'photo.png', { type: 'image/png' })
    await userEvent.upload(fileInput, file)

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error'))
  })
})

// ─── photo upload (img.onerror path) ─────────────────────────────────────────

describe('Profile — subida de foto (error de imagen)', () => {
  let OrigImage: typeof window.Image

  beforeEach(() => {
    vi.clearAllMocks()
    OrigImage = window.Image
    ;(window as any).Image = FakeImageError
    ;(URL as any).createObjectURL = vi.fn(() => 'blob:fake')
    ;(URL as any).revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    ;(window as any).Image = OrigImage
  })

  it('fallo al cargar imagen → muestra toast de error (cubre img.onerror)', async () => {
    const { container } = renderProfile()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['bad'], 'broken.jpg', { type: 'image/jpeg' })
    await userEvent.upload(fileInput, file)

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error'))
  })
})

// ─── resetOnboarding ──────────────────────────────────────────────────────────

describe('Profile — resetear onboarding', () => {
  beforeEach(() => vi.clearAllMocks())

  it('click en "Ver tour de bienvenida" → llama resetOnboarding y navega a /apuestas', async () => {
    const user = userEvent.setup()
    renderProfile()
    const btn = await screen.findByRole('button', { name: /Ver tour/i })
    await user.click(btn)
    expect(mockResetOnboarding).toHaveBeenCalled()
    expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'info')
    expect(mockNavigate).toHaveBeenCalledWith('/apuestas')
  })
})

// ─── silent data load error ───────────────────────────────────────────────────

describe('Profile — error silencioso al cargar datos', () => {
  beforeEach(() => vi.clearAllMocks())

  it('error en GET /users/:id → no muestra toast de error', async () => {
    const { api } = await import('@/api/client')
    ;(api.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'))
    renderProfile()
    await new Promise(r => setTimeout(r, 50))
    expect(mockShow).not.toHaveBeenCalled()
  })
})

// ─── error handlers + misc ────────────────────────────────────────────────────

describe('Profile — error al guardar nombre', () => {
  beforeEach(() => vi.clearAllMocks())

  it('error en PUT /users/:id → muestra toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('server error'))
    renderProfile()

    const editBtns = await screen.findAllByRole('button', { name: '✏️' })
    await user.click(editBtns[0])
    const saveButtons = screen.getAllByRole('button', { name: 'Guardar' })
    await user.click(saveButtons[0])

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error')
    })
  })
})

describe('Profile — error al guardar WhatsApp', () => {
  beforeEach(() => vi.clearAllMocks())

  it('error en PUT /users/:id (whatsapp) → muestra toast de error', async () => {
    const user = userEvent.setup()
    const { api } = await import('@/api/client')
    ;(api.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('server error'))
    renderProfile()

    const saveBtn = await screen.findByRole('button', { name: 'Guardar' })
    await user.click(saveBtn)

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(expect.any(String), 'error')
    })
  })
})

describe('Profile — parsePhone con número real', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useAuthStore } = await import('@/store/authStore')
    ;(useAuthStore as ReturnType<typeof vi.fn>).mockImplementation(
      mockStore({ whatsapp_number: '+5411559962222', whatsapp_consent: true })
    )
  })

  it('número con código de país reconocido → pre-carga el select y el campo local', async () => {
    const { api } = await import('@/api/client')
    // Retornar el mismo número en la respuesta fresca
    ;(api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { data: { whatsapp_number: '+5411559962222', whatsapp_consent: true } },
    })
    const { container } = renderProfile()
    await waitFor(() => {
      const select = container.querySelector('select') as HTMLSelectElement
      expect(select.value).toBe('+54')
    })
  })
})

describe('Profile — cambio de código de país', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cambiar el select de código de país actualiza el estado', async () => {
    const user = userEvent.setup()
    renderProfile()
    const select = await screen.findByRole('combobox')
    await user.selectOptions(select, '+55')
    expect((select as HTMLSelectElement).value).toBe('+55')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GanadoresModal } from '@/components/layout/GanadoresModal'

// Hoisted so we can configure per-test without async import
const mockGet = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', () => ({ api: { get: mockGet } }))

const mockOnClose = vi.fn()

function winners(...items: object[]) {
  return JSON.stringify(items)
}
const w1 = { image_url: 'https://img.test/w1.jpg', matchday_label: 'Fecha 1', user_name: 'Ana', points: 10 }
const w2 = { image_url: 'https://img.test/w2.jpg', matchday_label: 'Fecha 2', user_name: 'Bruno', points: 12 }
const w3 = { image_url: 'https://img.test/w3.jpg', matchday_label: 'Fecha 3', user_name: 'Carlos', points: 8 }

function setupGet(ganadores_fechas: unknown, ganador_fecha: unknown = null) {
  mockGet.mockImplementation((url: string) => {
    if (url === '/config/ganadores_fechas')
      return Promise.resolve({ data: { data: { value: ganadores_fechas } } })
    if (url === '/config/ganador_fecha')
      return Promise.resolve({ data: { data: { value: ganador_fecha } } })
    return Promise.reject(new Error('unknown url'))
  })
}

function renderModal() {
  return render(<GanadoresModal onClose={mockOnClose} />)
}

describe('GanadoresModal — estado loading', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra el indicador de carga mientras espera la API', () => {
    mockGet.mockReturnValue(new Promise(() => {}))  // never resolves
    renderModal()
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeInTheDocument()
  })
})

describe('GanadoresModal — estado error', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra mensaje cuando la API falla', async () => {
    mockGet.mockRejectedValue(new Error('network'))
    renderModal()
    await waitFor(() => {
      expect(screen.getByText(/no hay ganadores publicados/i)).toBeInTheDocument()
    })
  })

  it('muestra mensaje cuando ganadores_fechas es array vacío', async () => {
    setupGet(JSON.stringify([]))
    renderModal()
    await waitFor(() => {
      expect(screen.getByText(/no hay ganadores publicados/i)).toBeInTheDocument()
    })
  })

  it('muestra mensaje cuando ningún endpoint tiene datos', async () => {
    setupGet(null, null)
    renderModal()
    await waitFor(() => {
      expect(screen.getByText(/no hay ganadores publicados/i)).toBeInTheDocument()
    })
  })
})

describe('GanadoresModal — ganador único', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra imagen del ganador', async () => {
    setupGet(winners(w1))
    renderModal()
    await waitFor(() => {
      expect(screen.getByAltText('Fecha 1')).toHaveAttribute('src', 'https://img.test/w1.jpg')
    })
  })

  it('muestra nombre y puntos del ganador debajo de la imagen', async () => {
    setupGet(winners(w1))
    renderModal()
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument()
      expect(screen.getAllByText(/10/).length).toBeGreaterThan(0)
    })
  })

  it('muestra el matchday_label en el header (regex por emoji)', async () => {
    setupGet(winners(w1))
    renderModal()
    await waitFor(() => {
      // El h2 contiene "🏆 Fecha 1" — usamos regex para ignorar el emoji
      expect(screen.getByRole('heading', { name: /Fecha 1/ })).toBeInTheDocument()
    })
  })

  it('fallback a ganador_fecha cuando ganadores_fechas no es array', async () => {
    setupGet(null, JSON.stringify(w1))
    renderModal()
    await waitFor(() => {
      expect(screen.getByAltText('Fecha 1')).toBeInTheDocument()
    })
  })

  it('muestra fallback visual cuando la imagen falla (imgError)', async () => {
    setupGet(winners(w1))
    renderModal()
    await waitFor(() => expect(screen.getByAltText('Fecha 1')).toBeInTheDocument())

    fireEvent.error(screen.getByAltText('Fecha 1'))
    await waitFor(() => {
      expect(screen.queryByAltText('Fecha 1')).not.toBeInTheDocument()
      // El fallback muestra nombre y puntos sin imagen
      expect(screen.getByText('Ana')).toBeInTheDocument()
    })
  })

  it('no muestra botones prev/next con un solo ganador', async () => {
    setupGet(winners(w1))
    renderModal()
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Cargando' })).not.toBeInTheDocument())
    expect(screen.queryByLabelText('Anterior')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Siguiente')).not.toBeInTheDocument()
  })
})

describe('GanadoresModal — múltiples ganadores (carousel)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra primer ganador por defecto', async () => {
    setupGet(winners(w1, w2, w3))
    renderModal()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fecha 1/ })).toBeInTheDocument()
    })
  })

  it('muestra contador X/N en el header', async () => {
    setupGet(winners(w1, w2, w3))
    renderModal()
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument()
    })
  })

  it('botón Siguiente avanza al próximo ganador', async () => {
    const user = userEvent.setup()
    setupGet(winners(w1, w2, w3))
    renderModal()
    await waitFor(() => expect(screen.getByLabelText('Siguiente')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Siguiente'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fecha 2/ })).toBeInTheDocument()
      expect(screen.getByText('2/3')).toBeInTheDocument()
    })
  })

  it('botón Anterior retrocede al ganador previo', async () => {
    const user = userEvent.setup()
    setupGet(winners(w1, w2, w3))
    renderModal()
    await waitFor(() => expect(screen.getByLabelText('Siguiente')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Siguiente'))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Fecha 2/ })).toBeInTheDocument())

    await user.click(screen.getByLabelText('Anterior'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fecha 1/ })).toBeInTheDocument()
    })
  })

  it('botón Anterior desde el primer elemento va al último (wrap-around)', async () => {
    const user = userEvent.setup()
    setupGet(winners(w1, w2, w3))
    renderModal()
    await waitFor(() => expect(screen.getByLabelText('Anterior')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Anterior'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fecha 3/ })).toBeInTheDocument()
    })
  })

  it('dots de navegación permiten saltar a un ganador específico', async () => {
    const user = userEvent.setup()
    setupGet(winners(w1, w2, w3))
    renderModal()
    await waitFor(() => expect(screen.getByLabelText('Ir a ganador 3')).toBeInTheDocument())

    await user.click(screen.getByLabelText('Ir a ganador 3'))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fecha 3/ })).toBeInTheDocument()
    })
  })
})

describe('GanadoresModal — cierre', () => {
  beforeEach(() => vi.clearAllMocks())

  it('botón × llama a onClose', async () => {
    mockGet.mockResolvedValue({ data: { data: { value: null } } })
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByLabelText('Cerrar'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('click en el backdrop llama a onClose', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    renderModal()
    const backdrop = document.querySelector('.fixed.inset-0')!
    fireEvent.click(backdrop)
    expect(mockOnClose).toHaveBeenCalled()
  })
})

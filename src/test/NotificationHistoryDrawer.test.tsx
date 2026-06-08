import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NotificationHistoryDrawer } from '@/components/NotificationHistoryDrawer'
import { api } from '@/api/client'

vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}))

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn> }

function makeNotif(overrides: Partial<{
  id: string
  type: string
  payload: Record<string, unknown>
  status: string
  sent_at: string | null
  created_at: string
}>) {
  return {
    id: 'n1',
    type: 'reminder',
    payload: {},
    status: 'sent',
    sent_at: '2026-05-15T18:30:00.000Z',
    created_at: '2026-05-15T18:30:00.000Z',
    ...overrides,
  }
}

describe('NotificationHistoryDrawer — fallback de claves del payload', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
  })
  afterEach(() => vi.clearAllMocks())

  it('lee payload.title y payload.body (inglés)', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: [makeNotif({
          payload: { title: 'Resultado publicado', body: '+3 pts' },
        })],
      },
    })
    render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Resultado publicado')).toBeInTheDocument())
    expect(screen.getByText('+3 pts')).toBeInTheDocument()
  })

  it('cae a payload.titulo y payload.mensaje (español del worker)', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: [makeNotif({
          payload: { titulo: '¡Comienza el partido!', mensaje: 'Boca vs River' },
        })],
      },
    })
    render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('¡Comienza el partido!')).toBeInTheDocument())
    expect(screen.getByText('Boca vs River')).toBeInTheDocument()
  })

  it('prefiere title sobre titulo si ambos vienen', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: [makeNotif({
          payload: { title: 'EN', titulo: 'ES', body: 'b', mensaje: 'm' },
        })],
      },
    })
    render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('EN')).toBeInTheDocument())
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.queryByText('ES')).not.toBeInTheDocument()
  })

  it('payload vacío muestra título por defecto', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: [makeNotif({ payload: {} })] },
    })
    render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Notificación')).toBeInTheDocument())
  })

  it('si body/mensaje están vacíos no renderiza el <p> del cuerpo', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: [makeNotif({ payload: { title: 'Solo título' } })],
      },
    })
    const { container } = render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Solo título')).toBeInTheDocument())
    // El <p> del body del NotificationItem usa la clase leading-relaxed; no debe existir.
    expect(container.querySelector('p.leading-relaxed')).toBeNull()
  })
})

describe('NotificationHistoryDrawer — fallback de fecha', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
  })

  it('usa created_at cuando sent_at es null (no muestra "31 dic 21:00")', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: [makeNotif({
          sent_at: null,
          created_at: '2026-05-15T18:30:00.000Z',
          payload: { title: 'X', body: 'y' },
        })],
      },
    })
    const { container } = render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
    // No debe aparecer la fecha de epoch 0 (31 dic) en ningún lado
    expect(container.textContent).not.toMatch(/31 dic/i)
    expect(container.textContent).not.toMatch(/dec 31/i)
  })

  it('si tanto sent_at como created_at son inválidos, no muestra fecha rota', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        data: [makeNotif({
          sent_at: null,
          created_at: 'fecha-rota',
          payload: { title: 'Z' },
        })],
      },
    })
    const { container } = render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Z')).toBeInTheDocument())
    expect(container.textContent).not.toMatch(/NaN|Invalid/i)
  })
})

describe('NotificationHistoryDrawer — payload del backend en distintos formatos', () => {
  beforeEach(() => mockApi.get.mockReset())

  it('acepta data como array directo', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: [makeNotif({ payload: { title: 'A' } })] },
    })
    render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument())
  })

  it('acepta data.notifications (estructura del endpoint actual)', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { notifications: [makeNotif({ payload: { title: 'B' } })] } },
    })
    render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('B')).toBeInTheDocument())
  })

  it('cuando no hay notificaciones muestra empty state', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    render(<NotificationHistoryDrawer isOpen={true} onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Sin notificaciones')).toBeInTheDocument())
  })
})

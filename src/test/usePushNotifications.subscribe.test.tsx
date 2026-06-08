import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ─── Setup global Notification mock ────────────────────────────
if (!(global as any).Notification) {
  ;(global as any).Notification = {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  }
}

const mockApiGet    = vi.hoisted(() => vi.fn())
const mockApiPost   = vi.hoisted(() => vi.fn())
const mockApiDelete = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  api: { get: mockApiGet, post: mockApiPost, delete: mockApiDelete },
}))

function buildPushEnv({
  permission = 'default' as NotificationPermission,
  subscription = null as any,
  registerError = null as Error | null,
} = {}) {
  const subscribeFn = vi.fn().mockResolvedValue({
    endpoint: 'https://push.test/endpoint',
    toJSON: () => ({ endpoint: 'https://push.test/endpoint', keys: { p256dh: 'k', auth: 'a' } }),
  })
  const unsubscribeFn = vi.fn().mockResolvedValue(true)

  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(subscription),
    subscribe: subscribeFn,
  }

  const register = registerError
    ? vi.fn().mockRejectedValue(registerError)
    : vi.fn().mockResolvedValue({ pushManager })

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register,
      ready: Promise.resolve({ pushManager }),
    },
  })

  ;(window as any).PushManager = class {}

  Object.defineProperty(Notification, 'permission', {
    configurable: true,
    get: () => permission,
  })

  ;(Notification as any).requestPermission = vi.fn().mockResolvedValue(permission === 'denied' ? 'denied' : 'granted')

  return { subscribeFn, unsubscribeFn, register, pushManager }
}

describe('usePushNotifications — subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockApiGet.mockResolvedValue({ data: { data: 'BPa-vapid-key-base64url' } })
    mockApiPost.mockResolvedValue({})
  })

  it('subscribe exitoso: registra SW, pide permiso, suscribe y postea al backend', async () => {
    const { register, subscribeFn } = buildPushEnv({ permission: 'granted' })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())

    await act(async () => { await result.current.subscribe() })

    expect(register).toHaveBeenCalledWith('/sw.js')
    expect(mockApiGet).toHaveBeenCalledWith('/push/vapid-public-key')
    expect(subscribeFn).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    )
    expect(mockApiPost).toHaveBeenCalledWith('/push/subscribe', expect.any(Object))
    expect(result.current.state).toBe('subscribed')
  })

  it('subscribe con permiso denegado: setea state=denied y no llama subscribe', async () => {
    const { subscribeFn } = buildPushEnv({ permission: 'denied' })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())

    await act(async () => { await result.current.subscribe() })

    expect(result.current.state).toBe('denied')
    expect(subscribeFn).not.toHaveBeenCalled()
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('subscribe maneja errores del SW silenciosamente', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    buildPushEnv({ registerError: new Error('SW register failed') })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())

    await act(async () => { await result.current.subscribe() })

    // No tira excepción, sólo loguea y resetea loading
    expect(consoleError).toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
    consoleError.mockRestore()
  })

  it('subscribe sin serviceWorker no hace nada', async () => {
    delete (navigator as any).serviceWorker
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())

    await act(async () => { await result.current.subscribe() })

    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('loading=true durante el subscribe, false al terminar', async () => {
    buildPushEnv({ permission: 'granted' })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())

    expect(result.current.loading).toBe(false)
    await act(async () => { await result.current.subscribe() })
    expect(result.current.loading).toBe(false)  // tras finalizar
  })
})

describe('usePushNotifications — unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockApiDelete.mockResolvedValue({})
  })

  it('unsubscribe llama a DELETE en backend y cancela la subscripción local', async () => {
    const sub = {
      endpoint: 'https://push.test/endpoint',
      unsubscribe: vi.fn().mockResolvedValue(true),
    }
    buildPushEnv({ subscription: sub as any })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())

    await act(async () => { await result.current.unsubscribe() })

    expect(mockApiDelete).toHaveBeenCalledWith(
      '/push/unsubscribe',
      { data: { endpoint: 'https://push.test/endpoint' } }
    )
    expect(sub.unsubscribe).toHaveBeenCalled()
    expect(result.current.state).toBe('unsubscribed')
  })

  it('unsubscribe sin subscripción activa solo setea state', async () => {
    buildPushEnv({ subscription: null })
    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())

    await act(async () => { await result.current.unsubscribe() })

    expect(mockApiDelete).not.toHaveBeenCalled()
    expect(result.current.state).toBe('unsubscribed')
  })

  it('unsubscribe maneja errores silenciosamente', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sub = {
      endpoint: 'https://push.test/endpoint',
      unsubscribe: vi.fn(),
    }
    buildPushEnv({ subscription: sub as any })
    mockApiDelete.mockRejectedValueOnce(new Error('network'))

    const { usePushNotifications } = await import('@/hooks/usePushNotifications')
    const { result } = renderHook(() => usePushNotifications())

    await act(async () => { await result.current.unsubscribe() })

    expect(consoleError).toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
    consoleError.mockRestore()
  })
})

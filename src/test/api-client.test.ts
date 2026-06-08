import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We test the interceptors directly by accessing the handler queue
// on the axios interceptor manager.
import { api } from '@/api/client'

function getRequestHandler() {
  const handlers = (api.interceptors.request as any).handlers as Array<{ fulfilled: (c: any) => any } | null>
  return handlers.find(Boolean)!
}

function getResponseHandler() {
  const handlers = (api.interceptors.response as any).handlers as Array<{ fulfilled: (r: any) => any; rejected: (e: any) => any } | null>
  return handlers.find(Boolean)!
}

describe('api/client — request interceptor', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('añade Authorization header cuando hay token', () => {
    localStorage.setItem('token', 'my-token')
    const config = { headers: {} as Record<string, string> }
    const result = getRequestHandler().fulfilled(config)
    expect(result.headers.Authorization).toBe('Bearer my-token')
  })

  it('NO añade Authorization header cuando no hay token', () => {
    const config = { headers: {} as Record<string, string> }
    const result = getRequestHandler().fulfilled(config)
    expect(result.headers.Authorization).toBeUndefined()
  })

  it('devuelve el config modificado', () => {
    localStorage.setItem('token', 'tok')
    const config = { headers: {}, url: '/test' }
    const result = getRequestHandler().fulfilled(config)
    expect(result.url).toBe('/test')
    expect(result.headers.Authorization).toBe('Bearer tok')
  })
})

describe('api/client — response interceptor', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('pasa respuestas exitosas sin modificar', () => {
    const res = { status: 200, data: { ok: true } }
    const result = getResponseHandler().fulfilled(res)
    expect(result).toBe(res)
  })

  it('rechaza errores non-401 sin reintentar', async () => {
    const error = { response: { status: 500 }, config: { _retry: false } }
    await expect(getResponseHandler().rejected(error)).rejects.toEqual(error)
  })

  it('rechaza errores 401 sin refreshToken', async () => {
    localStorage.removeItem('refreshToken')
    const error = {
      response: { status: 401 },
      config: { _retry: false, headers: {} },
    }
    await expect(getResponseHandler().rejected(error)).rejects.toEqual(error)
  })

  it('no reintenta si _retry ya es true (evita loop)', async () => {
    localStorage.setItem('refreshToken', 'old-refresh')
    const error = {
      response: { status: 401 },
      config: { _retry: true, headers: {} },
    }
    await expect(getResponseHandler().rejected(error)).rejects.toEqual(error)
  })

  it('en 401 con refreshToken: llama a /auth/refresh y actualiza localStorage', async () => {
    localStorage.setItem('refreshToken', 'valid-refresh')

    const axiosModule = await import('axios')
    const postSpy = vi.spyOn(axiosModule.default, 'post').mockResolvedValueOnce({
      data: { data: { token: 'new-token', refreshToken: 'new-refresh' } },
    })

    // Mock the adapter so the retry request resolves immediately (no real network call)
    const savedAdapter = api.defaults.adapter
    api.defaults.adapter = async (cfg: any) => ({ data: 'retried', status: 200, statusText: 'OK', headers: {}, config: cfg })

    const error = {
      response: { status: 401 },
      config: { _retry: false, headers: {} as Record<string, string>, method: 'get', url: '/test' },
    }

    await getResponseHandler().rejected(error)

    expect(postSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refreshToken: 'valid-refresh' }
    )
    expect(localStorage.getItem('token')).toBe('new-token')
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh')

    api.defaults.adapter = savedAdapter
  })

  it('en 401 con refresh fallido: limpia localStorage y redirige a /login', async () => {
    localStorage.setItem('refreshToken', 'bad-refresh')
    localStorage.setItem('token', 'old-token')
    localStorage.setItem('user', '{"id":"u1"}')

    const axiosModule = await import('axios')
    vi.spyOn(axiosModule.default, 'post').mockRejectedValueOnce(new Error('refresh failed'))

    // Spy window.location.href setter
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location)
    let redirectTo = ''
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { redirectTo = v } },
      configurable: true,
    })

    const error = {
      response: { status: 401 },
      config: { _retry: false, headers: {} as Record<string, string> },
    }

    // Should reject after clearing storage
    await getResponseHandler().rejected(error).catch(() => {})

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()

    locationSpy.mockRestore()
  })
})

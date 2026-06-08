import { useState, useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'

interface UseApiCallOptions {
  showError?: boolean
  errorMessage?: string
}

/**
 * Hook para ejecutar llamadas API con manejo automático de errores.
 * Muestra un toast si la llamada falla (a menos que showError sea false).
 *
 * @example
 * const { data, loading, call } = useApiCall<Match[]>()
 * const matches = await call(() => api.get('/matches'))
 */
export function useApiCall<T = any>(options: UseApiCallOptions = {}) {
  const { showError = true, errorMessage } = options
  const { show } = useToastStore()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const call = useCallback(
    async (fn: () => Promise<any>): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const res = await fn()
        const result = res.data?.data ?? res.data
        setData(result)
        return result
      } catch (err: any) {
        const errMsg =
          errorMessage ||
          err?.response?.data?.error ||
          err?.message ||
          'Error en la conexión'
        setError(err)
        if (showError) {
          show(errMsg, 'error')
        }
        return null
      } finally {
        setLoading(false)
      }
    },
    [showError, errorMessage, show]
  )

  return { data, loading, error, call }
}

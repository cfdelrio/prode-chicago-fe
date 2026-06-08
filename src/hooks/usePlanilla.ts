import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import { useApiCall } from './useApiCall'
import type { Planilla } from '@/types'

export function usePlanilla(planillaId: string | undefined) {
  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const { loading, call } = useApiCall({ errorMessage: 'No se pudo cargar la planilla' })

  const load = useCallback(async () => {
    if (!planillaId) return
    const data = await call(() => api.get(`/planillas/${planillaId}`))
    if (data) setPlanilla(data)
  }, [planillaId, call])

  useEffect(() => { load() }, [load])

  return { planilla, loading, refetch: load }
}

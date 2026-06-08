import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import { useApiCall } from './useApiCall'
import type { Bet } from '@/types'

export function useBets(planillaId: string | undefined) {
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const { loading, call } = useApiCall({ errorMessage: 'No se pudieron cargar los pronósticos' })

  const load = useCallback(async () => {
    if (!planillaId) return
    const data = await call(() => api.get(`/bets/planillas/${planillaId}/bets?t=${Date.now()}`))
    if (data) {
      const map: Record<string, Bet> = {}
      for (const b of data) map[b.match_id] = b
      setBets(map)
    }
  }, [planillaId, call])

  useEffect(() => { load() }, [load])

  return { bets, setBets, loading, refetch: load }
}

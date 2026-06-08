import { useState, useEffect, useCallback } from 'react'
import { api } from '@/api/client'
import { useApiCall } from './useApiCall'
import type { Match } from '@/types'

export function useMatches(limit = 200) {
  const [matches, setMatches] = useState<Match[]>([])
  const { loading, call } = useApiCall({ errorMessage: 'No se pudieron cargar los partidos' })

  const load = useCallback(async () => {
    const res = await call(() => api.get(`/matches?limit=${limit}`))
    if (res?.matches) setMatches(res.matches)
  }, [limit, call])

  useEffect(() => { load() }, [load])

  return { matches, setMatches, loading, refetch: load }
}

import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import type { GamificationSummary } from '@/types'

const EMPTY: GamificationSummary = { streaks: [], badges: [], rivalries_count: 0 }

function normalize(raw: unknown): GamificationSummary {
  if (!raw || typeof raw !== 'object') return EMPTY
  const r = raw as Partial<GamificationSummary>
  return {
    streaks: Array.isArray(r.streaks) ? r.streaks : [],
    badges: Array.isArray(r.badges) ? r.badges : [],
    rivalries_count: typeof r.rivalries_count === 'number' ? r.rivalries_count : 0,
  }
}

export function useGamification(userId: string | null | undefined) {
  const [data, setData] = useState<GamificationSummary>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    api.get(`/users/${userId}/gamification`)
      .then(res => {
        if (cancelled) return
        setData(normalize(res?.data?.data))
        setError(null)
      })
      .catch(err => {
        if (cancelled) return
        setData(EMPTY)
        setError(err?.response?.data?.error ?? 'Error cargando logros')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  return { data, loading, error }
}

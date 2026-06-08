import { useEffect, useRef, useState } from 'react'
import type { RankingEntry } from '@/types'

const KEY = 'prode_ranking_snapshot_v1'

interface Snapshot {
  planilla_id: string
  position: number
}

export interface DeltaInfo {
  delta: number   // positive = moved up (improved), negative = moved down, 0 = same
  isNew: boolean  // appeared in ranking for the first time (vs previous snapshot)
}

/**
 * Tracks position changes between visits.
 * Reads previous snapshot from localStorage on mount, computes deltas when
 * current ranking arrives, then writes new snapshot for next visit.
 */
export function useRankingDeltas(current: RankingEntry[]): Map<string, DeltaInfo> {
  // Read previous snapshot synchronously — localStorage is sync and this needs to
  // happen before the effect so we capture the state from the previous visit.
  const prevRef = useRef<Map<string, number> | null>(null)
  if (prevRef.current === null) {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const arr: Snapshot[] = JSON.parse(raw)
        prevRef.current = new Map(arr.map(e => [e.planilla_id, e.position]))
      } else {
        prevRef.current = new Map()
      }
    } catch {
      prevRef.current = new Map()
    }
  }

  const [deltas, setDeltas] = useState<Map<string, DeltaInfo>>(new Map())
  const computedRef = useRef(false)

  useEffect(() => {
    if (!current.length || computedRef.current) return
    computedRef.current = true

    const prev = prevRef.current!
    const hasPrev = prev.size > 0
    const computed = new Map<string, DeltaInfo>()

    for (const entry of current) {
      const prevPos = prev.get(entry.planilla_id)
      computed.set(entry.planilla_id, {
        delta: prevPos !== undefined ? prevPos - entry.position : 0,
        isNew: hasPrev && prevPos === undefined,
      })
    }

    setDeltas(computed)

    try {
      localStorage.setItem(KEY, JSON.stringify(
        current.map(r => ({ planilla_id: r.planilla_id, position: r.position }))
      ))
    } catch { /* localStorage not available */ }
  }, [current])

  return deltas
}

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/api/client'
import { useT } from '@/hooks/useT'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkMatchCard } from '@/components/ui/Skeleton'
import type { Match, Bet, Tournament } from '@/types'
import { BracketDesktop } from '@/components/bracket/BracketDesktop'
import { BracketMobile } from '@/components/bracket/BracketMobile'

interface Props {
  planillaId: string
  planillaLocked: boolean
  tournament: Tournament
  now: number
}

export function EliminatoriaBracket({ planillaId, planillaLocked, tournament, now }: Props) {
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  const loadBets = useCallback(async (pid: string) => {
    if (!pid) return
    const { data } = await api.get(`/bets/planillas/${pid}/bets?t=${Date.now()}`)
    const bMap: Record<string, Bet> = {}
    for (const b of (data.data || [])) bMap[b.match_id] = b
    setBets(bMap)
  }, [])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    setLoading(true)
    setBets({})
    api.get(`/matches?limit=200&tournament_id=${tournament.id}`)
      .then(({ data }) => setMatches(data.data.matches || []))
      .finally(() => setLoading(false))
  }, [tournament.id])

  useEffect(() => {
    loadBets(planillaId).catch(() => {})
  }, [planillaId, loadBets])

  const handleBetSaved = (bet: Bet) => setBets(prev => ({ ...prev, [bet.match_id]: bet }))
  const handleBetDeleted = (matchId: string) => {
    setBets(prev => { const n = { ...prev }; delete n[matchId]; return n })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2, 3].map(i => <SkMatchCard key={i} />)}
      </div>
    )
  }

  if (matches.length === 0) {
    return <EmptyState icon="⚡" message={t.eliminatoria.noMatches} />
  }

  if (!planillaId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium text-center">
        {t.eliminatoria.selectPlanilla}
      </div>
    )
  }

  return isMobile ? (
    <BracketMobile
      matches={matches}
      bets={bets}
      planillaId={planillaId}
      planillaLocked={planillaLocked}
      now={now}
      onBetSaved={handleBetSaved}
      onBetDeleted={handleBetDeleted}
    />
  ) : (
    <BracketDesktop
      matches={matches}
      bets={bets}
      planillaId={planillaId}
      planillaLocked={planillaLocked}
      now={now}
      onBetSaved={handleBetSaved}
      onBetDeleted={handleBetDeleted}
    />
  )
}


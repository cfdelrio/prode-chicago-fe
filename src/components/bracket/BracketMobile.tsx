import { useMemo, Fragment } from 'react'
import { useT } from '@/hooks/useT'
import { MatchCard } from '@/components/match/MatchCard'
import type { Match, Bet } from '@/types'

interface Props {
  matches: Match[]
  bets: Record<string, Bet>
  planillaId: string
  planillaLocked: boolean
  now: number
  onBetSaved: (bet: Bet) => void
  onBetDeleted: (matchId: string) => void
}

export function BracketMobile({ matches, bets, planillaId, planillaLocked, now, onBetSaved, onBetDeleted }: Props) {
  const t = useT()

  const rounds = useMemo(() => {
    const byJornada = new Map<number, Match[]>()
    for (const m of matches) {
      const j = m.jornada ?? 0
      if (!byJornada.has(j)) byJornada.set(j, [])
      byJornada.get(j)!.push(m)
    }

    const result: [number, Match[]][] = []
    for (const [j, ms] of [...byJornada.entries()].sort(([a], [b]) => a - b)) {
      result.push([j, ms.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())])
    }
    return result
  }, [matches])

  return (
    <div className="space-y-8">
      {rounds.map(([jornada, roundMatches]) => {
        const openCount = roundMatches.filter((m) => new Date(m.time_cutoff).getTime() > now).length

        return (
          <div key={jornada}>
            {/* Round header con línea decorativa */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#001A4B]/20 to-[#001A4B]/40" />
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-widest t-text-page">
                  {t.eliminatoria.round(jornada)}
                </p>
                <p className="text-[10px] t-text-muted mt-0.5">
                  {t.eliminatoria.matchCount(roundMatches.length, openCount)}
                </p>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#001A4B]/20 to-[#001A4B]/40" />
            </div>

            {/* Match cards con indicadores */}
            <div className="space-y-3">
              {roundMatches.map((m, idx) => {
                const bet = bets[m.id]
                const { resultado_local: rl, resultado_visitante: rv, penales_local: pl, penales_visitante: pv } = m
                const hasResult = rl != null && rv != null
                // El 90' decide; si hubo empate, los penales definen quién avanza
                const winner = rl != null && rv != null
                  ? rl !== rv
                    ? (rl > rv ? m.home_team : m.away_team)
                    : (pl != null && pv != null && pl !== pv
                        ? (pl > pv ? m.home_team : m.away_team)
                        : null)
                  : null
                const penText = hasResult && rl === rv && pl != null && pv != null
                  ? `pen ${pl}-${pv}` : null

                return (
                  <Fragment key={m.id}>
                    <div className="relative">
                      <MatchCard
                        match={m}
                        bet={bet}
                        planillaId={planillaId}
                        onBetSaved={onBetSaved}
                        onBetDeleted={onBetDeleted}
                        planillaLocked={planillaLocked}
                        now={now}
                      />

                      {/* Indicadores de resultado/predicción */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        {hasResult && (
                          <span className="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                            ✓ FIN
                          </span>
                        )}
                        {bet && !hasResult && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            🎯
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progresión visual — mostrar qué equipo avanza */}
                    {hasResult && winner && idx < roundMatches.length - 1 && (
                      <div className="flex items-center justify-center py-2">
                        <div className="text-center">
                          <p className="text-[10px] t-text-muted font-medium">
                            {winner}{penText ? ` (${penText})` : ''}
                          </p>
                          <p className="text-[8px] text-gray-300">↓ avanza</p>
                        </div>
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

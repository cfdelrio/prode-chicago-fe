import { useMemo, useState } from 'react'
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

interface BracketNode {
  match: Match
  bet?: Bet
  level: number
  index: number
}

export function BracketDesktop({ matches, bets, planillaId, planillaLocked, now, onBetSaved, onBetDeleted }: Props) {
  const t = useT()
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)

  const bracket = useMemo(() => {
    const byJornada = new Map<number, Match[]>()
    for (const m of matches) {
      const j = m.jornada ?? 0
      if (!byJornada.has(j)) byJornada.set(j, [])
      byJornada.get(j)!.push(m)
    }

    const stages: [number, BracketNode[]][] = []
    for (const [j, ms] of [...byJornada.entries()].sort(([a], [b]) => a - b)) {
      const sorted = ms.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      const nodes = sorted.map((m, i) => ({
        match: m,
        bet: bets[m.id],
        level: j,
        index: i,
      }))
      stages.push([j, nodes])
    }
    return stages
  }, [matches, bets])

  if (bracket.length === 0) return null

  const nodeHeight = 100
  const nodeGap = 16
  const columnGap = 120
  const svgHeight = 2000
  const svgWidth = 600

  return (
    <div className="space-y-6">
      {/* SVG connecting lines */}
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="absolute inset-0 pointer-events-none hidden lg:block"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="connectorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0042A5" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0042A5" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {bracket.map((_, stageIdx) => {
          if (stageIdx >= bracket.length - 1) return null
          const currentStage = bracket[stageIdx]
          const paths = []

          for (let i = 0; i < currentStage[1].length; i += 2) {
            const x1 = 80 + stageIdx * columnGap
            const y1 = 60 + (i / 2) * (nodeHeight * 2 + nodeGap * 2)
            const x2 = x1 + columnGap
            const y2 = 60 + (Math.floor(i / 2)) * (nodeHeight + nodeGap)

            // Bézier curve
            const cpx1 = x1 + columnGap / 3
            const cpx2 = x2 - columnGap / 3
            paths.push(
              <path
                key={`path-${stageIdx}-${i}`}
                d={`M ${x1} ${y1 + nodeHeight / 2} C ${cpx1} ${y1 + nodeHeight / 2} ${cpx2} ${y2 + nodeHeight / 2} ${x2} ${y2 + nodeHeight / 2}`}
                fill="none"
                stroke="url(#connectorGradient)"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            )
          }
          return paths
        })}
      </svg>

      {/* Bracket grid */}
      <div className="relative overflow-x-auto">
        <div className="flex gap-12 p-4 min-w-min">
          {bracket.map(([jornada, nodes]) => (
            <div key={jornada} className="flex-shrink-0 w-56">
              {/* Stage header */}
              <div className="mb-4">
                <h3 className="text-xs font-black t-text-page uppercase tracking-widest">
                  {t.eliminatoria.round(jornada)}
                </h3>
                <p className="text-[10px] t-text-muted mt-1">
                  {nodes.length} {nodes.length === 1 ? 'partido' : 'partidos'}
                </p>
              </div>

              {/* Match nodes */}
              <div className="space-y-4">
                {nodes.map((node) => {
                  const { resultado_local: rl, resultado_visitante: rv, penales_local: pl, penales_visitante: pv } = node.match
                  const hasResult = rl != null && rv != null
                  const hasPrediction = !!node.bet
                  // Quién avanza: el 90' decide; en empate, los penales rompen el empate
                  const advanceSide = rl != null && rv != null
                    ? rl !== rv
                      ? (rl > rv ? 'home' : 'away')
                      : (pl != null && pv != null && pl !== pv ? (pl > pv ? 'home' : 'away') : null)
                    : null
                  const penText = hasResult && rl === rv && pl != null && pv != null
                    ? `pen ${pl}-${pv}` : null

                  return (
                    <div
                      key={node.match.id}
                      className="group cursor-pointer"
                      onClick={() => setSelectedMatch(node.match.id)}
                    >
                      {/* Match mini card */}
                      <div className="bg-white border border-gray-200 rounded-lg p-2.5 hover:shadow-md transition-all hover:border-[#0042A5]">
                        {/* Teams */}
                        <div className="space-y-1.5">
                          {/* Home team */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] truncate flex-1 ${advanceSide === 'home' ? 'font-black t-text-accent' : 'font-semibold text-gray-700'}`}>
                              {node.match.home_team}
                            </span>
                            <div className="flex items-center gap-1">
                              {hasResult && (
                                <span className="text-xs font-black t-text-page">
                                  {node.match.resultado_local}
                                </span>
                              )}
                              {hasPrediction && (
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                  {node.bet!.goles_local}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Away team */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[11px] truncate flex-1 ${advanceSide === 'away' ? 'font-black t-text-accent' : 'font-semibold text-gray-700'}`}>
                              {node.match.away_team}
                            </span>
                            <div className="flex items-center gap-1">
                              {hasResult && (
                                <span className="text-xs font-black t-text-page">
                                  {node.match.resultado_visitante}
                                </span>
                              )}
                              {hasPrediction && (
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                  {node.bet!.goles_visitante}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {penText && (
                          <p className="mt-1 text-[9px] font-semibold text-amber-600 text-right">{penText}</p>
                        )}

                        {/* Status badge */}
                        <div className="mt-2 flex items-center gap-1 text-[9px]">
                          {hasResult && (
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                              ✓ FIN
                            </span>
                          )}
                          {hasPrediction && !hasResult && (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                              🎯 Pronóstico
                            </span>
                          )}
                          {!hasPrediction && !hasResult && (
                            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">
                              Sin pronóstico
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para editar/ver detalles */}
      {selectedMatch && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setSelectedMatch(null)}
          />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl p-6 max-w-lg mx-auto max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--theme-page-bg)' }}
          >
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 t-text-page hover:opacity-70 text-2xl leading-none z-10"
            >
              ×
            </button>

            {matches
              .filter((m) => m.id === selectedMatch)
              .map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  bet={bets[match.id]}
                  planillaId={planillaId}
                  onBetSaved={onBetSaved}
                  onBetDeleted={onBetDeleted}
                  planillaLocked={planillaLocked}
                  now={now}
                />
              ))}
          </div>
        </>
      )}
    </div>
  )
}

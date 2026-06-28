import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '@/api/client'
import { useT } from '@/hooks/useT'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sk, SkMatrizRow } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { calcularPuntaje, POINT_COLORS } from '@/utils/scoring'
import { teamFlag } from '@/utils/teamFlags'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import type { Match, RankingEntry, Tournament } from '@/types'

type BetMap = Record<string, Record<string, { home: number; away: number }>>

interface ActiveCell {
  matchId: string
  rowKey: string
  bet: { home: number; away: number }
  match: Match
  result: { puntos: number; bonus: boolean; color: string }
  rect: DOMRect
}

/* ── Popover de detalle ──────────────────────────────────────────── */
function BetPopover({ cell, onClose }: { cell: ActiveCell; onClose: () => void }) {
  const t = useT()
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const popW = Math.min(220, window.innerWidth - 24)
  const popH = 200
  const rawTop  = cell.rect.bottom + 8
  const rawLeft = cell.rect.left + cell.rect.width / 2 - popW / 2
  const top  = rawTop + popH > window.innerHeight - 16
    ? Math.max(8, cell.rect.top - 8 - popH)
    : rawTop
  const left = Math.max(8, Math.min(rawLeft, window.innerWidth - popW - 8))

  const { match, bet, result } = cell
  const isExactoLocal = bet.home === match.resultado_local
  const isExactoVisitante = bet.away === match.resultado_visitante
  const color = result.color as string

  return createPortal(
    <div
      ref={popRef}
      style={{ position: 'fixed', top, left, zIndex: 9999, width: popW }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-pop"
    >
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          <span className="truncate">{match.home_team}</span>
          <span className="text-gray-300">vs</span>
          <span className="truncate text-right">{match.away_team}</span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1">
          <span className="text-2xl font-black text-gray-800">{match.resultado_local}</span>
          <span className="text-xs text-gray-300 font-bold">—</span>
          <span className="text-2xl font-black text-gray-800">{match.resultado_visitante}</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{t.match.yourBet}</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-black ${isExactoLocal ? 'text-green-600' : 'text-gray-700'}`}>
              {bet.home}
            </span>
            <span className="text-gray-300 text-xs">-</span>
            <span className={`text-sm font-black ${isExactoVisitante ? 'text-green-600' : 'text-gray-700'}`}>
              {bet.away}
            </span>
          </div>
        </div>

        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
          color === 'celeste' ? 'bg-sky-50' :
          color === 'rojo'    ? 'bg-red-50' :
          color === 'verde'   ? 'bg-green-50' :
          color === 'amarillo'? 'bg-yellow-50' :
                                'bg-gray-50'
        }`}>
          <span className="text-xs font-semibold text-gray-600">
            {t.match.popIcons[color as keyof typeof t.match.popIcons]} {t.match.popLabels[color as keyof typeof t.match.popLabels]}
          </span>
          <span className={`text-lg font-black ${
            color === 'celeste' ? 'text-sky-500' :
            color === 'rojo'    ? 'text-red-500' :
            color === 'verde'   ? 'text-green-600' :
            color === 'amarillo'? 'text-yellow-500' :
                                  'text-gray-400'
          }`}>
            {result.puntos > 0 ? `+${result.puntos}` : '0'}
          </span>
        </div>

        {result.bonus && (
          <p className="text-[11px] text-sky-500 font-medium text-center">
            {t.match.bonusNote}
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}

function MatrizSkeleton() {
  return (
    <div className="px-2 py-4 space-y-3">
      <div className="max-w-7xl mx-auto px-2 space-y-1.5">
        <Sk className="h-6 w-32" />
        <Sk className="h-3 w-48" />
      </div>
      <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap">
        {[0, 1, 2, 3, 4].map(i => <Sk key={i} className="h-5 w-12 rounded" />)}
      </div>
      <div className="bg-white rounded-lg overflow-hidden border border-gray-100">
        <div className="bg-[#001A4B]/90 h-12" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <SkMatrizRow key={i} />)}
      </div>
    </div>
  )
}

export function Matriz() {
  const { user } = useAuthStore()
  const { show } = useToastStore()
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [bets, setBets] = useState<BetMap>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('')
  const selectedTournamentIdRef = useRef<string>('')
  const elimTourIdRef = useRef('')
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null)
  const [filterColors, setFilterColors] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('matriz.filterColors')
      if (!raw) return new Set()
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return new Set()
      const valid = new Set(['celeste', 'rojo', 'verde', 'amarillo', 'gris'])
      return new Set(parsed.filter((c: unknown) => typeof c === 'string' && valid.has(c)))
    } catch {
      return new Set()
    }
  })
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)
  const [showVedaModal, setShowVedaModal] = useState(false)
  const [avatarFullscreen, setAvatarFullscreen] = useState<{ avatar: string; name: string } | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [shared, setShared] = useState(false)
  const [showFavorites, setShowFavorites] = useState(() => {
    try { return localStorage.getItem('matriz.showFavorites') === 'true' } catch { return false }
  })
  const searchInputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const headerInnerRef = useRef<HTMLDivElement>(null)
  const bodyJugadorRef = useRef<HTMLTableCellElement>(null)
  const headerJugadorRef = useRef<HTMLTableCellElement>(null)

  const onBodyScroll = () => {
    if (headerInnerRef.current && tableRef.current) {
      headerInnerRef.current.scrollLeft = tableRef.current.scrollLeft
    }
  }

  // Sincroniza el ancho de la columna "Jugador" entre el header y el body.
  // Son dos <table> separadas, entonces el browser las dimensiona independientemente.
  useLayoutEffect(() => {
    const sync = () => {
      if (!bodyJugadorRef.current || !headerJugadorRef.current) return
      const w = bodyJugadorRef.current.offsetWidth
      if (w > 0) {
        headerJugadorRef.current.style.minWidth = `${w}px`
        headerJugadorRef.current.style.width = `${w}px`
        document.documentElement.style.setProperty('--jugador-width', `${w}px`)
      }
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [loading, ranking.length])

  const loadBetsForTournament = useCallback(async (tid: string, elimId: string, tourCount: number = tournaments.length) => {
    let url = '/bets/all-for-matrix'
    // Siempre filtrar si hay eliminatoria detectada, O si el tid es distinto al primero
    if (elimId) {
      url += tid === elimId ? `?tournament_id=${elimId}` : `?not_tournament_id=${elimId}`
    } else if (tid && tourCount > 1) {
      // Sin eliminatoria detectada pero hay múltiples torneos → filtrar por este torneo
      url += `?tournament_id=${tid}`
    }
    const bRes = await api.get(url)
    setBets(bRes.data.data)
  }, [])

  const loadRankingForTournament = useCallback(async (tid: string, elimId: string) => {
    let url = '/ranking?limit=200&include_unpaid=true'
    if (elimId) {
      url += tid === elimId ? `&tournament_id=${elimId}` : `&not_tournament_id=${elimId}`
    }
    const rRes = await api.get(url)
    setRanking(rRes.data.data.ranking || [])
  }, [])

  const loadMatrizData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [mRes, favRes, tourRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/ranking/favorites').catch(() => ({ data: { data: [] } })),
        api.get('/tournaments').catch(() => ({ data: { data: [] } })),
      ])
      setMatches(mRes.data.data.matches)
      setFavorites(new Set(favRes.data.data || []))
      const tourList: Tournament[] = tourRes.data.data || []
      setTournaments(tourList)
      const elim = tourList.find(t => t.is_active && !/grupo/i.test(t.fase ?? ''))
      const elimId = elim?.id ?? ''
      elimTourIdRef.current = elimId
      const tid = selectedTournamentIdRef.current || (tourList.length > 0 ? tourList[0].id : '')
      if (!selectedTournamentIdRef.current && tid) {
        setSelectedTournamentId(tid)
        selectedTournamentIdRef.current = tid
      }
      await Promise.all([
        loadBetsForTournament(tid, elimId, tourList.length),
        loadRankingForTournament(tid, elimId)
      ])
    } finally {
      setRefreshing(false)
    }
  }, [loadBetsForTournament, loadRankingForTournament])

  useEffect(() => {
    loadMatrizData().catch(() => show(t.matrix.errorLoad, 'error')).finally(() => setLoading(false))
    const interval = setInterval(loadMatrizData, 30000)
    return () => clearInterval(interval)
  }, [loadMatrizData])

  useEffect(() => {
    try {
      if (filterColors.size === 0) localStorage.removeItem('matriz.filterColors')
      else localStorage.setItem('matriz.filterColors', JSON.stringify(Array.from(filterColors)))
    } catch {
      // Storage no disponible (Safari privado, cuota, etc.) — no es crítico
    }
  }, [filterColors])

  useEffect(() => {
    try {
      if (showFavorites) localStorage.setItem('matriz.showFavorites', 'true')
      else localStorage.removeItem('matriz.showFavorites')
    } catch {}
  }, [showFavorites])

  const handleToggleFavorite = useCallback(async (planillaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (togglingFav) return
    setTogglingFav(planillaId)
    try {
      const { data } = await api.post(`/ranking/favorites/${planillaId}`, {})
      setFavorites(prev => {
        const next = new Set(prev)
        if (data.action === 'added') next.add(planillaId)
        else next.delete(planillaId)
        return next
      })
    } catch {
      show(t.ranking.errorFavorite, 'error')
    } finally { setTogglingFav(null) }
  }, [togglingFav, show, t])

  const handleBadgeClick = useCallback((
    e: React.MouseEvent<HTMLSpanElement>,
    matchId: string,
    rowKey: string,
    bet: { home: number; away: number },
    match: Match,
    result: { puntos: number; bonus: boolean; color: string }
  ) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (activeCell?.matchId === matchId && activeCell?.rowKey === rowKey) {
      setActiveCell(null)
      return
    }
    setActiveCell({ matchId, rowKey, bet, match, result, rect })
  }, [activeCell])


  const tournamentMatches = selectedTournamentId
    ? matches.filter(m => m.tournament_id === selectedTournamentId)
    : matches
  const finishedMatches = tournamentMatches.filter(m => m.estado === 'finished')
  const pendingMatches  = tournamentMatches.filter(m => m.estado !== 'finished')
  const hasLiveMatch    = tournamentMatches.some(m => m.estado === 'live')
  const allMatches = [...finishedMatches, ...pendingMatches]

  if (loading) return <MatrizSkeleton />

  const baseRows: RankingEntry[] = ranking

  const tournamentPts = new Map<string, number>()
  // Conteo de aciertos por nivel [4pts, 3pts, 2pts, 1pt] para el desempate.
  const tournamentBreakers = new Map<string, [number, number, number, number]>()
  baseRows.forEach(r => {
    const playerBets = bets[r.planilla_id] || {}
    let pts = 0, c4 = 0, c3 = 0, c2 = 0, c1 = 0
    for (const m of finishedMatches) {
      const b = playerBets[m.id]
      if (!b || m.resultado_local === undefined || m.resultado_visitante === undefined) continue
      const p = calcularPuntaje(
        { goles_local: b.home, goles_visitante: b.away },
        { resultado_local: m.resultado_local!, resultado_visitante: m.resultado_visitante! }
      ).puntos
      pts += p
      if (p === 4) c4++
      else if (p === 3) c3++
      else if (p === 2) c2++
      else if (p === 1) c1++
    }
    tournamentPts.set(r.planilla_id, pts)
    tournamentBreakers.set(r.planilla_id, [c4, c3, c2, c1])
  })

  // Orden con desempate en cascada: pts → 4pts → 3pts → 2pts → 1pt (igual que el Ranking).
  const rows = [...baseRows].sort((a, b) => {
    const ptsDiff = (tournamentPts.get(b.planilla_id) ?? 0) - (tournamentPts.get(a.planilla_id) ?? 0)
    if (ptsDiff !== 0) return ptsDiff
    const [a4, a3, a2, a1] = tournamentBreakers.get(a.planilla_id) ?? [0, 0, 0, 0]
    const [b4, b3, b2, b1] = tournamentBreakers.get(b.planilla_id) ?? [0, 0, 0, 0]
    return (b4 - a4) || (b3 - a3) || (b2 - a2) || (b1 - a1)
  })

  const searchSuggestions = searchQuery.trim()
    ? rows.filter(r =>
        r.user_name.toLowerCase().includes(searchQuery.toLowerCase().trim()) &&
        !selectedPlayers.has(r.planilla_id)
      ).slice(0, 8)
    : []

  // Filtro visible: jugadores buscados tienen prioridad; si no, "Mi grupo" (favoritos + yo); si no, todos.
  const filteredRows = selectedPlayers.size > 0
    ? rows.filter(r => selectedPlayers.has(r.planilla_id))
    : showFavorites
      ? rows.filter(r => favorites.has(r.planilla_id) || r.user_id === user?.id)
      : rows

  const handleSearchToggle = () => {
    if (searchOpen && selectedPlayers.size === 0) {
      setSearchOpen(false); setSearchQuery('')
    } else {
      setSearchOpen(true)
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }

  const handleSelectPlayer = (planillaId: string) => {
    setSelectedPlayers(prev => new Set([...prev, planillaId]))
    setSearchQuery('')
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }

  const handleRemovePlayer = (planillaId: string) => {
    setSelectedPlayers(prev => { const n = new Set(prev); n.delete(planillaId); return n })
  }

  const handleClearSearch = () => {
    setSelectedPlayers(new Set()); setSearchQuery(''); setSearchOpen(false)
  }

  const handleDownload = () => window.print()

  const buildShareText = () => {
    const top10 = rows.slice(0, 10)
    const lines = top10
      .map((r, i) => `${i + 1}. ${r.user_name} — ${tournamentPts.get(r.planilla_id) ?? 0} pts`)
      .join('\n')
    return `🏆 Planilla General — PRODE High Rolling\n\n${lines}\n\n¿Quién gana? ${window.location.origin}`
  }

  const handleShare = async () => {
    const text = buildShareText()
    if (navigator.share) {
      await navigator.share({ title: 'Planilla General — PRODE High Rolling', text, url: window.location.href }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText())}`, '_blank')
  }

  const getBetsForRow = (r: RankingEntry) => bets[r.planilla_id] || {}

  return (
    <div className="px-2 py-4 space-y-3" onClick={() => setActiveCell(null)}>
      <style>{`
        @keyframes pop {
          0%   { opacity: 0; transform: scale(0.92) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-pop { animation: pop 0.15s ease-out both; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        th.sticky-pts, td.sticky-pts {
          position: sticky;
          left: var(--jugador-width, 140px);
          z-index: 5;
        }

        @media print {
          .no-print { display: none !important; }
          .sticky { position: static !important; }
          .overflow-x-auto { overflow: visible !important; }
          table { font-size: 9px !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-2 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold t-text-page">{t.matrix.title}</h1>
            {hasLiveMatch && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-red-600"
                aria-live="polite"
                title={refreshing ? 'Actualizando datos' : 'Hay partidos en vivo'}
              >
                <span className={`w-1.5 h-1.5 rounded-full bg-red-500 ${refreshing ? 'animate-ping' : 'animate-pulse'}`} />
                LIVE
              </span>
            )}
          </div>
          <p className="text-xs t-text-muted mt-1">
            {t.matrix.players(filteredRows.length)} · {t.matrix.matches(allMatches.length)}
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-1.5 shrink-0 no-print">
          <button
            onClick={() => setShowFavorites(v => !v)}
            title={showFavorites ? 'Ver todos los jugadores' : 'Ver solo mis favoritos'}
            className={`relative flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showFavorites ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <span>{showFavorites ? '⭐' : '☆'}</span>
            <span className="hidden sm:inline">Mi grupo</span>
            {favorites.size > 0 && !showFavorites && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {favorites.size}
              </span>
            )}
          </button>
          <button onClick={handleShare} title="Compartir planilla"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              shared ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <span>{shared ? '✓' : '↗'}</span>
            <span className="hidden sm:inline">{shared ? 'Copiado' : 'Compartir'}</span>
          </button>
          <button onClick={handleShareWhatsApp} title="Compartir en WhatsApp"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
            <span>💬</span>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button onClick={handleDownload} title="Descargar planilla"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
            <span>📥</span>
            <span className="hidden sm:inline">Descargar</span>
          </button>
          <button onClick={handleSearchToggle} title="Buscar jugador"
            className={`relative flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              searchOpen || selectedPlayers.size > 0 ? 'bg-[#0042A5] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <span>🔍</span>
            <span className="hidden sm:inline">{searchOpen ? 'Cerrar' : 'Buscar'}</span>
            {selectedPlayers.size > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {selectedPlayers.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Panel de búsqueda multi-select */}
      {searchOpen && (
        <div className="max-w-7xl mx-auto px-2 no-print">
          {selectedPlayers.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {rows.filter(r => selectedPlayers.has(r.planilla_id)).map(r => (
                <span key={r.planilla_id}
                  className="inline-flex items-center gap-1 bg-[#0042A5] text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                  {r.user_name}
                  <button onClick={(e) => { e.stopPropagation(); handleRemovePlayer(r.planilla_id) }}
                    className="opacity-70 hover:opacity-100 leading-none ml-0.5">×</button>
                </span>
              ))}
              <button onClick={(e) => { e.stopPropagation(); handleClearSearch() }}
                className="text-xs text-gray-400 hover:text-gray-600 px-1 self-center">
                Limpiar todo
              </button>
            </div>
          )}
          <div className="relative max-w-xs" onClick={e => e.stopPropagation()}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={selectedPlayers.size > 0 ? 'Agregar otro jugador...' : 'Buscar jugador...'}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0042A5] bg-white shadow-sm text-[#001A4B]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none">
                ×
              </button>
            )}
            {searchSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {searchSuggestions.map(r => (
                  <li key={r.planilla_id}>
                    <button
                      onClick={() => handleSelectPlayer(r.planilla_id)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex items-center justify-between transition-colors">
                      <span className="font-medium text-[#001A4B]">{r.user_name}</span>
                      <span className="text-xs text-gray-400">{tournamentPts.get(r.planilla_id) ?? 0} pts</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Filtro por torneo — solo visible si hay 2+ torneos */}
      {tournaments.length > 1 && (
        <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap no-print">
          {tournaments.map(tour => (
            <button
              key={tour.id}
              onClick={() => {
                setSelectedTournamentId(tour.id)
                selectedTournamentIdRef.current = tour.id
                Promise.all([
                  loadBetsForTournament(tour.id, elimTourIdRef.current, tournaments.length),
                  loadRankingForTournament(tour.id, elimTourIdRef.current)
                ]).catch(() => show(t.matrix.errorLoad, 'error'))
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedTournamentId === tour.id
                  ? 't-bg-primary t-text-on-primary'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tour.name}
            </button>
          ))}
        </div>
      )}

      {finishedMatches.length > 0 && (
        <div className="max-w-7xl mx-auto px-2 flex gap-2 flex-wrap text-xs items-center no-print">
          {(['celeste','rojo','verde','amarillo','gris'] as const).map((c) => (
            <button
              key={c}
              onClick={(e) => {
                e.stopPropagation()
                setFilterColors(prev => {
                  const next = new Set(prev)
                  next.has(c) ? next.delete(c) : next.add(c)
                  return next
                })
              }}
              className={`px-2 py-0.5 rounded font-medium transition-all ${POINT_COLORS[c]} ${
                filterColors.has(c)
                  ? 'ring-2 ring-offset-1 ring-gray-500 scale-105 shadow'
                  : filterColors.size > 0
                    ? 'opacity-40'
                    : ''
              }`}
            >
              {t.matrix.ptsLabel[c]}
            </button>
          ))}
          {filterColors.size > 0 && (
            <button
              onClick={() => setFilterColors(new Set())}
              className="t-text-muted hover:opacity-75 font-medium ml-1"
            >
              ✕ limpiar
            </button>
          )}
          {filterColors.size === 0 && <span className="t-text-muted ml-1">{t.matrix.legend}</span>}
        </div>
      )}

      {activeCell && (
        <BetPopover cell={activeCell} onClose={() => setActiveCell(null)} />
      )}

      {allMatches.length === 0 ? (
        <EmptyState icon="📊" message={t.matrix.noMatches} className="max-w-7xl mx-auto px-2" />
      ) : (
        <>
        {/* ── Sticky header fuera del overflow-x container ────────────────
            Fix iOS Safari: sticky en <th> se rompe si cualquier ancestor
            tiene overflow-x:auto. Solución: header en div sticky separado,
            sincronizado con el body via JS onBodyScroll.
        ── */}
        <div className="sticky top-14 z-20 overflow-hidden shadow-sm no-print">
          <div ref={headerInnerRef} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="text-xs border-collapse min-w-max">
              <thead>
                <tr className="bg-[#001A4B] text-white">
                  <th ref={headerJugadorRef} className="sticky left-0 bg-[#001A4B] px-2 py-2 text-left font-semibold z-30 min-w-[140px] sm:min-w-[180px]">
                    {t.ranking.player}
                  </th>
                  <th className="sticky-pts px-2 py-2 text-center font-semibold w-14 bg-[#001A4B]">{t.ranking.pts}</th>
                  {allMatches.map((m) => (
                    <th
                      key={m.id}
                      className="px-1 py-2 text-center font-medium min-w-[60px] bg-[#001A4B] cursor-default"
                      title={`${m.home_team} vs ${m.away_team}${m.estado === 'finished' ? ` · ${m.resultado_local}-${m.resultado_visitante}` : ''}`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="text-base leading-none">
                          {teamFlag(m.home_team) || m.home_team.substring(0,3).toUpperCase()}
                        </div>
                        <div className="text-[8px] text-white/45 leading-none font-semibold tracking-wide uppercase">
                          {m.home_team.substring(0,3)}
                        </div>
                        <div className="text-[9px] text-white/50 leading-none">vs</div>
                        <div className="text-base leading-none">
                          {teamFlag(m.away_team) || m.away_team.substring(0,3).toUpperCase()}
                        </div>
                        <div className="text-[8px] text-white/45 leading-none font-semibold tracking-wide uppercase">
                          {m.away_team.substring(0,3)}
                        </div>
                        {m.estado === 'finished' && (
                          <div className="text-[#FFDF00] font-bold text-[10px] leading-none mt-0.5">
                            {m.resultado_local}-{m.resultado_visitante}
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        </div>

        {/* ── Body con scroll horizontal del usuario ── */}
        <div ref={tableRef} onScroll={onBodyScroll} className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.6)_rgba(203,213,225,0.4)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200/40">
          <table className="text-xs border-collapse min-w-max">
            {/* thead invisible: fuerza que las columnas del body tengan
                el mismo ancho mínimo que el header visible */}
            <thead aria-hidden>
              <tr className="invisible">
                <th ref={bodyJugadorRef} className="min-w-[140px] sm:min-w-[180px] p-0" />
                <th className="w-14 p-0" />
                {allMatches.map((m) => <th key={m.id} className="min-w-[60px] p-0" />)}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, ri) => {
                const isMe = r.user_id === user?.id
                const isUnpaid = !r.precio_pagado
                const playerBets = getBetsForRow(r)
                const rowBg = isMe ? 'bg-blue-50' : isUnpaid ? 'bg-orange-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                const rowKey = `${r.planilla_id}-${ri}`
                const pts = tournamentPts.get(r.planilla_id) ?? 0
                const pos = ri + 1
                return (
                  <tr key={rowKey} className={`${rowBg} ${isMe ? 'hover:bg-blue-100/60' : 'hover:bg-yellow-50/50'} transition-colors ${isUnpaid && !isMe ? 'border-l-4 border-orange-400' : ''}`}>
                    <td className={`sticky left-0 px-1.5 sm:px-2 py-1.5 font-medium z-10 border-r border-gray-100 ${rowBg} min-w-[140px] sm:min-w-auto`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {pos}
                        </span>
                        {r.user_avatar
                          ? <img
                              src={r.user_avatar}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover shrink-0 border border-gray-100 cursor-pointer hover:ring-2 hover:ring-[#0042A5] hover:ring-offset-1 transition-all"
                              onClick={e => { e.stopPropagation(); setAvatarFullscreen({ avatar: r.user_avatar!, name: r.user_name }) }}
                            />
                          : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isMe ? 'bg-[#0042A5] text-white' : 'bg-gray-300 text-gray-600'}`}>
                              {r.user_name[0].toUpperCase()}
                            </div>
                        }
                        <div className="min-w-0 flex-1">
                          <div className={`truncate max-w-[90px] sm:max-w-[105px] text-[11px] sm:text-xs font-semibold ${isMe ? 'text-[#0042A5]' : 'text-[#001A4B]'}`}>
                            {r.user_name}
                          </div>
                          {r.nombre_planilla && (
                            <span className="block text-[10px] text-gray-400 truncate max-w-[90px]">{r.nombre_planilla}</span>
                          )}
                          <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap ${isUnpaid ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                            {isUnpaid ? 'IMPAGO' : 'Pagó'}
                          </span>
                        </div>
                        {r.whatsapp_number && (
                          <a
                            href={`https://wa.me/${r.whatsapp_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={`WhatsApp${!isMe ? ` a ${r.user_name}` : ''}`}
                            className="shrink-0 transition-opacity opacity-80 hover:opacity-100 leading-none"
                            style={{ color: '#25D366' }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.057 23.57a.5.5 0 00.613.613l5.708-1.475A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.374l-.36-.214-3.733.965.99-3.619-.235-.373A9.818 9.818 0 112 12c0-5.42 4.398-9.818 9.818-9.818z"/></svg>
                          </a>
                        )}
                        {!isMe && (
                          <button
                            onClick={(e) => handleToggleFavorite(r.planilla_id, e)}
                            disabled={togglingFav === r.planilla_id}
                            className={`shrink-0 text-sm leading-none transition-opacity disabled:opacity-30 ${favorites.has(r.planilla_id) ? 'opacity-100' : 'opacity-40 hover:opacity-90'}`}
                            title={favorites.has(r.planilla_id) ? t.ranking.unfollow : t.ranking.follow}
                            aria-label={favorites.has(r.planilla_id) ? t.ranking.unfollow : t.ranking.follow}
                            aria-pressed={favorites.has(r.planilla_id)}
                          >
                            {favorites.has(r.planilla_id) ? '⭐' : '☆'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className={`sticky-pts px-2 py-1.5 text-center font-black text-[#0042A5] ${rowBg}`}>{pts}</td>
                    {allMatches.map((m) => {
                      const b = playerBets[m.id]
                      const isCutoffPassed = new Date() > new Date(m.time_cutoff)

                      if (m.estado === 'finished' && m.resultado_local !== undefined) {
                        if (!b) return <td key={m.id} className="px-1 py-1.5 text-center text-gray-300">—</td>
                        const res = calcularPuntaje(
                          { goles_local: b.home, goles_visitante: b.away },
                          { resultado_local: m.resultado_local, resultado_visitante: m.resultado_visitante! }
                        )
                        const isActive = activeCell?.matchId === m.id && activeCell?.rowKey === rowKey
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => handleBadgeClick(e, m.id, rowKey, b, m, res)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  handleBadgeClick(e as unknown as React.MouseEvent<HTMLSpanElement>, m.id, rowKey, b, m, res)
                                }
                              }}
                              aria-label={`${m.home_team} vs ${m.away_team}: pronóstico ${b.home}-${b.away}, ${t.match.popLabels[res.color]}`}
                              title={`${m.home_team} vs ${m.away_team}: ${b.home}-${b.away} · ${t.match.popLabels[res.color]}`}
                              className={`inline-block px-1.5 py-0.5 rounded font-bold text-[11px] cursor-pointer select-none transition-all focus:outline-none focus:ring-2 focus:ring-[#0042A5] focus:ring-offset-1
                                ${POINT_COLORS[res.color]}
                                ${isActive ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105 hover:shadow-md'}
                                ${filterColors.size > 0 && !filterColors.has(res.color) ? 'opacity-10 pointer-events-none' : ''}
                              `}
                            >
                              {b.home}-{b.away}
                            </span>
                          </td>
                        )
                      }

                      // Partido pendiente: solo el propio usuario ve su apuesta (o si el cutoff ya pasó)
                      if (isMe || isCutoffPassed) {
                        if (!b) return <td key={m.id} className="px-1 py-1.5 text-center text-gray-300">—</td>
                        return (
                          <td key={m.id} className="px-1 py-1.5 text-center text-gray-500 font-medium">
                            {b.home}-{b.away}
                          </td>
                        )
                      }

                      return (
                        <td key={m.id} className="px-1 py-1.5 text-center">
                          {b
                            ? <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => { e.stopPropagation(); setShowVedaModal(true) }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    setShowVedaModal(true)
                                  }
                                }}
                                aria-label="Período de veda activo"
                                className="inline-block text-[13px] cursor-pointer select-none opacity-50 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#0042A5] rounded"
                                title="Período de veda activo"
                              >🔒</span>
                            : <span className="text-gray-200">—</span>
                          }
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Modal: período de veda */}
      {showVedaModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setShowVedaModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none">
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto"
              style={{ animation: 'pop 0.2s ease-out both' }}
            >
              <div className="text-center space-y-3">
                <div className="text-4xl">🔒</div>
                <h3 className="font-bold text-[#001A4B] text-base">Período de veda activo</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Las apuestas de otros jugadores no se pueden ver hasta que finalice el período de veda de este partido.
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Una vez que comience el partido, podrás ver todos los pronósticos.
                </p>
                <Button
                  variant="dark"
                  fullWidth
                  onClick={() => setShowVedaModal(false)}
                  className="mt-2"
                >
                  Entendido
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Avatar fullscreen */}
      {avatarFullscreen && (
        <div
          className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center backdrop-blur-sm"
          onClick={() => setAvatarFullscreen(null)}
        >
          <img
            src={avatarFullscreen.avatar}
            alt={avatarFullscreen.name}
            className="max-w-[88vw] max-h-[88vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setAvatarFullscreen(null)}
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white text-xl hover:bg-black/70 transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

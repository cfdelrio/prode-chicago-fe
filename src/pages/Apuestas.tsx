import { useEffect, useState, useMemo, Fragment } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { api } from '@/api/client'
import { useT } from '@/hooks/useT'
import { MatchCard } from '@/components/match/MatchCard'
import { Sk, SkMatchCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { OnboardingTour, hasSeenOnboarding } from '@/components/onboarding/Tour'
import { InviteFriendCTA } from '@/components/InviteFriendCTA'
import { PushOptInBanner } from '@/components/PushOptInBanner'
import { PushPromptModal } from '@/components/PushPromptModal'
import { useToastStore } from '@/store/toastStore'
import { teamFlag } from '@/utils/teamFlags'

function ApuestasSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Sk className="h-7 w-32" />
        <Sk className="h-4 w-20" />
      </div>
      <div className="flex gap-2 items-center">
        <Sk className="h-11 flex-1 rounded-xl" />
        <Sk className="h-10 w-10 rounded-xl shrink-0" />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => <Sk key={i} className="h-8 w-20 rounded-lg" />)}
      </div>
      <div className="flex gap-2 items-center">
        <Sk className="h-9 w-48 rounded-lg" />
        <Sk className="h-9 flex-1 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => <SkMatchCard key={i} />)}
      </div>
    </div>
  )
}
import type { Match, Bet, Planilla } from '@/types'

export function Apuestas() {
  const { show } = useToastStore()
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [planillas, setPlanillas] = useState<Planilla[]>([])
  const [selectedPlanilla, setSelectedPlanilla] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewPlanilla, setShowNewPlanilla] = useState(false)
  const [creatingPlanilla, setCreatingPlanilla] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [lockingPlanilla, setLockingPlanilla] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [showHelp, setShowHelp] = useState(true)
  const [runTour, setRunTour] = useState(false)
  const hasLive = matches.some(m => m.estado === 'live')
  const isTournamentClosed = matches.length > 0 && now > Math.min(...matches.map(m => new Date(m.time_cutoff).getTime()))

  useEffect(() => {
    loadInitial()
  }, [])

  // Arrancar el tour de bienvenida la primera vez que entran a Pronósticos.
  // Esperamos a que el contenido haya cargado (loading=false) para que los targets existan.
  useEffect(() => {
    if (!loading && !hasSeenOnboarding()) {
      const id = setTimeout(() => setRunTour(true), 400)
      return () => clearTimeout(id)
    }
  }, [loading])

  useEffect(() => {
    if (selectedPlanilla) loadBets(selectedPlanilla)
  }, [selectedPlanilla])

  // Tick now every 30s (for countdown chips)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Live polling: refresh matches every 30s when live — pausa si el tab está oculto
  usePolling(() => {
    api.get('/matches?limit=200')
      .then(res => {
        setMatches(res.data.data.matches)
        setNow(Date.now())
      })
      .catch(err => {
        const errMsg = err?.response?.data?.error || 'No se pudieron actualizar los partidos'
        show(errMsg, 'error')
      })
  }, 30_000, hasLive)

  const loadInitial = async () => {
    setLoading(true)
    try {
      const [matchRes, planRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/planillas'),
      ])
      setMatches(matchRes.data.data.matches)
      const pl: Planilla[] = planRes.data.data
      setPlanillas(pl)
      if (pl.length > 0) {
        setSelectedPlanilla(pl[0].id)
      }
    } catch {
      show(t.bets.errorLoadMatches, 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadBets = async (planillaId: string) => {
    try {
      const { data } = await api.get(`/bets/planillas/${planillaId}/bets?t=${Date.now()}`)
      const betMap: Record<string, Bet> = {}
      for (const b of data.data) betMap[b.match_id] = b
      setBets(betMap)
    } catch {
      show(t.bets.errorLoad, 'error')
    }
  }

  const handleCreatePlanilla = async () => {
    if (isTournamentClosed) {
      show(t.bets.tournamentClosed, 'error')
      setShowNewPlanilla(false)
      return
    }
    setCreatingPlanilla(true)
    try {
      const { data } = await api.post('/planillas')
      const created: Planilla = data.data
      setPlanillas(prev => [...prev, created])
      setSelectedPlanilla(created.id)
      setBets({})
      setShowNewPlanilla(false)
      show(t.bets.planillaCreated(created.nombre_planilla), 'success')
    } catch {
      show(t.bets.errorCreate, 'error')
    } finally {
      setCreatingPlanilla(false)
    }
  }

  const handleLockPlanilla = async () => {
    if (!selectedPlanilla || lockingPlanilla) return
    setLockingPlanilla(true)
    try {
      await api.put(`/planillas/${selectedPlanilla}/lock`)
      setPlanillas(prev => prev.map(p => p.id === selectedPlanilla ? { ...p, locked: true } : p))
      setShowConfirmModal(false)
      show(t.bets.planillaLocked, 'success')
    } catch {
      show(t.bets.errorLock, 'error')
    } finally {
      setLockingPlanilla(false)
    }
  }

  // Live matches (pinned at top)
  const liveMatches = useMemo(
    () => matches.filter(m => m.estado === 'live'),
    [matches]
  )

  const pendingMatches = matches.filter(m => m.estado !== 'finished')

  const filtered = matches
    .filter((m) => {
      if (search) {
        const q = search.toLowerCase()
        return m.home_team.toLowerCase().includes(q) || m.away_team.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      // Partidos terminados siempre al fondo (ya tienen resultado)
      if (a.estado === 'finished' && b.estado !== 'finished') return 1
      if (a.estado !== 'finished' && b.estado === 'finished') return -1
      // Entre pendientes: sin apuesta primero, con apuesta después
      if (a.estado !== 'finished' && b.estado !== 'finished') {
        const aBet = !!bets[a.id]
        const bBet = !!bets[b.id]
        if (!aBet && bBet) return -1
        if (aBet && !bBet) return 1
      }
      // Dentro de cada grupo: orden por fecha de inicio
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    })

  const progress = {
    done: Object.keys(bets).filter(mid => matches.find(m => m.id === mid)).length,
    total: pendingMatches.length,
  }

  const selectedPlanillaObj = planillas.find(p => p.id === selectedPlanilla)

  if (loading) return <ApuestasSkeleton />

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#001A4B]">{t.bets.title}</h1>
        <span className="text-sm text-gray-400">{progress.done}/{progress.total} {t.bets.completed}</span>
      </div>

      {/* Invitar amigo — CTA compacto */}
      <InviteFriendCTA variant="compact" />

      {/* Push opt-in — solo si ya hay al menos un bet (entiende el valor) */}
      {Object.keys(bets).length > 0 && <PushOptInBanner />}

      {/* Caja de ayuda — se cierra con la X y vuelve a aparecer al recargar */}
      {showHelp && (
        <div className="relative bg-blue-50 border border-blue-200 rounded-xl section-animate px-4 py-3 pr-9 text-sm text-blue-900">
          <button
            onClick={() => setShowHelp(false)}
            aria-label={t.bets.helpClose}
            title={t.bets.helpClose}
            className="absolute top-2 right-2 w-7 h-7 rounded-full text-blue-700 hover:bg-blue-100 flex items-center justify-center text-base leading-none transition-colors"
          >
            ×
          </button>
          <p className="font-semibold mb-1.5">{t.bets.helpTitle}</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>{t.bets.helpStep1}</li>
            <li>{t.bets.helpStep2}</li>
            <li>{t.bets.helpStep3}</li>
          </ol>
        </div>
      )}

      {/* Selector de planilla + crear nueva */}
      <div className="flex gap-2 items-center" data-tour="planilla-selector">
        {planillas.length > 0 ? (
          <div className="relative flex-1">
            <select
              value={selectedPlanilla}
              onChange={(e) => setSelectedPlanilla(e.target.value)}
              className="w-full appearance-none border border-gray-200 t-text-nav rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5] pr-8 font-medium transition-all"
            >
              {planillas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre_planilla}</option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
          </div>
        ) : (
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800 font-medium">
            {t.bets.noPlanillas}
          </div>
        )}
        {!isTournamentClosed && (
          <button
            onClick={() => setShowNewPlanilla(true)}
            data-tour="new-planilla"
            className="shrink-0 w-10 h-10 rounded-xl t-bg-primary t-text-on-primary font-bold text-lg flex items-center justify-center hover:opacity-90 transition-opacity"
            title={t.bets.newPlanilla}
          >
            +
          </button>
        )}
      </div>

      {/* Modal nueva planilla */}
      {showNewPlanilla && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setShowNewPlanilla(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto p-6"
            style={{ animation: 'slideUp 0.2s ease-out both' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <h3 className="font-bold t-text-nav text-base mb-1">{t.bets.newPlanilla}</h3>
            <p className="text-xs text-gray-400 mb-4">
              {t.bets.planillaIndependent}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewPlanilla(false)}
                className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-3 rounded-xl"
              >
                {t.bets.cancel}
              </button>
              <button
                onClick={handleCreatePlanilla}
                disabled={creatingPlanilla}
                className="flex-1 t-btn-primary text-sm py-3 disabled:opacity-40"
              >
                {creatingPlanilla ? '...' : t.bets.createPlanilla}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Botón confirmar planilla */}
      {selectedPlanillaObj && !selectedPlanillaObj.locked && (() => {
        const missing = pendingMatches.filter(m => !bets[m.id]).length
        const allDone = missing === 0 && pendingMatches.length > 0
        return (
          <button
            onClick={() => allDone && setShowConfirmModal(true)}
            disabled={!allDone}
            className={`w-full font-bold py-3 rounded-xl text-sm transition-colors border-2 ${
              allDone
                ? 'border-[#0042A5] text-[#0042A5] hover:bg-[#0042A5] hover:text-white cursor-pointer'
                : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
            }`}
          >
            {allDone ? `🔒 ${t.bets.confirmPlanilla}` : `⏳ ${t.bets.missingBets(missing)}`}
          </button>
        )
      })()}

      {/* Modal confirmar y cerrar planilla */}
      {showConfirmModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl p-6 max-w-lg mx-auto max-h-[80vh] flex flex-col">
            <h3 className="font-bold text-lg text-gray-900 mb-1">🔒 {t.bets.confirmPlanillaTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">{t.bets.confirmPlanillaDesc}</p>
            <div className="overflow-y-auto flex-1 space-y-1 mb-4">
              {matches.filter(m => bets[m.id]).map(m => (
                <div key={m.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-700 truncate mr-2">
                    {teamFlag(m.home_team)} {m.home_team} vs {m.away_team} {teamFlag(m.away_team)}
                  </span>
                  <span className="font-mono font-bold text-[#0042A5] shrink-0">
                    {bets[m.id].goles_local} – {bets[m.id].goles_visitante}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl text-sm"
              >
                {t.bets.keepEditing}
              </button>
              <button
                onClick={handleLockPlanilla}
                disabled={lockingPlanilla}
                className="flex-1 t-btn-primary py-3 text-sm disabled:opacity-40"
              >
                {lockingPlanilla ? '...' : t.bets.confirmLock}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Búsqueda */}
      <div className="flex gap-2 items-center flex-wrap" data-tour="filters">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.bets.searchTeam}
          className="flex-1 min-w-32 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0042A5] bg-white"
        />
      </div>


      {/* Sección EN VIVO */}
      {liveMatches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide">{t.bets.liveNow}</p>
          </div>
          {liveMatches.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              bet={bets[m.id]}
              planillaId={selectedPlanilla || undefined}
              planillaLocked={selectedPlanillaObj?.locked}
              tournamentClosed={isTournamentClosed}
              onBetSaved={() => loadBets(selectedPlanilla)}
              onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
              now={now}
            />
          ))}
          <div className="border-t border-gray-100 pt-1" />
        </div>
      )}

      {/* Lista de partidos */}
      <div className="space-y-3" data-tour="match-list">
        {filtered.length === 0 && (
          <EmptyState icon="⚽" message={t.bets.noMatches} />
        )}
        {filtered.map((m) => (
          <Fragment key={m.id}>
            <MatchCard
              match={m}
              bet={bets[m.id]}
              planillaId={selectedPlanilla || undefined}
              planillaLocked={selectedPlanillaObj?.locked}
              tournamentClosed={isTournamentClosed}
              onBetSaved={() => loadBets(selectedPlanilla)}
              onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
              now={now}
            />
          </Fragment>
        ))}
      </div>

      <OnboardingTour run={runTour} onFinish={() => setRunTour(false)} />
      <PushPromptModal delayMs={800} />
    </div>
  )
}

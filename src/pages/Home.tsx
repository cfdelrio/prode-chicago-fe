import { useEffect, useState, useRef, Fragment } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import { LazyQR } from '@/components/ui/LazyQR'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { useT } from '@/hooks/useT'
import { Sk } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { teamFlag, teamAbbr } from '@/utils/teamFlags'
import { LeaderHome } from '@/pages/LeaderHome'
import { POINT_COLORS } from '@/utils/scoring'
import { PollWidget } from '@/components/PollWidget'
import { useGamification } from '@/hooks/useGamification'
import { PozoHeroCard } from '@/components/PozoHeroCard'
import { IncompleteProdeHero } from '@/components/IncompleteProdeHero'
import type { Match, Bet, Planilla, RankingEntry } from '@/types'

/* ── Flip clock animation (defined in index.css) ─────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('flip-anim')) {
  const s = document.createElement('style')
  s.id = 'flip-anim'
  s.textContent = `
    @keyframes flipDown {
      from { transform: perspective(280px) rotateX(-82deg); }
      to   { transform: perspective(280px) rotateX(0deg); }
    }
  `
  document.head.appendChild(s)
}

const FW = 34, FH = 50, FFS = 38

function FlipDigit({ digit, animate = false }: { digit: string; animate?: boolean }) {
  const halfH = FH / 2
  const topOffset  = (FH - FFS) / 2
  const botOffset  = topOffset - halfH
  const numStyle: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0,
    textAlign: 'center',
    fontSize: FFS, fontWeight: 900, color: '#FFFFFF',
    lineHeight: 1, userSelect: 'none',
    fontFamily: "'Arial Black', Arial, sans-serif",
    letterSpacing: -1,
  }
  return (
    <div style={{ position: 'relative', width: FW, height: FH, borderRadius: 5, overflow: 'hidden',
      boxShadow: '0 3px 10px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: halfH,
        background: '#242428', overflow: 'hidden' }}>
        <span style={{ ...numStyle, top: topOffset }}>{digit}</span>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: halfH,
        background: '#1a1a1c', overflow: 'hidden' }}>
        <span style={{ ...numStyle, top: botOffset }}>{digit}</span>
      </div>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0,
        height: 1.5, background: 'rgba(0,0,0,0.85)', zIndex: 10,
        transform: 'translateY(-50%)' }} />
      {animate && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: halfH,
          background: '#242428', overflow: 'hidden', zIndex: 5,
          transformOrigin: '50% 100%',
          animation: 'flipDown 0.28s ease-in',
          boxShadow: '0 4px 8px rgba(0,0,0,0.5)' }}>
          <span style={{ ...numStyle, top: topOffset }}>{digit}</span>
        </div>
      )}
    </div>
  )
}

function FlipDisplay({ value }: { value: string }) {
  const groups = value.split(':')
  const labels = groups.length === 4 ? ['DÍAS', 'HS', 'MIN', 'SEG'] : ['HS', 'MIN', 'SEG']
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
      {groups.map((group, gi) => (
        <Fragment key={gi}>
          {gi > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
              gap: 7, height: FH, paddingBottom: 16 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {group.split('').map((ch, di) => (
                <FlipDigit key={`${gi}-${di}-${ch}`} digit={ch} animate={gi === groups.length - 1} />
              ))}
            </div>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
              {labels[gi]}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function getGreeting(now: Date): string {
  const h = now.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function NextMatchBanner({ matches, bets }: { matches: Match[]; bets: Record<string, Bet> }) {
  const [now, setNow] = useState(Date.now())
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    ref.current = setInterval(() => setNow(Date.now()), 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [])

  const match = matches
    .filter(m => m.estado !== 'finished' && new Date(m.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null

  if (!match) return null

  const hasBet = !!bets[match.id]
  const startMs = new Date(match.start_time).getTime()
  const diff = Math.max(0, startMs - now)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m2 = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  const displayStr = d > 0
    ? `${pad2(d)}:${pad2(h)}:${pad2(m2)}:${pad2(s)}`
    : `${pad2(h)}:${pad2(m2)}:${pad2(s)}`
  const dateStr = format(new Date(match.start_time), "EEE d MMM · HH:mm", { locale: esLocale })

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0f1e 0%, #001A4B 60%, #0a2060 100%)',
      borderRadius: 16, padding: '16px 20px 18px',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ⚡ Próximo partido
          </p>
          {hasBet && (
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Tu apuesta
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2 }}>
            {match.home_team} <span style={{ color: 'rgba(255,255,255,0.45)' }}>vs</span> {match.away_team}
          </p>
          {hasBet && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
              background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: 8, padding: '3px 8px',
              fontSize: 12, fontWeight: 900, color: '#FFFFFF',
            }}>
              <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{teamAbbr(match.home_team)}</span>
              <span style={{ color: '#4ade80' }}>{bets[match.id].goles_local}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>–</span>
              <span style={{ color: '#4ade80' }}>{bets[match.id].goles_visitante}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{teamAbbr(match.away_team)}</span>
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          📅 {dateStr} hs
        </p>
        {!hasBet && (
          <Link to="/apuestas" style={{
            display: 'inline-block', marginTop: 8,
            background: '#FFCC00', color: '#001A4B',
            fontSize: 11, fontWeight: 800, padding: '4px 12px',
            borderRadius: 20, textDecoration: 'none',
          }}>
            🎯 Apostar →
          </Link>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <FlipDisplay value={displayStr} />
      </div>
    </div>
  )
}

function NextMatchDesktopPanel({ matches, bets }: { matches: Match[]; bets: Record<string, Bet> }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const match = matches
    .filter(m => m.estado !== 'finished' && new Date(m.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null

  if (!match) return null

  const hasBet = !!bets[match.id]
  const dateStr = format(new Date(match.start_time), "EEE d MMM · HH:mm", { locale: esLocale })
  const diffMs = Math.max(0, new Date(match.start_time).getTime() - now)
  const cdDays  = Math.floor(diffMs / 86400000)
  const cdHours = Math.floor((diffMs % 86400000) / 3600000)
  const cdMins  = Math.floor((diffMs % 3600000) / 60000)
  const cdSecs  = Math.floor((diffMs % 60000) / 1000)

  return (
    <div className="hidden md:flex flex-col justify-between px-6 py-6 md:flex-[2] border-l border-gray-100 bg-white gap-3">
      <div className="text-center">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
          FALTA PARA EL PRÓXIMO PARTIDO
        </p>
        <div className="flex items-end justify-center gap-1.5">
          {[{ v: cdDays, l: 'DÍAS' }, { v: cdHours, l: 'HS' }, { v: cdMins, l: 'MIN' }, { v: cdSecs, l: 'SEG' }].map(({ v, l }, i) => (
            <div key={l} className="flex items-end gap-1.5">
              {i > 0 && <span className="text-gray-200 font-black text-lg pb-4">:</span>}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="text-2xl font-black tabular-nums rounded-lg px-2 py-1 min-w-[42px] text-center leading-none"
                  style={{ background: '#001A4B', color: l === 'SEG' ? 'rgba(255,223,0,0.6)' : '#FFDF00', fontFamily: "'Arial Black', Arial, sans-serif" }}
                >
                  {pad2(v)}
                </div>
                <span className="text-[8px] font-black text-gray-400 tracking-widest">{l}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">⚡ Próximo partido</p>
        <Link to="/fixture" className="text-[10px] font-semibold text-blue-500 hover:underline">
          Ver fixture →
        </Link>
      </div>

      <div className="flex items-center justify-around gap-2">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-5xl leading-none">{teamFlag(match.home_team) || '🏳'}</span>
          <p className="text-xs font-bold text-gray-700 text-center">{match.home_team}</p>
        </div>
        <p className="text-sm font-black text-gray-300 px-2">VS</p>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-5xl leading-none">{teamFlag(match.away_team) || '🏳'}</span>
          <p className="text-xs font-bold text-gray-700 text-center">{match.away_team}</p>
        </div>
      </div>

      <p className="text-center text-[11px] text-gray-400">📅 {dateStr} hs</p>

      {hasBet ? (
        <div>
          <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-100 rounded-xl py-3">
            <span className="text-[10px] font-bold text-gray-400 tracking-wide">{teamAbbr(match.home_team)}</span>
            <span className="font-black text-2xl text-green-600">{bets[match.id].goles_local}</span>
            <span className="text-gray-300 font-bold text-xl">—</span>
            <span className="font-black text-2xl text-green-600">{bets[match.id].goles_visitante}</span>
            <span className="text-[10px] font-bold text-gray-400 tracking-wide">{teamAbbr(match.away_team)}</span>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2 uppercase tracking-wider font-bold">
            TU PRONÓSTICO ✏️
          </p>
        </div>
      ) : (
        <Link
          to="/apuestas"
          className="block text-center font-black text-sm py-3 rounded-xl hover:brightness-95 transition-all"
          style={{ background: '#FFDF00', color: '#001A4B' }}
        >
          🎯 Apostar ahora →
        </Link>
      )}
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="bg-[#001A4B] rounded-2xl p-6" style={{ minHeight: 220 }}>
        <div className="space-y-3">
          <div className="animate-pulse bg-yellow-400/20 h-3 w-28 rounded-full" />
          <div className="space-y-1.5">
            <div className="animate-pulse bg-white/30 h-8 w-52 rounded" />
            <div className="animate-pulse bg-white/25 h-8 w-44 rounded" />
            <div className="animate-pulse bg-white/20 h-8 w-48 rounded" />
          </div>
          <div className="animate-pulse bg-yellow-400/40 h-12 w-48 rounded-xl mt-3" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="animate-pulse bg-gray-800 h-10" />
        <div className="p-4 space-y-3">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-3 items-center">
              <Sk className="w-14 h-7 rounded-full" />
              <Sk className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Contenido estático ──────────────────────────────────────── */

function buildInviteMessage(inviterName?: string): string {
  if (inviterName) {
    return `⚽ ¡Te invito al PRODE del Mundial 2026!\n\nSoy ${inviterName} y te quiero desafiar. Armá tus resultados, sumá puntos y jugá contra todos en el ranking.\n\n🎫 1 boleta $20.000\n\nEntrá acá:\nhttps://prodecaballito.com`
  }
  return `⚽ ¡Sumate al PRODE del Mundial 2026!\n\nArmá tus resultados, competí en el ranking y jugá contra todos.\n\n🎫 1 boleta $20.000\n\nEntrá acá:\nhttps://prodecaballito.com`
}

const SCORING_ROWS = [
  { color: 'celeste'  as const, pts: '4 pts', desc: 'Resultado exacto + ambos goles + 4 o más goles en el partido (BONUS)' },
  { color: 'rojo'     as const, pts: '3 pts', desc: 'Resultado exacto: ganador/empate y ambos tanteadores exactos' },
  { color: 'verde'    as const, pts: '2 pts', desc: 'Ganador correcto y uno de los dos tanteadores exactos (no aplica en empate)' },
  { color: 'amarillo' as const, pts: '1 pt',  desc: 'Solo acertaste el ganador o el empate (sin goles exactos)' },
  { color: 'gris'     as const, pts: '0 pts', desc: 'No acertaste el resultado global (quién ganó o si fue empate)' },
]

const KEY_EXAMPLES = [
  { bet: 'ARG 2 - JOR 1', result: 'ARG 0 - JOR 1', pts: 0, color: 'gris'     as const, note: 'Pronosticaste Argentina ganador pero ganó Jordania → 0 puntos sin importar nada más' },
  { bet: 'ARG 2 - JOR 1', result: 'ARG 1 - JOR 0', pts: 1, color: 'amarillo' as const, note: 'Ganador correcto (Argentina) pero ningún gol exacto → 1 punto' },
  { bet: 'ARG 2 - JOR 0', result: 'ARG 1 - JOR 0', pts: 2, color: 'verde'    as const, note: 'Ganador correcto y un gol exacto (Jordania 0) → 2 puntos' },
  { bet: 'ARG 2 - JOR 1', result: 'ARG 2 - JOR 1', pts: 3, color: 'rojo'     as const, note: 'Resultado exacto: ganador y ambos goles → 3 puntos' },
  { bet: 'ARG 3 - JOR 2', result: 'ARG 3 - JOR 2', pts: 4, color: 'celeste'  as const, note: 'BONUS: resultado exacto en partido con 5 goles totales (≥4) → 4 puntos' },
]

const CONDITIONS = [
  { icon: '🔒', text: 'El cierre de pronósticos es 5 minutos antes del primer partido. Después no se puede agregar ni modificar nada.' },
  { icon: '💰', text: 'Cada planilla cuesta $20.000.' },
  { icon: '👁️', text: 'Al cierre, la planilla general queda visible para todos — podés ver los pronósticos de cada uno.' },
  { icon: '🏆', text: 'Un único ganador: el que acumule más puntos al final de los 72 partidos.' },
  { icon: '⚖️', text: 'Desempate: mayor cantidad de exactos celeste → rojo → verde → amarillo (en ese orden).' },
]

/* ── Home ────────────────────────────────────────────────────── */

export function Home() {
  const { user } = useAuthStore()
  const t = useT()
  const [matches, setMatches] = useState<Match[]>([])
  const [bets, setBets] = useState<Record<string, Bet>>({})
  const [planilla, setPlanilla] = useState<Planilla | null>(null)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState(new Date())
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')
  const { state: pwaState, install: pwaInstall } = usePWAInstall()
  const { show: showToast } = useToastStore()
  const { data: gamification } = useGamification(user?.id ?? null)
  const myStreak = gamification.streaks[0]?.current_streak ?? 0

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { loadData() }, [])

  usePolling(() => loadData(true), 30_000)

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [matchRes, planillaRes, rankRes] = await Promise.all([
        api.get('/matches?limit=200'),
        api.get('/planillas'),
        api.get('/ranking?limit=200'),
      ])
      setMatches(matchRes.data.data.matches)
      setRanking(rankRes.data.data.ranking)
      if (!silent) setLoadError(false)

      const planillas: Planilla[] = planillaRes.data.data
      if (planillas.length > 0) {
        const p = planillas[0]
        setPlanilla(p)
        const betRes = await api.get(`/bets/planillas/${p.id}/bets?t=${Date.now()}`)
        const betMap: Record<string, Bet> = {}
        for (const b of betRes.data.data) betMap[b.match_id] = b
        setBets(betMap)
      }
    } catch (e) {
      console.error(e)
      if (silent) {
        showToast(t.home.refreshError, 'warning')
      } else {
        setLoadError(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshBets = async () => {
    if (!planilla) return
    const betRes = await api.get(`/bets/planillas/${planilla.id}/bets?t=${Date.now()}`)
    const betMap: Record<string, Bet> = {}
    for (const b of betRes.data.data) betMap[b.match_id] = b
    setBets(betMap)
  }

  const RELEVANT_WINDOW_MS = 7 * 24 * 3600000
  const totalUnbet = matches.filter(m => {
    if (m.estado === 'finished' || bets[m.id]) return false
    const cutoff = new Date(m.time_cutoff).getTime()
    return cutoff > now.getTime() && cutoff - now.getTime() < RELEVANT_WINDOW_MS
  }).length

  const closingSoon = matches
    .filter(m => {
      if (m.estado !== 'pending') return false
      const diff = new Date(m.time_cutoff).getTime() - now.getTime()
      return diff > 0 && diff < 6 * 3600000
    })
    .sort((a, b) => new Date(a.time_cutoff).getTime() - new Date(b.time_cutoff).getTime())
    .slice(0, 2)

  const totalPendingMatches = matches.filter(m => m.estado !== 'finished').length
  const totalBetsMade = matches.filter(m => m.estado !== 'finished' && bets[m.id]).length
  const pct = totalPendingMatches > 0 ? Math.round((totalBetsMade / totalPendingMatches) * 100) : 0
  const urgentUnbet = closingSoon.filter(m => !bets[m.id]).length

  const heroVariant: 'pozo' | 'incomplete' | 'classic' =
    !planilla?.precio_pagado ? 'pozo' :
    totalUnbet > 0           ? 'incomplete' :
                               'classic'

  const myEntry = ranking.find(r => r.user_id === user?.id)

  /* ── Modal de invitación multi-canal ────────────────────── */
  const openInviteModal = () => {
    const inviterName = user?.nombre?.split(' ')[0]
    setInviteMessage(buildInviteMessage(inviterName))
    setShowInviteModal(true)
  }

  const inviteVia = (channel: 'whatsapp' | 'sms' | 'email' | 'copy' | 'native') => {
    const text = inviteMessage || buildInviteMessage(user?.nombre?.split(' ')[0])
    const encoded = encodeURIComponent(text)
    switch (channel) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encoded}`, '_blank')
        break
      case 'sms':
        window.location.href = `sms:?body=${encoded}`
        break
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent('Te invito al PRODE del Mundial 2026')}&body=${encoded}`
        break
      case 'copy':
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text)
            .then(() => showToast('Mensaje copiado ✓', 'success'))
            .catch(() => showToast('No se pudo copiar', 'error'))
        } else {
          showToast('No se pudo copiar', 'error')
        }
        break
      case 'native':
        if (navigator.share) {
          navigator.share({ text }).catch(() => {})
        }
        break
    }
  }

  if (loading) return <HomeSkeleton />

  if (myEntry && myEntry.position === 1 && myEntry.puntos_totales > 0) {
    return (
      <LeaderHome
        matches={matches}
        bets={bets}
        onBetSaved={refreshBets}
        onBetDeleted={(mid) => { const nb = { ...bets }; delete nb[mid]; setBets(nb) }}
        ranking={ranking}
        myEntry={myEntry}
        planilla={planilla}
        totalUnbet={totalUnbet}
        urgentUnbet={urgentUnbet}
      />
    )
  }

  if (loadError) return (
    <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
      <span className="text-6xl animate-bounce">📡</span>
      <div>
        <h2 className="text-2xl font-black text-[#001A4B] mb-2">Oops, conexión perdida</h2>
        <p className="font-semibold text-gray-600 text-sm">{t.home.loadError}</p>
      </div>
      <button
        onClick={() => loadData()}
        className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 active:scale-95 mt-2"
        style={{ background: 'var(--theme-primary)', boxShadow: '0 4px 20px rgba(var(--theme-primary-rgb, 0, 66, 165), 0.4)' }}
      >
        {t.home.loadErrorRetry}
      </button>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── HERO + PRÓXIMO PARTIDO (desktop side-by-side) ─────── */}
      <div className="-mx-4 md:mx-0 md:rounded-2xl md:overflow-hidden md:shadow-2xl md:flex mb-5">

        {/* Hero — 3 variantes según estado de pago y pronósticos */}
        {heroVariant === 'pozo' ? (
          <PozoHeroCard ranking={ranking} now={now} />
        ) : heroVariant === 'incomplete' ? (
          <IncompleteProdeHero totalUnbet={totalUnbet} urgentUnbet={urgentUnbet} now={now} userName={user?.nombre} />
        ) : (
          <div className="text-white overflow-hidden relative md:flex-[3]" style={{ minHeight: 300, background: '#001A4B' }}>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=1200&q=80')",
                backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.22,
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(0,26,75,0.97) 0%, rgba(0,26,75,0.82) 60%, rgba(0,26,75,0.55) 100%)' }}
            />

            <div className="relative px-5 py-6">
              <div
                className="inline-flex items-center gap-2 mb-4"
                style={{ background: 'rgba(255,223,0,0.12)', border: '1px solid rgba(255,223,0,0.35)', borderRadius: 99, padding: '5px 14px' }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FFDF00', letterSpacing: '0.06em' }}>
                  ✨ MUNDIAL 2026
                </span>
              </div>

              <h1
                className="font-black text-white leading-none mb-2"
                style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontFamily: "'Arial Black', Arial, sans-serif", lineHeight: 0.95 }}
              >
                EL MUNDIAL<br />SE JUEGA ACÁ<br />
                <em style={{ color: '#FFDF00', fontStyle: 'italic' }}>TAMBIÉN</em>
              </h1>

              <p className="text-white/50 text-xs mt-2 mb-2">
                {getGreeting(now)}, {user?.nombre?.split(' ')[0] || 'jugador'}
                {myEntry && (
                  <>
                    {' · '}
                    <span className="text-white/70 font-semibold">#{myEntry.position}</span>
                    {' · '}
                    <span style={{ color: '#FFDF00' }}>{myEntry.puntos_totales}pts</span>
                  </>
                )}
              </p>

              {myStreak >= 3 && (
                <div
                  className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full font-bold text-xs"
                  style={{ background: 'rgba(255,165,0,0.15)', color: '#FFB84D', border: '1px solid rgba(255,165,0,0.35)' }}
                >
                  <span>🔥</span>
                  <span>Llevás {myStreak} exactos seguidos · ¡no la rompas!</span>
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {urgentUnbet > 0 ? (
                  <Link
                    to="/apuestas"
                    className="inline-flex items-center gap-2 font-black text-sm px-5 py-3 rounded-xl w-fit transition-all hover:brightness-110 active:scale-95 hover:scale-105 group"
                    style={{ background: '#ef4444', color: '#fff', boxShadow: '0 4px 16px rgba(239,68,68,0.4)', animation: 'glow 2s ease-in-out infinite' }}
                  >
                    ⚠️ {urgentUnbet} urgentes — Apostar ahora
                  </Link>
                ) : (
                  <Link
                    to="/apuestas"
                    className="inline-flex items-center gap-2 font-black text-sm px-5 py-3 rounded-xl w-fit transition-all hover:brightness-110 active:scale-95 hover:scale-105"
                    style={{ background: '#FFDF00', color: '#001A4B', boxShadow: '0 4px 20px rgba(255,223,0,0.5)' }}
                  >
                    ⚽ {totalUnbet > 0 ? `Completar mi prode (${totalUnbet})` : 'Jugar ahora'}
                  </Link>
                )}

                {/* CTA secundario: invitar amigo por WhatsApp (directo) */}
                <button
                  onClick={() => inviteVia('whatsapp')}
                  className="inline-flex items-center gap-2 font-black text-sm px-5 py-3 rounded-xl w-fit transition-all hover:brightness-110 active:scale-95 hover:scale-105"
                  style={{ background: '#25D366', color: '#fff', boxShadow: '0 4px 16px rgba(37,211,102,0.4)' }}
                >
                  💬 Invitar a un amigo
                </button>
                <button
                  onClick={openInviteModal}
                  className="self-start text-[11px] font-semibold text-white/55 hover:text-white/85 transition-colors -mt-0.5"
                >
                  ✏️ Personalizar mensaje u otro canal →
                </button>
              </div>

              <p className="text-white/25 text-[10px] mt-4 tracking-wider font-semibold uppercase">
                {format(now, "EEEE, d MMM yyyy", { locale: esLocale })}
              </p>

              {pwaState.type !== 'installed' && pwaState.type !== 'unavailable' && (
                <button
                  onClick={() => pwaState.type === 'ios' ? setShowIOSGuide(true) : pwaInstall()}
                  className="block text-white/20 text-[9px] mt-1.5 hover:text-white/45 transition-colors"
                >
                  📲 {t.home.installApp}
                </button>
              )}
            </div>
          </div>
        )}

        <NextMatchDesktopPanel matches={matches} bets={bets} />
      </div>

      <div className="px-4 space-y-5 pb-28 md:pb-8">

        {/* ── FLIP CLOCK (mobile) ─────────────────────────────── */}
        <div className="md:hidden">
          <NextMatchBanner matches={matches} bets={bets} />
        </div>

        {/* ── CTA PRONÓSTICOS PENDIENTES ──────────────────────── */}
        {totalUnbet > 0 && (
          <Link
            to="/apuestas"
            className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 border transition-all hover:scale-[1.01] active:scale-[0.99] ${
              urgentUnbet > 0
                ? 'bg-red-50 border-red-200 hover:bg-red-100'
                : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className={`text-2xl shrink-0 ${urgentUnbet > 0 ? 'animate-bounce' : ''}`}>⚽</span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm leading-tight ${urgentUnbet > 0 ? 'text-red-700' : 'text-amber-800'}`}>
                  {t.home.ctaTitle(totalUnbet)}
                </p>
                {totalPendingMatches > 0 && !urgentUnbet && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-amber-200 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-amber-600 font-semibold shrink-0">{pct}% completado</span>
                  </div>
                )}
                {urgentUnbet > 0 && (
                  <p className="text-xs text-red-500 mt-0.5 font-medium">{t.home.ctaUrgent(urgentUnbet)}</p>
                )}
              </div>
            </div>
            <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${
              urgentUnbet > 0 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
            }`}>
              {t.home.ctaBtn}
            </span>
          </Link>
        )}

        {/* ── POLL WIDGET ─────────────────────────────────────── */}
        <PollWidget />

        {/* ── PRECIO ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden shadow-md border section-animate"
          style={{ background: 'linear-gradient(135deg, #FFF8DC 0%, #FFFBEB 100%)', borderColor: '#FFDF00', animation: 'slideUp 0.6s ease-out' }}
        >
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#001A4B' }}>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">🎫 Precio</span>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">1 boleta</p>
            <p className="text-2xl font-black text-[#001A4B] leading-none">$20.000</p>
            <p className="text-[10px] text-gray-500 mt-1.5">Una planilla del Mundial</p>
          </div>
          <p className="px-4 py-2.5 text-[11px] text-gray-600 border-t border-amber-200 bg-white/60">
            Podés tener varias planillas — cada una compite por separado en el ranking.
          </p>
        </div>

        {/* ── CÓMO FUNCIONA ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ animation: 'slideUp 0.6s ease-out 0.1s both' }}>
          <div className="bg-[#001A4B] px-4 py-3">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">⚽ Cómo funciona</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {[
              { n: '01', icon: '📋', title: 'Pronosticá', desc: '72 partidos del Mundial' },
              { n: '02', icon: '⏳', title: 'Esperá',     desc: 'Los goles en 90 minutos' },
              { n: '03', icon: '🏆', title: 'Ganá',       desc: 'El que más puntos acumula' },
            ].map(({ n, icon, title, desc }) => (
              <div key={n} className="p-4 text-center">
                <p className="text-[9px] font-black text-gray-300 tracking-widest mb-1">{n}</p>
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-xs font-black text-[#001A4B]">{title}</p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-[11px] text-gray-500">
              Los resultados cuentan en los 90 minutos. No cuentan alargues ni penales.
            </p>
          </div>
        </div>

        {/* ── SISTEMA DE PUNTUACIÓN ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ animation: 'slideUp 0.6s ease-out 0.2s both' }}>
          <div className="bg-[#001A4B] px-4 py-3">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">🎯 Sistema de Puntuación</p>
          </div>
          <div className="divide-y divide-gray-50">
            {SCORING_ROWS.map(({ color, pts, desc }, i) => (
              <div
                key={color}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-25 transition-colors"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span
                  className={`text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0 min-w-[52px] text-center ${POINT_COLORS[color]} glow-card`}
                  style={{ borderWidth: '1.5px', borderColor: `rgba(16, 185, 129, 0.3)` }}
                >
                  {pts}
                </span>
                <p className="text-sm text-gray-600 leading-snug font-medium">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 italic px-4 py-3 border-t border-gray-50 bg-gray-50">
            Regla clave: si no acertás el resultado global (quién ganó o si fue empate) → 0 puntos, sin importar los goles.
          </p>
        </div>

        {/* ── EJEMPLOS PRÁCTICOS ──────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ animation: 'slideUp 0.6s ease-out 0.3s both' }}>
          <div className="bg-[#001A4B] px-4 py-3">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">📊 Ejemplos Prácticos</p>
          </div>
          <div className="divide-y divide-gray-50">
            {KEY_EXAMPLES.map((ex, i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex gap-5">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">Tu pronóstico</p>
                      <p className="font-mono font-bold text-xs text-[#0042A5]">{ex.bet}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5">Resultado real</p>
                      <p className="font-mono font-bold text-xs text-[#001A4B]">{ex.result}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${POINT_COLORS[ex.color]}`}>
                    {ex.pts}{ex.pts !== 1 ? ' pts' : ' pt'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{ex.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONDICIONES IMPORTANTES ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ animation: 'slideUp 0.6s ease-out 0.4s both' }}>
          <div className="bg-[#001A4B] px-4 py-3">
            <p className="text-[10px] font-black text-white uppercase tracking-widest">📌 Condiciones Importantes</p>
          </div>
          <ul className="px-4 py-4 space-y-3">
            {CONDITIONS.map(({ icon, text }, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="shrink-0 text-base leading-tight">{icon}</span>
                <span className="leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── INVITAR A UN AMIGO (CTA principal) ──────────────── */}
        <div
          className="rounded-2xl overflow-hidden shadow-lg glow-card"
          style={{
            background: 'linear-gradient(135deg, #001A4B 0%, #003087 50%, #0042A5 100%)',
            animation: 'slideUp 0.6s ease-out 0.5s both, glow 4s ease-in-out 0.5s infinite',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.2), 0 20px 40px rgba(0, 26, 75, 0.3)'
          }}
        >
          <div className="px-5 pt-5 pb-3">
            <p className="text-[10px] font-black text-[#FFDF00] uppercase tracking-widest mb-2">
              💌 Invitá a tus amigos
            </p>
            <h2 className="text-white font-black text-xl leading-tight">
              Mientras más jueguen,<br />más grande el premio 🏆
            </h2>
            <p className="text-white/60 text-xs mt-2 leading-relaxed">
              Mandales el link a tus amigos por WhatsApp, SMS, email o cualquier app. Cuantos más entren, más se acumula el pozo.
            </p>
          </div>

          <div className="px-4 pb-5 pt-1 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => inviteVia('whatsapp')}
              className="font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ background: '#25D366', color: '#fff', boxShadow: '0 4px 16px rgba(37,211,102,0.35)' }}
            >
              💬 WhatsApp
            </button>
            <button
              onClick={openInviteModal}
              className="font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              ✏️ Personalizar
            </button>
          </div>
        </div>

      </div>

      {/* ── CANAL DE WHATSAPP (at the very bottom) ──────────────── */}
      <div className="px-4 mt-5 mb-28 md:mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#25D366' }}>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">📢 Canal de WhatsApp</span>
          </div>
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <p className="text-sm text-gray-700 font-semibold">
              Sumate al canal <strong>ProdeCaballito</strong> para enterarte de novedades y resultados.
            </p>
            <div className="p-3 bg-white rounded-xl border border-gray-100">
              <LazyQR
                value="https://whatsapp.com/channel/0029VbD5n7oDeON9vGA2gS3j"
                size={192}
                level="M"
                marginSize={0}
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Escaneá el código con la cámara de tu teléfono.
            </p>
            <a
              href="https://whatsapp.com/channel/0029VbD5n7oDeON9vGA2gS3j"
              target="_blank"
              rel="noopener noreferrer"
              className="font-black text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ background: '#25D366', color: '#fff', boxShadow: '0 4px 16px rgba(37,211,102,0.35)' }}
            >
              💬 Unirme al canal
            </a>
          </div>
        </div>
      </div>

      {/* ── NOTIFICACIONES POR WHATSAPP ─────────────────────────── */}
      <div className="px-4 mt-5 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#25D366' }}>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">🔔 Recibir notificaciones</span>
          </div>
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <p className="text-sm text-gray-700 font-semibold">
              Activá las notificaciones para recibir recordatorios de partidos, resultados y ranking directo en tu WhatsApp.
            </p>
            <div className="p-3 bg-white rounded-xl border border-gray-100">
              <LazyQR
                value="https://wa.me/14155238886?text=join%20sheep-edge"
                size={192}
                level="M"
                marginSize={0}
              />
            </div>
            <p className="text-[11px] text-gray-500">
              Escaneá el código con tu cámara para enviar el mensaje de activación.
            </p>
            <a
              href="https://wa.me/14155238886?text=join%20sheep-edge"
              target="_blank"
              rel="noopener noreferrer"
              className="font-black text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ background: '#25D366', color: '#fff', boxShadow: '0 4px 16px rgba(37,211,102,0.35)' }}
            >
              💬 Activar notificaciones
            </a>
          </div>
        </div>
      </div>

      {/* ── AYUDA — 0800 ────────────────────────────────────────── */}
      <div className="px-4 mb-4">
        <a
          href="tel:08003451521"
          className="flex items-center gap-4 bg-[#001A4B] rounded-2xl px-5 py-4 shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
          style={{ color: 'inherit', textDecoration: 'none' }}
          aria-label="Llamar al 0800 3 45 1521"
        >
          <span className="text-3xl leading-none">📞</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#FFDF00' }}>¿Tenés dudas? Llamá gratis</p>
            <p className="text-xl font-black tracking-wide" style={{ color: '#FFFFFF' }}>0800 3 45 1521</p>
          </div>
        </a>
      </div>

      {/* ── STICKY MOBILE BAR ───────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div
          className="flex gap-3 px-4 py-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <Link
            to="/apuestas"
            className="flex-1 font-black text-sm py-3 rounded-xl text-center"
            style={urgentUnbet > 0
              ? { background: '#ef4444', color: '#fff' }
              : { background: '#001A4B', color: '#FFDF00' }
            }
          >
            ⚽ {urgentUnbet > 0 ? `${urgentUnbet} urgentes` : 'Completar prode'}
          </Link>
          <button
            onClick={() => inviteVia('whatsapp')}
            className="flex-1 font-black text-sm py-3 rounded-xl"
            style={{ background: '#25D366', color: '#fff' }}
          >
            💬 Invitar amigo
          </button>
        </div>
      </div>

      {/* ── MODAL INVITAR A UN AMIGO ─────────────────────────── */}
      {showInviteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={() => setShowInviteModal(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto overflow-hidden"
            style={{ animation: 'slideUp 0.25s ease-out' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-5 pt-3 pb-4 text-center">
              <h3 id="invite-title" className="text-xl font-black text-[#001A4B]">
                💌 Invitá a un amigo
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Editá el mensaje y elegí cómo enviarlo
              </p>
            </div>

            <div className="px-5 pb-3">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Mensaje a enviar
              </label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="w-full text-xs text-gray-700 leading-relaxed border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[#0042A5] focus:ring-2 focus:ring-[#0042A5]/20 resize-none"
                rows={7}
                style={{ fontFamily: 'inherit' }}
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                Tip: editá el mensaje para hacerlo más personal
              </p>
            </div>

            <div className="px-5 pb-3">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                Compartir por
              </p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => inviteVia('whatsapp')}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-green-50 hover:border-green-200 active:scale-95 transition-all"
                >
                  <span className="text-2xl leading-none">💬</span>
                  <span className="text-[11px] font-bold text-gray-700">WhatsApp</span>
                </button>
                <button
                  onClick={() => inviteVia('sms')}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 active:scale-95 transition-all"
                >
                  <span className="text-2xl leading-none">📱</span>
                  <span className="text-[11px] font-bold text-gray-700">SMS</span>
                </button>
                <button
                  onClick={() => inviteVia('email')}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-amber-50 hover:border-amber-200 active:scale-95 transition-all"
                >
                  <span className="text-2xl leading-none">📧</span>
                  <span className="text-[11px] font-bold text-gray-700">Email</span>
                </button>
                <button
                  onClick={() => inviteVia('copy')}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-purple-50 hover:border-purple-200 active:scale-95 transition-all"
                >
                  <span className="text-2xl leading-none">📋</span>
                  <span className="text-[11px] font-bold text-gray-700">Copiar</span>
                </button>
              </div>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <div className="px-5 pb-3">
                <button
                  onClick={() => inviteVia('native')}
                  className="w-full text-xs font-semibold text-[#0042A5] py-2 hover:underline"
                >
                  Más opciones de compartir →
                </button>
              </div>
            )}

            <div className="px-5 pb-6 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL iOS INSTALL ───────────────────────────────────── */}
      {showIOSGuide && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setShowIOSGuide(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto p-6 pb-8">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <h3 className="font-bold text-[#001A4B] text-base mb-1">📲 {t.home.installApp}</h3>
            <p className="text-xs text-gray-400 mb-5">{t.home.iosInstallDesc}</p>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0042A5] text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t.home.iosStep1Title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.home.iosStep1Desc}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0042A5] text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t.home.iosStep2Title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.home.iosStep2Desc}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FFDF00] text-[#001A4B] text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{t.home.iosStep3Title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.home.iosStep3Desc}</p>
                </div>
              </li>
            </ol>
            <Button
              variant="dark"
              size="lg"
              fullWidth
              onClick={() => setShowIOSGuide(false)}
              className="mt-6"
            >
              {t.home.iosGotIt}
            </Button>
          </div>
        </>
      )}

    </div>
  )
}

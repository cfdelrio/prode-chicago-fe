import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'

interface PollOption {
  id: number
  label: string
  flag_emoji: string
  flag_code: string
  display_order: number
  vote_count: number
}

interface FeedEntry {
  created_at: string
  option_label: string
  flag_emoji: string
  voter_name: string
}

interface PollData {
  id: number
  slug: string
  title: string
  subtitle: string
  active: boolean
  ended: boolean
  options: PollOption[]
  total_votes: number
  feed?: FeedEntry[]
}

const SLUG = 'mundial-2026'
const POLL_MS = 10_000
const VOTED_KEY = `vhv_${SLUG}`
const SESSION_KEY = 'vhs'

function getSession() {
  let t = localStorage.getItem(SESSION_KEY)
  if (!t) {
    t = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, t)
  }
  return t
}

const COLORS: Record<string, { glow: string; border: string; gradient: string }> = {
  AR: { glow: '#74c3dc', border: '#74c3dc', gradient: 'linear-gradient(90deg,#74c3dc,#ffffff)' },
  BR: { glow: '#009c3b', border: '#009c3b', gradient: 'linear-gradient(90deg,#009c3b,#ffdf00)' },
  FR: { glow: '#0055A4', border: '#0055A4', gradient: 'linear-gradient(90deg,#0055A4,#EF4135)' },
  ES: { glow: '#c41e3a', border: '#c41e3a', gradient: 'linear-gradient(90deg,#c41e3a,#f1bf00)' },
  DE: { glow: '#DD0000', border: '#DD0000', gradient: 'linear-gradient(90deg,#2a2a2a,#DD0000)' },
  EN: { glow: '#C8102E', border: '#C8102E', gradient: 'linear-gradient(90deg,#C8102E,#f5f5f5)' },
  PT: { glow: '#006633', border: '#006633', gradient: 'linear-gradient(90deg,#006633,#FF0000)' },
  XX: { glow: '#7B68EE', border: '#7B68EE', gradient: 'linear-gradient(90deg,#7B68EE,#9B59B6)' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 0) return 'ahora'
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

export function VozHinchada() {
  const navigate = useNavigate()

  const [poll, setPoll] = useState<PollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [voting, setVoting] = useState(false)
  const [myVote] = useState<number | null>(() => {
    const v = localStorage.getItem(VOTED_KEY)
    return v ? parseInt(v, 10) : null
  })
  const [votedId, setVotedId] = useState<number | null>(myVote)
  const [animateBars, setAnimateBars] = useState(false)
  const [secondsSince, setSecondsSince] = useState(0)
  const lastUpdatedRef = useRef(0)
  const hasVoted = votedId !== null

  // Initial fetch
  useEffect(() => {
    const alreadyVoted = localStorage.getItem(VOTED_KEY) !== null
    const endpoint = alreadyVoted
      ? `/public/polls/${SLUG}/results`
      : `/public/polls/${SLUG}`
    api.get(endpoint)
      .then(res => {
        setPoll(res.data.data)
        lastUpdatedRef.current = Date.now()
        if (alreadyVoted) setTimeout(() => setAnimateBars(true), 80)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Poll results every 10s after voting
  useEffect(() => {
    if (!hasVoted) return
    const id = setInterval(() => {
      api.get(`/public/polls/${SLUG}/results`)
        .then(res => {
          setPoll(res.data.data)
          lastUpdatedRef.current = Date.now()
          setSecondsSince(0)
        })
        .catch(() => {})
    }, POLL_MS)
    return () => clearInterval(id)
  }, [hasVoted])

  // Seconds-since ticker
  useEffect(() => {
    const id = setInterval(() => {
      if (lastUpdatedRef.current > 0)
        setSecondsSince(Math.floor((Date.now() - lastUpdatedRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const handleVote = async () => {
    if (!selected || voting || !poll) return
    setVoting(true)
    try {
      await api.post(`/public/polls/${SLUG}/vote`, {
        option_id: selected,
        session_token: getSession(),
      })
    } catch (err: any) {
      if (!err.response?.data?.already_voted) {
        setVoting(false)
        return
      }
    }
    localStorage.setItem(VOTED_KEY, String(selected))
    setVotedId(selected)
    api.get(`/public/polls/${SLUG}/results`)
      .then(res => {
        setPoll(res.data.data)
        lastUpdatedRef.current = Date.now()
        setSecondsSince(0)
        setTimeout(() => setAnimateBars(true), 80)
      })
      .catch(() => setTimeout(() => setAnimateBars(true), 80))
      .finally(() => setVoting(false))
  }

  const leader = poll?.options?.reduce<PollOption | null>(
    (mx, o) => (!mx || o.vote_count > mx.vote_count) ? o : mx, null
  )

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: '#08101f', minHeight: '100vh' }}>
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-5 rounded-full bg-white/8 animate-pulse" />
        </div>
        <div className="h-7 w-3/4 mx-auto rounded-lg bg-white/8 animate-pulse mb-3" />
        <div className="h-4 w-2/5 mx-auto rounded bg-white/5 animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )

  if (!poll) return null

  return (
    <div style={{
      background: 'linear-gradient(160deg,#080e1d 0%,#0c1527 55%,#080e1d 100%)',
      minHeight: '100vh',
      position: 'relative',
    }}>
      {/* Ambient top glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 220,
        background: 'radial-gradient(ellipse 70% 100% at 50% 0%,rgba(0,200,100,0.08) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative max-w-2xl mx-auto px-4 pt-6 pb-12">

        {/* LIVE badge */}
        <div className="flex justify-center mb-4">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-bold text-white/55 uppercase tracking-widest">Live</span>
          </span>
        </div>

        {/* Hero */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center leading-tight mb-2">
          {poll.title}
        </h1>
        <p className="text-center text-sm mb-7" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {poll.total_votes.toLocaleString('es-AR')}{' '}
          {poll.total_votes === 1 ? 'hincha votó' : 'hinchas votaron'}
        </p>

        {/* ── VOTE PHASE ─────────────────────────────────────────────────────── */}
        {!hasVoted ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
              {poll.options.map(opt => {
                const isSel = selected === opt.id
                const col = COLORS[opt.flag_code] ?? COLORS.XX
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelected(isSel ? null : opt.id)}
                    className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-4 px-2 transition-all duration-200 focus:outline-none active:scale-95"
                    style={{
                      background: isSel ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                      borderColor: isSel ? col.border : 'rgba(255,255,255,0.09)',
                      boxShadow: isSel ? `0 0 18px ${col.glow}55,0 0 36px ${col.glow}22` : undefined,
                      transform: isSel ? 'scale(1.05)' : undefined,
                    }}
                  >
                    {isSel && (
                      <span
                        className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 rounded-full text-white"
                        style={{ background: '#22c55e', fontSize: 9, fontWeight: 900 }}
                      >✓</span>
                    )}
                    <span className="text-4xl sm:text-5xl leading-none select-none">{opt.flag_emoji}</span>
                    <span
                      className="text-xs font-semibold text-center leading-tight"
                      style={{ color: isSel ? '#fff' : 'rgba(255,255,255,0.78)' }}
                    >{opt.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleVote}
                disabled={!selected || voting}
                className="px-8 py-3 rounded-xl font-bold text-sm transition-all duration-200 focus:outline-none"
                style={{
                  background: selected && !voting ? '#22c55e' : 'rgba(255,255,255,0.07)',
                  color: selected && !voting ? '#fff' : 'rgba(255,255,255,0.30)',
                  boxShadow: selected && !voting ? '0 4px 20px rgba(34,197,94,0.32)' : undefined,
                  cursor: selected && !voting ? 'pointer' : 'not-allowed',
                  transform: selected && !voting ? undefined : undefined,
                }}
              >
                {voting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                    Registrando voto...
                  </span>
                ) : '⚽ Confirmar voto'}
              </button>
            </div>
          </>
        ) : (
          /* ── RESULTS PHASE ─────────────────────────────────────────────────── */
          <div className="space-y-3">

            {/* Leader card */}
            {leader && (
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: 'linear-gradient(135deg,rgba(251,191,36,0.10) 0%,rgba(0,0,0,0) 100%)',
                  border: '1px solid rgba(251,191,36,0.22)',
                }}
              >
                <div className="text-5xl mb-1.5">{leader.flag_emoji}</div>
                <div className="text-white font-bold text-lg leading-tight">{leader.label}</div>
                <div className="font-semibold text-sm mt-0.5" style={{ color: '#fbbf24' }}>
                  {poll.total_votes > 0
                    ? `${Math.round(leader.vote_count / poll.total_votes * 100)}% de la hinchada`
                    : '–'}
                </div>
              </div>
            )}

            {/* Result bars */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Resultados
                </span>
                <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.22)' }}>
                  actualizado hace {secondsSince}s
                </span>
              </div>

              <div className="space-y-1">
                {[...poll.options]
                  .sort((a, b) => b.vote_count - a.vote_count)
                  .map(opt => {
                    const pct = poll.total_votes > 0
                      ? Math.round(opt.vote_count / poll.total_votes * 100)
                      : 0
                    const isLeader = opt.id === leader?.id
                    const isMyVote = opt.id === votedId
                    const col = COLORS[opt.flag_code] ?? COLORS.XX
                    return (
                      <div
                        key={opt.id}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-2"
                        style={{
                          background: isMyVote
                            ? 'rgba(255,255,255,0.06)'
                            : isLeader ? 'rgba(251,191,36,0.05)' : undefined,
                        }}
                      >
                        <span className="text-xl w-7 text-center flex-shrink-0 leading-none">
                          {opt.flag_emoji}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.80)' }}>
                              {opt.label}
                              {isMyVote && (
                                <span className="ml-1.5 text-[10px] font-normal" style={{ color: '#4ade80' }}>
                                  ✓ tu voto
                                </span>
                              )}
                            </span>
                            <span
                              className="text-xs font-bold ml-2 flex-shrink-0"
                              style={{ color: isLeader ? '#fbbf24' : 'rgba(255,255,255,0.45)' }}
                            >
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: animateBars ? `${pct}%` : '0%',
                                background: col.gradient,
                                transition: 'width 700ms cubic-bezier(0.25,1,0.5,1)',
                              }}
                            />
                          </div>
                        </div>
                        <span
                          className="text-[10px] w-10 text-right flex-shrink-0 tabular-nums"
                          style={{ color: 'rgba(255,255,255,0.28)' }}
                        >
                          {opt.vote_count.toLocaleString('es-AR')}
                        </span>
                      </div>
                    )
                  })}
              </div>

              <div className="mt-3 text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
                {poll.total_votes.toLocaleString('es-AR')} votos en total
              </div>
            </div>

            {/* Activity feed */}
            {poll.feed && poll.feed.length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-2.5"
                  style={{ color: 'rgba(255,255,255,0.32)' }}
                >
                  Actividad reciente
                </div>
                <div className="space-y-1.5" style={{ maxHeight: 140, overflowY: 'auto' }}>
                  {poll.feed.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: 'rgba(255,255,255,0.42)' }}
                    >
                      <span className="text-base leading-none flex-shrink-0">{entry.flag_emoji}</span>
                      <span className="truncate">
                        <span style={{ color: 'rgba(255,255,255,0.68)', fontWeight: 600 }}>
                          {entry.voter_name}
                        </span>
                        {' votó '}
                        <span style={{ color: 'rgba(255,255,255,0.68)' }}>
                          {entry.option_label}
                        </span>
                      </span>
                      <span
                        className="ml-auto flex-shrink-0 text-[10px] tabular-nums"
                        style={{ color: 'rgba(255,255,255,0.22)' }}
                      >
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div
              className="rounded-xl p-5 text-center"
              style={{
                background: 'linear-gradient(135deg,rgba(0,180,100,0.10) 0%,rgba(0,0,0,0) 100%)',
                border: '1px solid rgba(34,197,94,0.18)',
              }}
            >
              <p className="text-white font-bold mb-1 text-sm">
                🔥 Ahora demostrá que realmente sabés de fútbol.
              </p>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.42)' }}>
                Jugá el Prode y competí contra los mejores del barrio.
              </p>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200 focus:outline-none hover:brightness-110 active:scale-95"
                style={{
                  background: '#22c55e',
                  boxShadow: '0 4px 16px rgba(34,197,94,0.28)',
                }}
              >
                ⚽ Jugar el Prode
              </button>
            </div>

            {poll.ended && (
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>
                Esta votación está cerrada
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

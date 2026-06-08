import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'

interface PollOption {
  id: number
  label: string
  flag_emoji: string
  flag_code: string
  vote_count: number
}

interface PollData {
  total_votes: number
  options: PollOption[]
}

const FLAG_COLORS: Record<string, string> = {
  AR: '#74c3dc',
  BR: '#009c3b',
  FR: '#0055A4',
  ES: '#c60b1e',
  DE: '#555555',
  EN: '#003087',
  PT: '#046A38',
  XX: '#888888',
}

export function PollWidget() {
  const [data, setData] = useState<PollData | null>(null)

  useEffect(() => {
    api.get('/public/polls/mundial-2026')
      .then(r => setData(r.data.data))
      .catch(() => {})
  }, [])

  if (!data || !Array.isArray(data.options) || data.options.length === 0) return null

  const sorted = [...data.options]
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, 4)

  return (
    <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: '#0f172a' }}>

      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#1e293b' }}>
        <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">
          🗣️ La voz de la hinchada
        </span>
        <span className="text-[10px] font-semibold text-white/40">
          {data.total_votes.toLocaleString('es-AR')} votos
        </span>
      </div>

      {/* Options */}
      <div className="px-4 pt-3 pb-1 space-y-2.5">
        {sorted.map((opt, i) => {
          const pct = data.total_votes > 0
            ? Math.round((opt.vote_count / data.total_votes) * 100)
            : 0
          const color = FLAG_COLORS[opt.flag_code] ?? '#888'
          return (
            <div key={opt.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white/90 flex items-center gap-1.5">
                  {i === 0 && (
                    <span className="text-yellow-400 text-[10px] font-black leading-none">★</span>
                  )}
                  <span className="text-base leading-none">{opt.flag_emoji}</span>
                  <span className="font-semibold text-sm">{opt.label}</span>
                </span>
                <span className="text-xs font-black tabular-nums" style={{ color }}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease-out' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <Link
        to="/hinchada"
        className="flex items-center justify-center gap-1.5 py-3 text-[11px] font-black uppercase tracking-wider transition-colors"
        style={{ color: 'rgba(255,255,255,0.35)', borderTop: '1px solid rgba(255,255,255,0.07)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
      >
        ¿Y vos? Dejá tu voto →
      </Link>
    </div>
  )
}

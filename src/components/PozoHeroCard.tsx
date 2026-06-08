import { format } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'
import type { RankingEntry } from '@/types'

/* ── Keyframe: barra de progreso animada ─────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('pozo-anim')) {
  const s = document.createElement('style')
  s.id = 'pozo-anim'
  s.textContent = `@keyframes scaleBarIn { from { transform: scaleX(0) } to { transform: scaleX(1) } }`
  document.head.appendChild(s)
}

/* ── Constants ───────────────────────────────────────────────────── */
export const PRICE_PER_PLANILLA = 20_000

/* ── Helpers ─────────────────────────────────────────────────────── */
export function formatMoney(n: number): string {
  return '$' + n.toLocaleString('es-AR')
}

export function calcPozoStats(ranking: RankingEntry[]) {
  const totalPlayers = ranking.length
  const paidPlayers  = ranking.filter(r => r.precio_pagado).length
  const paidPct      = totalPlayers > 0 ? Math.round((paidPlayers / totalPlayers) * 100) : 0
  const recaudado    = paidPlayers * PRICE_PER_PLANILLA
  const pozoTotal    = totalPlayers * PRICE_PER_PLANILLA
  return { totalPlayers, paidPlayers, paidPct, recaudado, pozoTotal }
}

/* ── Props ───────────────────────────────────────────────────────── */
export interface PozoHeroCardProps {
  ranking: RankingEntry[]
  now: Date
}

/* ── Component ───────────────────────────────────────────────────── */
export function PozoHeroCard({ ranking, now }: PozoHeroCardProps) {
  const { totalPlayers, paidPlayers, paidPct, recaudado, pozoTotal } = calcPozoStats(ranking)

  return (
    <div
      className="text-white overflow-hidden relative md:flex-[3]"
      style={{ minHeight: 300, background: 'linear-gradient(135deg, #001f5b 0%, #002f87 100%)' }}
    >
      {/* Textura suave */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 40%, rgba(255,214,0,0.05) 0%, transparent 60%), radial-gradient(circle at 85% 20%, rgba(59,130,246,0.07) 0%, transparent 50%)',
        }}
      />

      <div className="relative px-5 py-6 flex flex-col gap-4" style={{ animation: 'slideUp 0.5s ease-out' }}>

        {/* Badges header */}
        <div className="flex items-center justify-between">
          <div
            style={{
              background: 'rgba(255,214,0,0.12)',
              border: '1px solid rgba(255,214,0,0.35)',
              borderRadius: 99,
              padding: '5px 14px',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FFD600', letterSpacing: '0.06em' }}>
              🔥 EL PREMIO CRECE
            </span>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 99,
              padding: '5px 12px',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
              👥 PRODE 2026
            </span>
          </div>
        </div>

        {/* Título */}
        <div>
          <h1
            className="font-black text-white leading-none"
            style={{
              fontSize: 'clamp(28px, 6vw, 44px)',
              fontFamily: "'Arial Black', Arial, sans-serif",
              lineHeight: 0.95,
            }}
          >
            EL PREMIO<br />
            <span style={{ color: '#FFD600' }}>ESTA X EXPLOTAR</span>
          </h1>
          <p className="font-semibold text-white text-sm mt-2 leading-snug">
            {paidPlayers} de {totalPlayers} jugadores ya están adentro.
          </p>
          <p className="text-xs mt-1 leading-snug" style={{ color: 'rgba(255,255,255,0.75)' }}>
            El premio potencial ya alcanza los {formatMoney(pozoTotal)}.
          </p>
          {totalPlayers - paidPlayers > 0 && (
            <p className="text-xs mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Todavía faltan {totalPlayers - paidPlayers} para completar el premio máximo.
            </p>
          )}
        </div>

        {/* Métricas: 1 col en mobile → 3 col en ≥sm */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

          {/* Bloque 1 — Jugadores pagaron */}
          <div
            className="transition-transform hover:scale-[1.02]"
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 12,
              padding: 12,
              animation: 'slideUp 0.5s ease-out 0.1s both',
            }}
          >
            <div className="text-xl mb-1">👥</div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(147,197,253,0.8)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              ¿Cuántos ya pagaron?
            </div>
            <div className="text-2xl font-black text-white" aria-label={`${paidPlayers} jugadores pagaron`}>
              {paidPlayers}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              de {totalPlayers} jugadores
            </div>
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(59,130,246,0.2)' }}>
              <div
                role="progressbar"
                aria-valuenow={paidPct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1 rounded-full"
                style={{
                  width: `${paidPct}%`,
                  background: '#3b82f6',
                  animation: 'scaleBarIn 1.2s ease-out 0.6s both',
                  transformOrigin: 'left',
                }}
              />
            </div>
            <div style={{ fontSize: 9, color: 'rgba(147,197,253,0.6)', marginTop: 3 }}>{paidPct}%</div>
          </div>

          {/* Bloque 2 — Recaudado */}
          <div
            className="transition-transform hover:scale-[1.02]"
            style={{
              background: 'rgba(34,197,94,0.10)',
              border: '1px solid rgba(34,197,94,0.22)',
              borderRadius: 12,
              padding: 12,
              animation: 'slideUp 0.5s ease-out 0.2s both',
            }}
          >
            <div className="text-xl mb-1">💰</div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(134,239,172,0.8)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              ¿Cuánto recaudado?
            </div>
            <div
              className="font-black text-white"
              style={{ fontSize: 'clamp(15px, 3vw, 22px)' }}
              aria-label={`Recaudado: ${formatMoney(recaudado)}`}
            >
              {formatMoney(recaudado)}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              de {formatMoney(PRICE_PER_PLANILLA)} c/planilla
            </div>
          </div>

          {/* Bloque 3 — Pozo potencial (más prominente) */}
          <div
            className="transition-transform hover:scale-[1.02]"
            style={{
              background: 'rgba(255,214,0,0.10)',
              border: '1px solid rgba(255,214,0,0.35)',
              borderRadius: 12,
              padding: 12,
              boxShadow: '0 0 24px rgba(255,214,0,0.12)',
              animation: 'slideUp 0.5s ease-out 0.3s both',
            }}
          >
            <div className="text-xl mb-1">🏆</div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'rgba(253,224,71,0.8)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 4,
              }}
            >
              Pozo si todos pagan
            </div>
            <div
              className="font-black"
              style={{ color: '#FFD600', fontSize: 'clamp(15px, 3vw, 22px)' }}
              aria-label={`Pozo potencial: ${formatMoney(pozoTotal)}`}
            >
              {formatMoney(pozoTotal)}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              si pagan los {totalPlayers} anotados
            </div>
          </div>
        </div>

        {/* Fecha */}
        <p className="text-white/25 text-[10px] tracking-wider font-semibold uppercase">
          {format(now, 'EEEE, d MMM yyyy', { locale: esLocale })}
        </p>
      </div>
    </div>
  )
}

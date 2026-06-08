import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'

interface IncompleteProdeHeroProps {
  totalUnbet: number
  urgentUnbet: number
  now: Date
  userName?: string
}

export function IncompleteProdeHero({ totalUnbet, urgentUnbet, now, userName }: IncompleteProdeHeroProps) {
  const firstName = userName?.split(' ')[0] || 'jugador'

  return (
    <div
      className="text-white overflow-hidden relative md:flex-[3]"
      style={{ minHeight: 300, background: 'linear-gradient(135deg, #1a0a00 0%, #3d1500 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 40%, rgba(255,100,0,0.08) 0%, transparent 60%), radial-gradient(circle at 85% 20%, rgba(255,50,0,0.05) 0%, transparent 50%)',
        }}
      />

      <div className="relative px-5 py-6 flex flex-col gap-4">

        {/* Badges */}
        <div className="flex items-center justify-between">
          <div
            style={{
              background: 'rgba(255,100,0,0.15)',
              border: '1px solid rgba(255,100,0,0.4)',
              borderRadius: 99,
              padding: '5px 14px',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FF6400', letterSpacing: '0.06em' }}>
              ⚡ ACCIÓN REQUERIDA
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
            TU PRODE<br />
            <span style={{ color: '#FF6400' }}>INCOMPLETO</span>
          </h1>
          <p className="text-white/60 text-xs mt-2">
            {format(now, "EEEE, d MMM yyyy", { locale: esLocale })}
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold text-white text-sm leading-snug">
            Hola {firstName}, te{' '}
            {totalUnbet === 1 ? 'falta 1 pronóstico' : `faltan ${totalUnbet} pronósticos`} por completar.
          </p>
          {urgentUnbet > 0 && (
            <p className="text-xs font-bold" style={{ color: '#FF6400' }}>
              ⚠️ {urgentUnbet === 1 ? '1 partido cierra' : `${urgentUnbet} partidos cierran`} en menos de 6 horas.
            </p>
          )}
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Los partidos sin pronóstico suman 0 puntos.
          </p>
        </div>

        {/* CTA */}
        <Link
          to="/apuestas"
          className="inline-flex items-center gap-2 font-black text-sm px-5 py-3 rounded-xl w-fit transition-all hover:brightness-110 active:scale-95 hover:scale-105"
          style={{
            background: urgentUnbet > 0 ? '#ef4444' : '#FF6400',
            color: '#fff',
            boxShadow: urgentUnbet > 0
              ? '0 4px 16px rgba(239,68,68,0.4)'
              : '0 4px 16px rgba(255,100,0,0.4)',
          }}
        >
          ⚽ Completar mi prode →
        </Link>

      </div>
    </div>
  )
}

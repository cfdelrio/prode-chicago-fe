import { useEffect, useState } from 'react'
import { POINT_COLORS } from '@/utils/scoring'
import { Link } from 'react-router-dom'
import { LazyQR } from '@/components/ui/LazyQR'
import { useAuthStore } from '@/store/authStore'
import { InviteFriendCTA } from '@/components/InviteFriendCTA'
import { ComunidadCard } from '@/components/ComunidadCard'
import { api } from '@/api/client'

const examples = [
  {
    num: 1,
    bet: 'ARG 2 - JOR 1', result: 'ARG 1 - JOR 0',
    pts: 1, color: 'amarillo' as const,
    explain: 'Acierta el resultado global (ganador Argentina), pero ninguno de los 2 tanteadores.',
  },
  {
    num: 2,
    bet: 'ARG 2 - JOR 0', result: 'ARG 1 - JOR 0',
    pts: 2, color: 'verde' as const,
    explain: 'Acierta el resultado global (ganador Argentina) y un tanteador exacto (Jordania 0).',
  },
  {
    num: 3,
    bet: 'ARG 2 - JOR 1', result: 'ARG 2 - JOR 0',
    pts: 2, color: 'verde' as const,
    explain: 'Acierta el resultado global (ganador Argentina) y un tanteador exacto (Argentina 2).',
  },
  {
    num: 4,
    bet: 'ARG 2 - JOR 1', result: 'ARG 2 - JOR 1',
    pts: 3, color: 'rojo' as const,
    explain: 'Acierta el resultado global (ganador Argentina) y ambos tanteadores exactos.',
  },
  {
    num: 5,
    bet: 'ARG 2 - JOR 1', result: 'ARG 0 - JOR 1',
    pts: 0, color: 'gris' as const,
    explain: 'No acierta el resultado global (ganó Jordania), a pesar de haber acertado el tanteador de Jordania.',
  },
  {
    num: 6,
    bet: 'ARG 1 - JOR 1', result: 'ARG 1 - JOR 1',
    pts: 3, color: 'rojo' as const,
    explain: 'Acierta el resultado global (empate) y ambos tanteadores exactos.',
  },
  {
    num: 7,
    bet: 'ARG 1 - JOR 1', result: 'ARG 0 - JOR 0',
    pts: 1, color: 'amarillo' as const,
    explain: 'Acierta el resultado global (empate) pero ninguno de los 2 tanteadores.',
  },
  {
    num: 8,
    bet: 'ARG 3 - JOR 2', result: 'ARG 3 - JOR 2',
    pts: 4, color: 'celeste' as const,
    explain: 'BONUS: resultado exacto con 5 goles en total (≥ 4 goles). Se suma 1 punto extra.',
  },
]

export function Reglamento({ showHomePromo = false }: { showHomePromo?: boolean } = {}) {
  const { token } = useAuthStore()
  const [totalUsers, setTotalUsers] = useState<number | null>(null)

  useEffect(() => {
    api.get('/users/stats')
      .then(r => setTotalUsers(r.data.data.total_users - 1))
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-20">

      {/* Header */}
      <div className="bg-[#001A4B] text-white rounded-2xl p-5 text-center space-y-1">
        <p className="text-xs font-semibold tracking-widest text-[#FFDF00] uppercase">Después de 4 años</p>
        <h1 className="text-xl font-black">⚽ Vuelve el PRODE del MUNDIAL ⚽</h1>
        <p className="text-sm text-white/70">Instructivo oficial — leelo antes de arrancar</p>
      </div>

      {/* Contador de jugadores */}
      <ComunidadCard count={totalUsers} />

      {/* Invitar amigo — CTA principal */}
      <InviteFriendCTA />

      {/* Intro */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          El prode consiste en ponerle un <strong>resultado exacto a cada uno de los 72 partidos</strong> de la fase de clasificación del Mundial.
        </p>
        <p>
          Una vez completados los resultados de todos los partidos, se debe <strong>abonar antes de que comience el primer partido</strong>. A medida que se conozcan los resultados finales de cada partido — <em>dentro de los 90 minutos</em> (no cuentan alargues ni penales) — se sumarán los puntos.
        </p>
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          💡 Para completar resultados usá el formato <strong>2-0</strong> (sin espacios).
        </p>
      </div>

      {/* Precios y oferta */}
      <div
        className="rounded-2xl overflow-hidden shadow-md border"
        style={{ background: 'linear-gradient(135deg, #FFF8DC 0%, #FFFBEB 100%)', borderColor: '#FFDF00' }}
      >
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#001A4B' }}>
          <h2 className="text-xs font-black text-white uppercase tracking-widest">🎫 Precio</h2>
        </div>
        <div className="p-4 text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">1 boleta</p>
          <p className="text-2xl font-black text-[#001A4B] leading-none">$20.000</p>
          <p className="text-[10px] text-gray-500 mt-1.5">Una planilla del Mundial</p>
        </div>
      </div>

      {/* Sistema de puntaje */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Sistema de Puntuación</h2>
        <div className="space-y-2">
          {([
            { color: 'celeste' as const, pts: '4 pts', desc: 'Resultado exacto + ambos goles exactos + 4 o más goles en total (BONUS)' },
            { color: 'rojo'    as const, pts: '3 pts', desc: 'Resultado exacto: acertó ganador/empate y ambos tanteadores' },
            { color: 'verde'   as const, pts: '2 pts', desc: 'Acertó el ganador y uno de los dos tanteadores exactos (no aplica en empate)' },
            { color: 'amarillo'as const, pts: '1 pt',  desc: 'Acertó solo el ganador o empate (ningún tanteador exacto)' },
            { color: 'gris'    as const, pts: '0 pts', desc: 'No acertó el resultado global (ganador o empate)' },
          ]).map(({ color, pts, desc }) => (
            <div key={color} className="flex items-start gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${POINT_COLORS[color]}`}>{pts}</span>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 pt-1 border-t border-gray-50">
          El resultado global es: quién ganó o si hubo empate. Sin importar los goles, si no acertás el resultado global sumás 0.
        </p>
      </div>

      {/* Ejemplos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-[#001A4B] text-base">Ejemplos Prácticos</h2>
        <div className="space-y-3">
          {examples.map((e) => (
            <div key={e.num} className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-gray-500">Ejemplo {e.num}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${POINT_COLORS[e.color]}`}>
                  {e.pts === 4 ? '4 pts 🎯' : `${e.pts} pt${e.pts !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="px-3 py-2.5 space-y-1.5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Pronóstico</span>
                    <p className="font-mono font-bold text-[#0042A5]">{e.bet}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Resultado real</span>
                    <p className="font-mono font-bold text-[#001A4B]">{e.result}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{e.explain}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Precio y formato */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Participación</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="shrink-0">🎫</span><span>Cada planilla tiene un valor de <strong>$20.000</strong>.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">📋</span><span>Podés participar con <strong>la cantidad de planillas que quieras</strong>, cada una compite por separado.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">💰</span><span>El total acumulado va para <strong>un único ganador</strong> (el que sume más puntos).</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">🔒</span><span>El cierre de pronósticos es <strong>5 minutos antes del inicio del primer partido</strong>. A partir de ese momento no se pueden agregar planillas nuevas ni modificar pronósticos.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">👁️</span><span>Al cierre, la <strong>planilla general</strong> queda visible para todos — podés ver los pronósticos de todos los participantes.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">⏰</span><span>El pago debe realizarse antes del inicio del primer partido.</span></li>
        </ul>
      </div>

      {/* Criterios de desempate */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
        <h2 className="font-bold text-[#001A4B] text-base">Criterios de Desempate</h2>
        <p className="text-xs text-gray-500">Solo habrá un ganador. En caso de empate se aplican estos criterios en orden:</p>
        <ol className="space-y-2">
          {[
            { label: 'Mayor cantidad de', badge: 'celeste' as const, suffix: '(4 pts)' },
            { label: 'Mayor cantidad de', badge: 'rojo'    as const, suffix: '(3 pts)' },
            { label: 'Mayor cantidad de', badge: 'verde'   as const, suffix: '(2 pts)' },
            { label: 'Mayor cantidad de', badge: 'amarillo'as const, suffix: '(1 pt)'  },
          ].map(({ label, badge, suffix }, i) => (
            <li key={badge} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-5 h-5 rounded-full bg-[#001A4B] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              {label} <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${POINT_COLORS[badge]}`}>{badge}</span> {suffix}
            </li>
          ))}
          <li className="flex items-start gap-2 text-xs text-gray-400 mt-1">
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
            Si persiste el empate: gana quien haya obtenido primero un puntaje de color celeste, rojo, verde o amarillo (en ese orden).
          </li>
        </ol>
      </div>

      {/* Reglas generales */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-2">
        <h2 className="font-bold text-[#001A4B] text-base">Reglas Generales</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="shrink-0">✅</span><span>Los resultados cuentan en los <strong>90 minutos</strong>. No cuentan alargues ni penales.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">✅</span><span>Podés editar tus pronósticos hasta el cierre: <strong>5 minutos antes del inicio del primer partido</strong>.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">✅</span><span>Solo participan en el ranking oficial las planillas con <strong>precio pagado</strong>.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">✅</span><span>El ranking se actualiza automáticamente al publicar cada resultado.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">📊</span><span>La app tiene estadísticas, podios, campeonatos de amigos por estrellas y más.</span></li>
          <li className="flex items-start gap-2"><span className="shrink-0">💬</span><span>Ante cualquier duda, comunicate por WhatsApp.</span></li>
        </ul>
      </div>

      <p className="text-center text-sm text-gray-400 pb-2">¡Buena suerte a todos! 🏆</p>

      {!token && (
        <div className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] rounded-2xl p-6 text-center space-y-4 mt-6">
          <h2 className="text-white font-bold text-lg">¿Listo para jugar?</h2>
          <p className="text-white/80 text-sm">Creá tu cuenta o inicia sesión para empezar a hacer pronósticos.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              className="bg-[#FFDF00] text-[#001A4B] font-bold py-3 px-8 rounded-xl hover:bg-yellow-300 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className="bg-white text-[#001A4B] font-bold py-3 px-8 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Crear Cuenta
            </Link>
          </div>
        </div>
      )}

      {showHomePromo && (
        <a
          href="/login"
          className="block rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          aria-label="Jugar ahora"
        >
          <img
            src="/promo-jugar.png"
            alt="¿Te la bancás? Jugá desde $25 — Jugar ahora"
            className="w-full h-auto block"
            loading="lazy"
          />
        </a>
      )}

      {/* Ayuda — 0800 */}
      <a
        href="tel:08003451521"
        className="flex items-center gap-4 bg-[#001A4B] rounded-2xl px-5 py-4 shadow-md hover:brightness-110 active:scale-[0.98] transition-all no-underline"
        style={{ color: 'inherit', textDecoration: 'none' }}
        aria-label="Llamar al 0800 3 45 1521"
      >
        <span className="text-3xl leading-none">📞</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#FFDF00' }}>¿Tenés dudas? Llamá gratis</p>
          <p className="text-xl font-black tracking-wide" style={{ color: '#FFFFFF' }}>0800 3 45 1521</p>
        </div>
      </a>

      {/* Notificaciones por WhatsApp (Twilio sandbox) */}
      <div data-testid="whatsapp-notif" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#128C7E' }}>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">🔔 Recibí notificaciones por WhatsApp</span>
        </div>
        <div className="p-5 flex flex-col items-center text-center gap-3">
          <p className="text-sm text-gray-700 font-semibold">
            Escaneá el QR con WhatsApp para recibir avisos de partidos, resultados y novedades directo en tu teléfono.
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
            Se abrirá WhatsApp listo para enviar el mensaje de activación.
          </p>
          <a
            href="https://wa.me/14155238886?text=join%20sheep-edge"
            target="_blank"
            rel="noopener noreferrer"
            className="font-black text-sm py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-[0.98]"
            style={{ background: '#128C7E', color: '#fff', boxShadow: '0 4px 16px rgba(18,140,126,0.35)' }}
          >
            💬 Activar notificaciones
          </a>
        </div>
      </div>

      {/* Canal de WhatsApp — siempre al final */}
      <div data-testid="whatsapp-canal" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
  )
}

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const STORAGE_KEY = 'push_prompt_snoozed_until'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isSnoozed(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    return !!val && Date.now() < parseInt(val, 10)
  } catch { return false }
}

function snooze() {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now() + SNOOZE_MS)) } catch {}
}

type Status = 'idle' | 'requesting' | 'granted' | 'denied'

export function PushPromptModal({ delayMs = 30_000 }: { delayMs?: number }) {
  const { user } = useAuthStore()
  const { state, subscribe, loading } = usePushNotifications()
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!user) return
    if (state !== 'unsubscribed') return
    if (!('Notification' in window) || Notification.permission !== 'default') return
    if (isSnoozed()) return

    const timer = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(timer)
  }, [user, state, delayMs])

  const handleAccept = async () => {
    setStatus('requesting')
    await subscribe()
    const granted = Notification.permission === 'granted'
    setStatus(granted ? 'granted' : 'denied')
    setTimeout(() => setVisible(false), 1800)
  }

  const handleDismiss = () => {
    snooze()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={status === 'idle' ? handleDismiss : undefined}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5 shadow-2xl"
        style={{ background: '#FFDF00' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ border: '2.5px solid rgba(0,26,75,0.3)', background: 'rgba(0,26,75,0.08)' }}
          >
            <span className="text-3xl">🔔</span>
          </div>
        </div>

        {/* Copy */}
        {status === 'idle' || status === 'requesting' ? (
          <p className="text-center font-bold text-[#001A4B] text-[17px] leading-snug">
            ¿Te gustaría que enviemos una notificación para avisarte de partidos y últimas novedades?
          </p>
        ) : status === 'granted' ? (
          <p className="text-center font-bold text-[#001A4B] text-lg">
            ¡Listo! Vas a recibir las notificaciones. 🎉
          </p>
        ) : (
          <p className="text-center font-bold text-[#001A4B] text-base">
            Podés activarlas cuando quieras desde tu perfil.
          </p>
        )}

        {/* Buttons */}
        {status === 'idle' && (
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all hover:bg-black/10 active:scale-[0.97]"
              style={{ border: '2px solid rgba(0,26,75,0.35)', color: '#001A4B' }}
            >
              Ahora no
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
              style={{ background: '#001A4B', color: '#FFDF00' }}
            >
              ¡Sí, gracias!
            </button>
          </div>
        )}

        {status === 'requesting' && (
          <p className="text-center text-[#001A4B]/70 text-sm font-semibold animate-pulse">
            Activando...
          </p>
        )}
      </div>
    </div>
  )
}

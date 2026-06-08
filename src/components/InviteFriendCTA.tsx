import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

/* ── Animaciones (inyectadas una sola vez) ─────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('invite-cta-anim')) {
  const s = document.createElement('style')
  s.id = 'invite-cta-anim'
  s.textContent = `
    @keyframes inviteSlideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
  `
  document.head.appendChild(s)
}

/* ── Mensaje de invitación ─────────────────────────────────── */
export function buildInviteMessage(inviterName?: string): string {
  if (inviterName) {
    return `⚽ ¡Te invito al PRODE del Mundial 2026!\n\nSoy ${inviterName} y te quiero desafiar. Armá tus resultados, sumá puntos y jugá contra todos en el ranking.\n\n🎫 1 boleta $20.000\n\nEntrá acá:\nhttps://prodecaballito.com`
  }
  return `⚽ ¡Sumate al PRODE del Mundial 2026!\n\nArmá tus resultados, competí en el ranking y jugá contra todos.\n\n🎫 1 boleta $20.000\n\nEntrá acá:\nhttps://prodecaballito.com`
}

type Channel = 'whatsapp' | 'sms' | 'email' | 'copy' | 'native'

/* ── Hook con la lógica de compartir ───────────────────────── */
export function useInviteFriend() {
  const { user } = useAuthStore()
  const { show: showToast } = useToastStore()
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState('')

  const openModal = () => {
    const inviterName = user?.nombre?.split(' ')[0]
    setMessage(buildInviteMessage(inviterName))
    setShowModal(true)
  }

  const inviteVia = (channel: Channel) => {
    const text = message || buildInviteMessage(user?.nombre?.split(' ')[0])
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

  return { showModal, setShowModal, message, setMessage, openModal, inviteVia }
}

/* ── Modal multi-canal ─────────────────────────────────────── */
export function InviteFriendModal({
  show, onClose, message, onMessageChange, onInvite,
}: {
  show: boolean
  onClose: () => void
  message: string
  onMessageChange: (m: string) => void
  onInvite: (channel: Channel) => void
}) {
  if (!show) return null
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto overflow-hidden"
        style={{ animation: 'inviteSlideUp 0.25s ease-out' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-cta-title"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pt-3 pb-4 text-center">
          <h3 id="invite-cta-title" className="text-xl font-black text-[#001A4B]">💌 Invitá a un amigo</h3>
          <p className="text-xs text-gray-500 mt-1">Editá el mensaje y elegí cómo enviarlo</p>
        </div>

        <div className="px-5 pb-3">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
            Mensaje a enviar
          </label>
          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            className="w-full text-xs text-gray-700 leading-relaxed border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-[#0042A5] focus:ring-2 focus:ring-[#0042A5]/20 resize-none"
            rows={7}
            style={{ fontFamily: 'inherit' }}
          />
          <p className="text-[10px] text-gray-400 mt-1.5">Tip: editá el mensaje para hacerlo más personal</p>
        </div>

        <div className="px-5 pb-3">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Compartir por</p>
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => onInvite('whatsapp')} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-green-50 hover:border-green-200 active:scale-95 transition-all">
              <span className="text-2xl leading-none">💬</span>
              <span className="text-[11px] font-bold text-gray-700">WhatsApp</span>
            </button>
            <button onClick={() => onInvite('sms')} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 active:scale-95 transition-all">
              <span className="text-2xl leading-none">📱</span>
              <span className="text-[11px] font-bold text-gray-700">SMS</span>
            </button>
            <button onClick={() => onInvite('email')} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-amber-50 hover:border-amber-200 active:scale-95 transition-all">
              <span className="text-2xl leading-none">📧</span>
              <span className="text-[11px] font-bold text-gray-700">Email</span>
            </button>
            <button onClick={() => onInvite('copy')} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-purple-50 hover:border-purple-200 active:scale-95 transition-all">
              <span className="text-2xl leading-none">📋</span>
              <span className="text-[11px] font-bold text-gray-700">Copiar</span>
            </button>
          </div>
        </div>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <div className="px-5 pb-3">
            <button onClick={() => onInvite('native')} className="w-full text-xs font-semibold text-[#0042A5] py-2 hover:underline">
              Más opciones de compartir →
            </button>
          </div>
        )}

        <div className="px-5 pb-6 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl text-sm hover:bg-gray-200 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Card visual completa (CTA principal) ──────────────────── */
export function InviteFriendCTA({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { showModal, setShowModal, message, setMessage, openModal, inviteVia } = useInviteFriend()

  if (variant === 'compact') {
    return (
      <>
        <div className="flex gap-2.5 rounded-2xl p-3.5 shadow-sm border" style={{ background: 'linear-gradient(135deg, #001A4B 0%, #003087 100%)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-[#FFDF00] uppercase tracking-widest leading-tight">💌 Invitá a un amigo</p>
            <p className="text-white/70 text-[11px] mt-0.5 leading-tight">Más jugadores = pozo más grande 🏆</p>
          </div>
          <button
            onClick={() => inviteVia('whatsapp')}
            className="font-black text-xs px-3 rounded-lg flex items-center gap-1.5 shrink-0 transition-all hover:brightness-105 active:scale-95"
            style={{ background: '#25D366', color: '#fff' }}
          >
            💬 WhatsApp
          </button>
        </div>
        <InviteFriendModal
          show={showModal}
          onClose={() => setShowModal(false)}
          message={message}
          onMessageChange={setMessage}
          onInvite={inviteVia}
        />
      </>
    )
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #001A4B 0%, #003087 50%, #0042A5 100%)' }}>
        <div className="px-5 pt-5 pb-3">
          <p className="text-[10px] font-black text-[#FFDF00] uppercase tracking-widest mb-2">💌 Invitá a tus amigos</p>
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
            onClick={openModal}
            className="font-black text-sm py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            ✏️ Personalizar
          </button>
        </div>
      </div>

      <InviteFriendModal
        show={showModal}
        onClose={() => setShowModal(false)}
        message={message}
        onMessageChange={setMessage}
        onInvite={inviteVia}
      />
    </>
  )
}

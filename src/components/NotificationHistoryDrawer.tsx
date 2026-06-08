import { useState } from 'react'
import { useNotificationHistory, type Notification } from '@/hooks/useNotificationHistory'
import { format } from 'date-fns'
import { es as esLocale } from 'date-fns/locale'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const ICON_MAP: Record<string, string> = {
  reminder: '⏰',
  cutoff_reminder: '⏰',
  bet_reminder: '⚽',
  result: '⚽',
  ranking: '🔥',
  ranking_change: '📊',
  ranking_passed: '👊',
  near_podio: '🎯',
  kickoff: '🟢',
  second_half: '⏱️',
  matchday_summary: '🏁',
  personal_record: '🔥',
  streak_exactos: '⭐',
  tournament_tomorrow: '🏁',
  payment_pending: '💸',
  match_rescheduled: '📅',
  message: '💬',
  winner: '👑',
}

function NotificationItem({ notif, onMarkAsRead, onDelete }: {
  notif: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const isUnread = notif.status === 'sent'
  const icon = ICON_MAP[notif.type] || '🔔'
  const title = notif.payload?.title || notif.payload?.titulo || 'Notificación'
  const body = notif.payload?.body || notif.payload?.mensaje || ''
  const rawDate = notif.sent_at || notif.created_at
  const parsed = rawDate ? new Date(rawDate) : null
  const timeStr = parsed && !isNaN(parsed.getTime())
    ? format(parsed, 'dd MMM HH:mm', { locale: esLocale })
    : ''

  return (
    <div
      className={`flex gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
        isUnread ? 'bg-blue-50' : ''
      }`}
      onClick={() => isUnread && onMarkAsRead(notif.id)}
    >
      <div className="text-2xl shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-sm font-semibold text-gray-900 ${isUnread ? 'font-black' : ''}`}>
            {title}
          </h4>
          {isUnread && (
            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
          )}
        </div>
        {body && (
          <p className="text-xs text-gray-600 leading-relaxed mt-0.5">
            {body}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-400">{timeStr}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(notif.id) }}
            className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
          >
            ✕ Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

export function NotificationHistoryDrawer({ isOpen, onClose }: Props) {
  const { notifications, loading, unreadCount, markAsRead, deleteNotification, refresh } =
    useNotificationHistory()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filtered = filter === 'unread'
    ? notifications.filter(n => n.status === 'sent')
    : notifications

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-black text-[#001A4B]">🔔 Notificaciones</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-600 mt-0.5">
                {unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-[#001A4B] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              filter === 'unread'
                ? 'bg-[#001A4B] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            No leídas ({unreadCount})
          </button>
          <button
            onClick={refresh}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all ml-auto"
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-full text-gray-500">
              Cargando notificaciones...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm font-semibold text-gray-700">
                {filter === 'unread' ? 'Sin notificaciones nuevas' : 'Sin notificaciones'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filter === 'unread'
                  ? 'TA todo bajo control'
                  : 'Las notificaciones aparecerán aquí'}
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-gray-100">
              {filtered.map(notif => (
                <NotificationItem
                  key={notif.id}
                  notif={notif}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

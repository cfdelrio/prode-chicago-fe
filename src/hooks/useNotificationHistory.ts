import { useState, useEffect } from 'react'
import { api } from '@/api/client'

export interface Notification {
  id: string
  type: 'reminder' | 'cutoff_reminder' | 'bet_reminder' | 'result' | 'ranking'
    | 'ranking_change' | 'ranking_passed' | 'near_podio'
    | 'kickoff' | 'second_half'
    | 'matchday_summary' | 'personal_record' | 'streak_exactos'
    | 'tournament_tomorrow' | 'payment_pending' | 'match_rescheduled'
    | 'message' | 'winner' | string
  payload: {
    title?: string
    body?: string
    titulo?: string
    mensaje?: string
    icon?: string
    matchId?: string
    data?: Record<string, any>
  }
  status: 'sent' | 'read' | 'deleted' | 'pending' | 'failed'
  sent_at: string | null
  created_at: string
}

export function useNotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/notifications?limit=20&sort=desc')
      const data = res.data?.data
      const list = Array.isArray(data) ? data : Array.isArray(data?.notifications) ? data.notifications : []
      setNotifications(list)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}`, { status: 'read' })
      setNotifications(notifs =>
        notifs.map(n => n.id === id ? { ...n, status: 'read' } : n)
      )
    } catch (err) {
      console.error('Error marcando como leído', err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(notifs => notifs.filter(n => n.id !== id))
    } catch (err) {
      console.error('Error eliminando notificación', err)
    }
  }

  const unreadCount = notifications.filter(n => n.status === 'sent').length

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    deleteNotification,
    refresh: fetchNotifications,
  }
}

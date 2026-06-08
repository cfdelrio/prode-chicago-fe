import { useEffect, useMemo, useState } from 'react'
import { api } from '@/api/client'

interface EngageStatus {
  engage_enabled: boolean
  api_url_configured: boolean
  api_key_configured: boolean
  api_url?: string
  users?: { total?: number } | { error: string }
}

interface RecentNotification {
  id: string
  user_id: string
  nombre: string
  email: string
  type: string
  sent_at: string
  status: string
}

interface Delivery {
  channel?: string
  status?: string
  sentAt?: string
  error?: string
}

export function EngageVerifyPanel() {
  const [status, setStatus] = useState<EngageStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [recent, setRecent] = useState<RecentNotification[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[] | string>>({})
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<Delivery[] | string | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [groupByUser, setGroupByUser] = useState(false)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())

  const loadStatus = async () => {
    setStatusLoading(true)
    try {
      const res = await api.get('/admin/engage-verify/status')
      setStatus(res.data?.data ?? null)
    } catch {
      setStatus(null)
    } finally {
      setStatusLoading(false)
    }
  }

  const loadRecent = async () => {
    setRecentLoading(true)
    try {
      const res = await api.get('/admin/engage-verify/recent?limit=20')
      setRecent(res.data?.data ?? [])
    } catch {
      setRecent([])
    } finally {
      setRecentLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    loadRecent()
    const id = setInterval(loadRecent, 10000)
    return () => clearInterval(id)
  }, [])

  const toggleUserDeliveries = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(userId)
    if (deliveries[userId]) return

    try {
      const res = await api.get(`/admin/engage-verify/user/${userId}`)
      const data = res.data?.data
      setDeliveries(prev => ({ ...prev, [userId]: Array.isArray(data) ? data : [] }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error consultando Engage'
      setDeliveries(prev => ({ ...prev, [userId]: msg }))
    }
  }

  const handleSearch = async () => {
    if (!searchId.trim()) return
    setSearchLoading(true)
    setSearchResult(null)
    try {
      const res = await api.get(`/admin/engage-verify/user/${searchId.trim()}`)
      const data = res.data?.data
      setSearchResult(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'No encontrado en Engage'
      setSearchResult(msg)
    } finally {
      setSearchLoading(false)
    }
  }

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
    catch { return iso }
  }

  const statusColor = (s: string) =>
    s === 'delivered' || s === 'sent' ? 'bg-green-100 text-green-700' :
    s === 'failed' ? 'bg-red-100 text-red-700' :
    'bg-yellow-100 text-yellow-700'

  const grouped = useMemo(() => {
    const map = new Map<string, { nombre: string; email: string; items: RecentNotification[] }>()
    for (const n of recent) {
      if (!map.has(n.user_id)) map.set(n.user_id, { nombre: n.nombre, email: n.email, items: [] })
      map.get(n.user_id)!.items.push(n)
    }
    return map
  }, [recent])

  const toggleGroup = (uid: string) =>
    setExpandedGroupIds(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })

  return (
    <div className="space-y-4">
      {/* Engage connection status */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#001A4B]">🔌 Estado de conexión Engage</h3>
          <button
            onClick={loadStatus}
            disabled={statusLoading}
            className="text-xs text-purple-600 hover:underline disabled:opacity-50"
          >
            {statusLoading ? '...' : 'Refrescar'}
          </button>
        </div>
        {statusLoading ? (
          <p className="text-xs text-gray-400">Consultando...</p>
        ) : status ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.engage_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-700">ENGAGE_ENABLED: <strong>{status.engage_enabled ? 'true' : 'false'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.api_key_configured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-700">API key: <strong>{status.api_key_configured ? 'configurada ✓' : 'falta ✗'}</strong></span>
            </div>
            {status.api_url && (
              <div className="col-span-2 text-gray-400 font-mono truncate">URL: {status.api_url}</div>
            )}
          </div>
        ) : (
          <p className="text-xs text-red-500">No se pudo consultar el estado</p>
        )}
      </div>

      {/* Recent notifications sent by PC */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#001A4B]">📬 Últimas notificaciones enviadas</h3>
            <p className="text-xs text-gray-400 mt-0.5">Refresh 10s · clic en "Ver en Engage" para ver deliveries</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGroupByUser(g => !g)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                groupByUser ? 'bg-[#001A4B] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              👤 Agrupar por usuario
            </button>
            {recentLoading && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
          </div>
        </div>

        {/* Flat view (default) */}
        {!groupByUser && (
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2">Usuario</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Enviado</th>
                  <th className="text-left px-3 py-2">Estado PC</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.length === 0 ? (
                  <tr><td colSpan={5} className="text-center px-3 py-6 text-gray-400">Sin notificaciones recientes.</td></tr>
                ) : recent.map(n => (
                  <>
                    <tr key={n.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{n.nombre}</div>
                        <div className="text-gray-400 text-[10px]">{n.email}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-600">{n.type.replace('prode.', '')}</td>
                      <td className="px-3 py-2 text-gray-500">{fmtDate(n.sent_at)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(n.status)}`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => toggleUserDeliveries(n.user_id)}
                          className="text-purple-600 hover:underline text-xs"
                        >
                          {expandedUserId === n.user_id ? 'Ocultar' : 'Ver en Engage'}
                        </button>
                      </td>
                    </tr>
                    {expandedUserId === n.user_id && (
                      <tr key={`${n.id}-deliveries`} className="bg-purple-50">
                        <td colSpan={5} className="px-4 py-3">
                          <DeliveriesInline data={deliveries[n.user_id]} fmtDate={fmtDate} statusColor={statusColor} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grouped view */}
        {groupByUser && (
          <div className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin notificaciones recientes.</p>
            ) : [...grouped.entries()].map(([uid, { nombre, email, items }]) => (
              <div key={uid} className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(uid)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div>
                    <span className="font-semibold text-sm text-[#001A4B]">👤 {nombre}</span>
                    <span className="text-[10px] text-gray-400 ml-2">{email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#001A4B] text-white px-2 py-0.5 rounded-full font-bold">{items.length}</span>
                    <span className="text-gray-400 text-xs">{expandedGroupIds.has(uid) ? '▲' : '▼'}</span>
                  </div>
                </button>
                {expandedGroupIds.has(uid) && (
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-100">
                      {items.map(n => (
                        <>
                          <tr key={n.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono text-gray-600">{n.type.replace('prode.', '')}</td>
                            <td className="px-2 py-2 text-gray-500">{fmtDate(n.sent_at)}</td>
                            <td className="px-2 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(n.status)}`}>
                                {n.status}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right pr-4">
                              <button
                                onClick={() => toggleUserDeliveries(n.user_id)}
                                className="text-purple-600 hover:underline text-xs"
                              >
                                {expandedUserId === n.user_id ? 'Ocultar' : 'Ver en Engage'}
                              </button>
                            </td>
                          </tr>
                          {expandedUserId === n.user_id && (
                            <tr key={`${n.id}-deliveries`} className="bg-purple-50">
                              <td colSpan={4} className="px-4 py-3">
                                <DeliveriesInline data={deliveries[n.user_id]} fmtDate={fmtDate} statusColor={statusColor} />
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual user lookup */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-[#001A4B]">🔍 Buscar usuario en Engage</h3>
        <div className="flex gap-2">
          <input
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="UUID del usuario"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading || !searchId.trim()}
            className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {searchLoading ? '...' : 'Buscar'}
          </button>
        </div>
        {searchResult !== null && (
          <DeliveriesInline data={searchResult} fmtDate={fmtDate} statusColor={statusColor} />
        )}
      </div>
    </div>
  )
}

function DeliveriesInline({
  data,
  fmtDate,
  statusColor,
}: {
  data: Delivery[] | string | undefined
  fmtDate: (s: string) => string
  statusColor: (s: string) => string
}) {
  if (data === undefined) return <p className="text-xs text-gray-400">Cargando...</p>
  if (typeof data === 'string') return <p className="text-xs text-red-500">{data}</p>
  if (data.length === 0) return <p className="text-xs text-gray-400">Sin deliveries en Engage para este usuario.</p>

  return (
    <table className="w-full text-xs">
      <thead className="text-gray-500">
        <tr>
          <th className="text-left py-1">Canal</th>
          <th className="text-left py-1">Estado Engage</th>
          <th className="text-left py-1">Enviado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-purple-100">
        {data.map((d, i) => (
          <tr key={i}>
            <td className="py-1 font-medium text-gray-700">{d.channel ?? '?'}</td>
            <td className="py-1">
              <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${statusColor(d.status ?? '')}`}>
                {d.status ?? '?'}
              </span>
            </td>
            <td className="py-1 text-gray-500">{d.sentAt ? fmtDate(d.sentAt) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

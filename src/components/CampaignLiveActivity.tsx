import { useEffect, useState } from 'react'
import { api } from '@/api/client'

interface LiveCall {
  user_id?: string
  user_name?: string
  phone?: string
  event_type?: string
  status?: string
  started_at?: string
  duration_sec?: number
}

interface LiveData {
  calls: LiveCall[]
  counters: {
    initiated?: number
    answered?: number
    completed?: number
    failed?: number
  }
}

const EMPTY: LiveData = { calls: [], counters: {} }

export function CampaignLiveActivity() {
  const [data, setData] = useState<LiveData>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const res = await api.get('/admin/voice-campaigns/live')
        if (cancelled) return
        const raw = res?.data?.data ?? {}
        setData({
          calls: Array.isArray(raw.calls) ? raw.calls : [],
          counters: raw.counters ?? {},
        })
        setLastUpdate(new Date())
        setError(null)
      } catch (err: unknown) {
        if (cancelled) return
        const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error consultando Engage'
        setError(msg)
      }
    }
    tick()
    const id = setInterval(tick, 3000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const c = data.counters

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#001A4B]">📡 Live Activity</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Polling 3s · {lastUpdate ? `actualizado ${lastUpdate.toLocaleTimeString('es-AR')}` : '...'}
          </p>
        </div>
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="text-lg font-bold text-blue-700">{c.initiated ?? 0}</div>
          <div className="text-xs text-blue-600">iniciadas</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-2">
          <div className="text-lg font-bold text-yellow-700">{c.answered ?? 0}</div>
          <div className="text-xs text-yellow-600">contestadas</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <div className="text-lg font-bold text-green-700">{c.completed ?? 0}</div>
          <div className="text-xs text-green-600">completadas</div>
        </div>
        <div className="bg-red-50 rounded-lg p-2">
          <div className="text-lg font-bold text-red-700">{c.failed ?? 0}</div>
          <div className="text-xs text-red-600">falladas</div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>
      )}

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-2">Usuario</th>
              <th className="text-left px-3 py-2">Teléfono</th>
              <th className="text-left px-3 py-2">Evento</th>
              <th className="text-left px-3 py-2">Estado</th>
              <th className="text-right px-3 py-2">Dur.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.calls.length === 0 ? (
              <tr><td colSpan={5} className="text-center px-3 py-6 text-gray-400">Sin actividad reciente.</td></tr>
            ) : data.calls.map((call, i) => (
              <tr key={`${call.user_id ?? i}`}>
                <td className="px-3 py-2">{call.user_name ?? call.user_id ?? '?'}</td>
                <td className="px-3 py-2 font-mono text-gray-500">{call.phone ?? '—'}</td>
                <td className="px-3 py-2">{(call.event_type ?? '').replace('prode.voice_', '')}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    call.status === 'completed' ? 'bg-green-100 text-green-700' :
                    call.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{call.status ?? '?'}</span>
                </td>
                <td className="px-3 py-2 text-right text-gray-500">{call.duration_sec ?? 0}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

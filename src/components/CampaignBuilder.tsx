import { useState } from 'react'
import { api } from '@/api/client'
import { useToastStore } from '@/store/toastStore'

type VoiceEventType =
  | 'prode.voice_match_reminder'
  | 'prode.voice_survey_campeon'
  | 'prode.voice_5day_reminder'
  | 'prode.cutoff_reminder'
  | 'prode.broadcast_manual'

interface EventMeta {
  label: string
  emoji: string
  script: string
  endpoint: string
  supportsSkipWindow?: boolean
  bodyField?: string
  reminderType?: string
}

const EVENT_META: Record<VoiceEventType, EventMeta> = {
  'prode.voice_match_reminder': {
    label: 'Match reminder',
    emoji: '📣',
    script: 'En 30 min arranca {home} vs {away} y no cargaste tu resultado. Entrá ya.',
    endpoint: '/admin/voice-match-reminder-trigger',
    supportsSkipWindow: true,
    reminderType: 'voice_match_reminder',
  },
  'prode.voice_5day_reminder': {
    label: 'Voice 5-day reminder',
    emoji: '🔔',
    script: 'Faltan 5 días para que cierre tu planilla. No pierdas tu racha.',
    endpoint: '/admin/voice-5day-trigger',
    reminderType: 'voice_5day_reminder',
  },
  'prode.voice_survey_campeon': {
    label: 'Survey campeón',
    emoji: '🏆',
    script: '¿Quién sale campeón del mundial? Presioná 1 Argentina, 2 Brasil, 3 otro.',
    endpoint: '/admin/voice-campeon-survey',
    reminderType: 'voice_campeon_survey',
  },
  'prode.cutoff_reminder': {
    label: 'Cutoff reminders',
    emoji: '⏰',
    script: 'Quedan pocos minutos para cargar tu pronóstico. ¡Entrá ya!',
    endpoint: '/admin/jobs/cutoff-reminders',
    supportsSkipWindow: true,
    reminderType: 'cutoff_30min',
  },
  'prode.broadcast_manual': {
    label: 'Broadcast WhatsApp',
    emoji: '📢',
    script: 'Mensaje libre a todos los usuarios con WhatsApp consent.',
    endpoint: '/internal/broadcast-whatsapp',
    bodyField: 'message',
  },
}

export function CampaignBuilder() {
  const { show } = useToastStore()
  const [eventType, setEventType] = useState<VoiceEventType>('prode.voice_match_reminder')
  const [userIds, setUserIds] = useState('')
  const [messageText, setMessageText] = useState('')
  const [dryRun, setDryRun] = useState(true)
  const [skipWindow, setSkipWindow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const meta = EVENT_META[eventType]

  const handleReset = async () => {
    if (!meta.reminderType) return
    setResetting(true)
    try {
      const { data } = await api.delete(`/admin/reset-reminder-sent?reminder_type=${meta.reminderType}`)
      const deleted = data?.data?.deleted ?? 0
      show(`Contadores reseteados: ${deleted} registros eliminados (${meta.reminderType})`, 'success')
      setResult(`🔄 Reset: ${deleted} registros eliminados para ${meta.reminderType}`)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al resetear'
      show(msg, 'error')
    } finally {
      setResetting(false)
    }
  }

  const handleFire = async () => {
    setLoading(true)
    setResult(null)
    try {
      const ids = userIds.split(',').map(s => s.trim()).filter(Boolean)
      const body: Record<string, unknown> = { dry_run: dryRun }
      if (ids.length > 0) body.user_ids = ids
      if (skipWindow && meta.supportsSkipWindow) body.skip_window = true
      if (meta.bodyField && messageText.trim()) body[meta.bodyField] = messageText.trim()
      const { data } = await api.post(meta.endpoint, body)
      const resData = data?.data ?? data
      const summary = `${meta.label} ${dryRun ? '[dry-run]' : 'disparado'}:\n${JSON.stringify(resData, null, 2)}`
      setResult(summary)
      show(summary, 'success')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al disparar'
      show(msg, 'error')
      setResult(`❌ ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[#001A4B]">🎙️ Disparo manual</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Solo para campañas ad-hoc (match reminder fuera de ventana, encuestas puntuales).
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          ℹ️ <strong>El testing de eventos se hace en el panel de Engage.</strong> Los eventos
          automáticos (nuevo líder, perfect score, weekly summary, trash talk) se disparan solos
          cuando ocurren en PC — no se prueban desde acá.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Campaña</label>
        <select
          value={eventType}
          onChange={e => setEventType(e.target.value as VoiceEventType)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          {Object.entries(EVENT_META).map(([key, m]) => (
            <option key={key} value={key}>{m.emoji} {m.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-500 mb-1">Script base:</p>
        <p className="text-xs text-gray-700 italic">"{meta.script}"</p>
      </div>

      {meta.bodyField && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje</label>
          <textarea
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            placeholder="Escribí el mensaje a enviar..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">User IDs (opcional, CSV)</label>
        <input
          value={userIds}
          onChange={e => setUserIds(e.target.value)}
          placeholder="vacío = todos los usuarios elegibles"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} className="w-4 h-4" />
          <span>Dry-run (no llama, solo preview)</span>
        </label>

        {meta.supportsSkipWindow && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={skipWindow} onChange={e => setSkipWindow(e.target.checked)} className="w-4 h-4" />
            <span>Ignorar ventana de tiempo (testing)</span>
          </label>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleFire}
          disabled={loading}
          className="bg-purple-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-50 flex-1"
        >
          {loading ? 'Procesando...' : dryRun ? '🔍 Preview' : '📞 Disparar'}
        </button>

        {meta.reminderType && (
          <button
            onClick={handleReset}
            disabled={resetting}
            className="bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-orange-600 disabled:opacity-50"
            title={`Reset contadores de ${meta.reminderType}`}
          >
            {resetting ? '...' : '🔄 Reset'}
          </button>
        )}
      </div>

      {result && (
        <pre className="mt-2 bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs whitespace-pre-wrap break-all">{result}</pre>
      )}
    </div>
  )
}

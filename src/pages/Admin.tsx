import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { api } from '@/api/client'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToastStore } from '@/store/toastStore'
import { useAuthStore } from '@/store/authStore'
import type { Match, Tournament } from '@/types'
import { CampaignBuilder } from '@/components/CampaignBuilder'
import { CampaignLiveActivity } from '@/components/CampaignLiveActivity'
import { EngageVerifyPanel } from '@/components/EngageVerifyPanel'

type Tab = 'partidos' | 'planillas' | 'usuarios' | 'torneos' | 'broadcast' | 'jobs' | 'polls' | 'campanas'

const SUPER_ADMIN_EMAIL = 'cfdelrio@gmail.com'

// Argentina is permanently UTC-3 (no DST since 2000)
const toArgentinaInput = (utcStr: string) => {
  const d = new Date(utcStr)
  const argMs = d.getTime() - 3 * 60 * 60 * 1000
  return new Date(argMs).toISOString().slice(0, 16)
}
const fromArgentinaInput = (local: string) => local ? local + ':00-03:00' : local

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  requireText?: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ open, title, message, requireText, onConfirm, onCancel }: ConfirmModalProps) {
  const [input, setInput] = useState('')
  const canConfirm = !requireText || input === requireText
  useEffect(() => { if (!open) setInput('') }, [open])
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-gray-700 mb-4">{message}</p>
      {requireText && (
        <div className="mb-4">
          <label htmlFor="confirm-text-input" className="block text-xs text-gray-500 mb-1">{`Escribí "${requireText}" para confirmar`}</label>
          <input
            id="confirm-text-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            autoFocus
          />
        </div>
      )}
      <div className="flex gap-2 justify-end mt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg">Cancelar</button>
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40"
        >Confirmar</button>
      </div>
    </Modal>
  )
}

export function Admin() {
  const { show } = useToastStore()
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('partidos')
  const [matches, setMatches] = useState<Match[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [confirmDeleteMatchId, setConfirmDeleteMatchId] = useState<string | null>(null)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [resultMatch, setResultMatch] = useState<Match | null>(null)
  const [matchForm, setMatchForm] = useState({
    home_team: '', away_team: '', start_time: '', tournament_id: '', halftime_minutes: '15',
    sede: '', grupo: '', jornada: '',
  })
  const [resultForm, setResultForm] = useState({ resultado_local: '', resultado_visitante: '' })
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mRes, tRes] = await Promise.allSettled([
        api.get('/matches?limit=200'),
        api.get('/tournaments/admin/all'),
      ])
      if (mRes.status === 'fulfilled') setMatches(mRes.value.data.data.matches || [])
      else show('Error al cargar partidos', 'error')
      if (tRes.status === 'fulfilled') setTournaments(tRes.value.data.data || [])
      else show('Error al cargar torneos', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { ...matchForm, start_time: fromArgentinaInput(matchForm.start_time) }
      if (editMatch) {
        await api.put(`/matches/${editMatch.id}`, payload)
        show('Partido actualizado ✓', 'success')
      } else {
        await api.post('/matches', payload)
        show('Partido creado ✓', 'success')
      }
      setShowMatchModal(false)
      setEditMatch(null)
      loadData()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al guardar'
      show(msg, 'error')
    }
  }

  const handleDeleteMatch = (id: string) => setConfirmDeleteMatchId(id)

  const doDeleteMatch = async () => {
    const id = confirmDeleteMatchId!
    setConfirmDeleteMatchId(null)
    try {
      await api.delete(`/matches/${id}`)
      setMatches(matches.filter(m => m.id !== id))
      show('Partido eliminado', 'info')
    } catch {
      show('Error al eliminar', 'error')
    }
  }

  const handlePublishResult = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resultMatch) return
    try {
      await api.post(`/matches/${resultMatch.id}/result`, {
        resultado_local: parseInt(resultForm.resultado_local),
        resultado_visitante: parseInt(resultForm.resultado_visitante),
      })
      show('Resultado publicado ✓ Ranking actualizado', 'success')
      setShowResultModal(false)
      setResultMatch(null)
      loadData()
    } catch {
      show('Error al publicar resultado', 'error')
    }
  }

  const openEdit = (m: Match) => {
    setEditMatch(m)
    setMatchForm({
      home_team: m.home_team,
      away_team: m.away_team,
      start_time: toArgentinaInput(m.start_time),
      tournament_id: m.tournament_id || '',
      halftime_minutes: String(m.halftime_minutes),
      sede: m.sede || '',
      grupo: m.grupo || '',
      jornada: m.jornada ? String(m.jornada) : '',
    })
    setShowMatchModal(true)
  }

  const openResult = (m: Match) => {
    setResultMatch(m)
    setResultForm({
      resultado_local: String(m.resultado_local ?? ''),
      resultado_visitante: String(m.resultado_visitante ?? ''),
    })
    setShowResultModal(true)
  }

  const openNewMatch = (tournamentId = '') => {
    setEditMatch(null)
    setMatchForm({ home_team: '', away_team: '', start_time: '', tournament_id: tournamentId, halftime_minutes: '15', sede: '', grupo: '', jornada: '' })
    setShowMatchModal(true)
  }

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL

  const tabs: { id: Tab; label: string }[] = [
    { id: 'partidos', label: '⚽ Partidos' },
    { id: 'planillas', label: '📋 Planillas' },
    { id: 'usuarios', label: '👥 Usuarios' },
    { id: 'torneos', label: '🏆 Torneos' },
    { id: 'broadcast',   label: '📣 WhatsApp' },
    { id: 'polls',       label: '🗳️ Polls' },
    ...(isSuperAdmin ? [{ id: 'jobs' as Tab, label: '⚙️ Procesos' }] : []),
    ...(isSuperAdmin ? [{ id: 'campanas' as Tab, label: '📡 Monitor' }] : []),
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-[#001A4B]">⚙️ Administración</h1>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-[#001A4B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Partidos */}
      {tab === 'partidos' && (
        <PartidosTab
          matches={matches}
          tournaments={tournaments}
          loading={loading}
          onNewMatch={openNewMatch}
          onEdit={openEdit}
          onResult={openResult}
          onDelete={handleDeleteMatch}
        />
      )}

      {/* Tab: Torneos */}
      {tab === 'torneos' && <TorneosTab tournaments={tournaments} onRefresh={loadData} />}

      {/* Tab: Planillas y Usuarios */}
      {(tab === 'planillas' || tab === 'usuarios') && <AdminSubTab tab={tab} />}

      {/* Tab: Broadcast WhatsApp */}
      {tab === 'broadcast' && <BroadcastTab />}

      {/* Tab: Procesos manuales */}
      {tab === 'jobs' && <JobsTab />}

      {/* Tab: Polls */}
      {tab === 'polls' && <PollsTab />}

      {/* Tab: Campañas (super-admin only) */}
      {tab === 'campanas' && isSuperAdmin && <CampanasTab />}

      {/* Modal partido */}
      <Modal open={showMatchModal} onClose={() => setShowMatchModal(false)} title={editMatch ? 'Editar Partido' : 'Nuevo Partido'}>
        <form onSubmit={handleSaveMatch} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Equipo Local</label>
              <input value={matchForm.home_team} onChange={(e) => setMatchForm({ ...matchForm, home_team: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Equipo Visitante</label>
              <input value={matchForm.away_team} onChange={(e) => setMatchForm({ ...matchForm, away_team: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📅 Fecha y hora del partido <span className="text-gray-400 font-normal">(hora local Argentina)</span></label>
            <input type="datetime-local" value={matchForm.start_time} onChange={(e) => setMatchForm({ ...matchForm, start_time: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Torneo</label>
              <select value={matchForm.tournament_id} onChange={(e) => setMatchForm({ ...matchForm, tournament_id: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]">
                <option value="">Sin torneo</option>
                {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min. cierre pronóstico</label>
              <input type="number" value={matchForm.halftime_minutes} onChange={(e) => setMatchForm({ ...matchForm, halftime_minutes: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">📍 Sede</label>
            <input value={matchForm.sede} onChange={(e) => setMatchForm({ ...matchForm, sede: e.target.value })}
              placeholder="Ciudad de México" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
              <select value={matchForm.grupo} onChange={(e) => setMatchForm({ ...matchForm, grupo: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]">
                <option value="">—</option>
                {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jornada</label>
              <select value={matchForm.jornada} onChange={(e) => setMatchForm({ ...matchForm, jornada: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]">
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          </div>
          <Button type="submit" fullWidth>
            {editMatch ? 'Actualizar' : 'Crear partido'}
          </Button>
        </form>
      </Modal>

      {/* Modal resultado */}
      <Modal open={showResultModal} onClose={() => setShowResultModal(false)}
        title={`Resultado: ${resultMatch?.home_team} vs ${resultMatch?.away_team}`}>
        <form onSubmit={handlePublishResult} className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{resultMatch?.home_team}</label>
              <input type="number" min={0} value={resultForm.resultado_local}
                onChange={(e) => setResultForm({ ...resultForm, resultado_local: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{resultMatch?.away_team}</label>
              <input type="number" min={0} value={resultForm.resultado_visitante}
                onChange={(e) => setResultForm({ ...resultForm, resultado_visitante: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#0042A5]" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-green-600 text-white font-bold py-2.5 rounded-xl hover:bg-green-700">
            Publicar resultado y actualizar ranking
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmDeleteMatchId}
        title="Eliminar partido"
        message="¿Eliminar este partido? Esta acción no se puede deshacer."
        onConfirm={doDeleteMatch}
        onCancel={() => setConfirmDeleteMatchId(null)}
      />
    </div>
  )
}

/* ── PartidosTab ─────────────────────────────────────────────────────── */
interface PartidosTabProps {
  matches: Match[]
  tournaments: Tournament[]
  loading: boolean
  onNewMatch: (tournamentId: string) => void
  onEdit: (m: Match) => void
  onResult: (m: Match) => void
  onDelete: (id: string) => void
}

function PartidosTab({ matches, tournaments, loading, onNewMatch, onEdit, onResult, onDelete }: PartidosTabProps) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId)
  const filtered = selectedTournamentId
    ? matches.filter(m => m.tournament_id === selectedTournamentId)
    : []

  // Pantalla: selección de torneo
  if (!selectedTournamentId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Seleccioná un torneo para gestionar sus partidos</p>
        {loading ? <Spinner /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tournaments.map(t => {
              const count = matches.filter(m => m.tournament_id === t.id).length
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTournamentId(t.id)}
                  className="bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-[#0042A5] hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#001A4B] group-hover:text-[#0042A5]">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.fase}</p>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                      {count} partidos
                    </span>
                  </div>
                </button>
              )
            })}
            {tournaments.length === 0 && (
              <div className="col-span-2">
                <EmptyState
                  icon="🏆"
                  message="No hay torneos"
                  description="Creá uno en la pestaña Torneos."
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Pantalla: partidos del torneo seleccionado
  return (
    <div className="space-y-3">
      {/* Header con volver */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedTournamentId(null)}
          className="text-sm text-[#0042A5] hover:underline flex items-center gap-1"
        >
          ← Torneos
        </button>
        <span className="text-gray-300">|</span>
        <p className="text-sm font-semibold text-[#001A4B]">{selectedTournament?.name}</p>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{selectedTournament?.fase}</span>
      </div>

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{filtered.length} partidos</p>
        <button
          onClick={() => onNewMatch(selectedTournamentId)}
          className="bg-[#FFDF00] text-[#001A4B] text-sm font-bold px-4 py-2 rounded-xl hover:bg-yellow-400 transition-colors"
        >
          + Nuevo partido
        </button>
      </div>

      {/* Tabla */}
      {loading ? <Spinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                <th className="text-left px-4 py-2 font-semibold">Partido</th>
                <th className="text-left px-4 py-2 font-semibold">Fecha</th>
                <th className="text-center px-4 py-2 font-semibold">Estado</th>
                <th className="text-center px-4 py-2 font-semibold">Resultado</th>
                <th className="text-right px-4 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon="⚽" message="No hay partidos en este torneo" />
                  </td>
                </tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#001A4B]">{m.home_team}</span>
                    <span className="text-gray-400 mx-1">vs</span>
                    <span className="font-medium text-[#001A4B]">{m.away_team}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(m.start_time), "d MMM HH:mm", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      m.estado === 'finished' ? 'bg-green-100 text-green-700' :
                      m.estado === 'live' ? 'bg-red-100 text-red-600 animate-pulse' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {m.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold">
                    {m.estado === 'finished' ? `${m.resultado_local}-${m.resultado_visitante}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => onEdit(m)} className="text-xs text-blue-600 hover:underline px-2 py-1">Editar</button>
                      {m.estado !== 'finished'
                        ? <button onClick={() => onResult(m)} className="text-xs text-green-600 hover:underline px-2 py-1">Resultado</button>
                        : <button onClick={() => onResult(m)} className="text-xs text-orange-500 hover:underline px-2 py-1">Corregir</button>
                      }
                      <button onClick={() => onDelete(m.id)} className="text-xs text-red-400 hover:underline px-2 py-1">×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── TorneosTab ──────────────────────────────────────────────────────── */
type TournamentWithCount = Tournament & {
  match_count?: number
  finished_count?: number
  first_match_time?: string
  last_match_time?: string
}

function TournamentProgressBars({ t }: { t: TournamentWithCount }) {
  const now = new Date()
  const total = t.match_count ?? 0
  const finished = t.finished_count ?? 0
  const matchPct = total > 0 ? Math.round((finished / total) * 100) : 0

  // Estado de apuestas
  const firstMatch = t.first_match_time ? new Date(t.first_match_time) : null
  const lastMatch = t.last_match_time ? new Date(t.last_match_time) : null
  const startRef = t.start_date ? new Date(t.start_date) : firstMatch
  const endRef = t.end_date ? new Date(t.end_date) : lastMatch

  let betLabel = ''
  let betPct = 0
  let betColor = 'bg-green-500'
  let betStatus: 'future' | 'open' | 'closed' = 'future'

  if (!startRef) {
    betLabel = 'Sin fechas definidas'
    betStatus = 'future'
  } else if (now < startRef) {
    const totalMs = startRef.getTime() - (startRef.getTime() - 60 * 24 * 3600000)
    const elapsed = now.getTime() - (startRef.getTime() - 60 * 24 * 3600000)
    betPct = Math.max(0, Math.min(100, Math.round((elapsed / totalMs) * 100)))
    const daysLeft = Math.ceil((startRef.getTime() - now.getTime()) / (1000 * 3600 * 24))
    betLabel = `${daysLeft}d para cerrar apuestas`
    betColor = daysLeft > 30 ? 'bg-green-500' : daysLeft > 7 ? 'bg-yellow-400' : 'bg-red-500'
    betStatus = 'future'
    betPct = Math.max(5, 100 - betPct) // bar depletes as deadline approaches
  } else if (endRef && now > endRef) {
    betPct = 100
    betLabel = 'Torneo finalizado'
    betColor = 'bg-gray-400'
    betStatus = 'closed'
  } else {
    betStatus = 'open'
    if (endRef) {
      const totalMs = endRef.getTime() - startRef.getTime()
      const elapsed = now.getTime() - startRef.getTime()
      betPct = Math.round((elapsed / totalMs) * 100)
      const daysLeft = Math.ceil((endRef.getTime() - now.getTime()) / (1000 * 3600 * 24))
      betLabel = `En curso · ${daysLeft}d restantes`
    } else {
      betLabel = 'En curso'
    }
    betColor = 'bg-blue-500'
  }

  if (total === 0) return null

  return (
    <div className="px-4 pb-3 space-y-2">
      {/* Barra 1: Avance de partidos */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">⚽ Partidos</span>
          <span className="text-[10px] font-bold text-gray-600">
            {finished === total && total > 0
              ? <span className="text-green-600">✓ Todos terminados</span>
              : <>{finished}/{total} terminados</>
            }
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${finished === total && total > 0 ? 'bg-green-500' : 'bg-[#0042A5]'}`}
            style={{ width: `${matchPct}%` }}
          />
        </div>
      </div>

      {/* Barra 2: Estado de apuestas */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">⏱ Apuestas</span>
          <span className={`text-[10px] font-bold ${
            betStatus === 'closed' ? 'text-gray-400' :
            betStatus === 'open' ? 'text-blue-600' :
            betColor.includes('red') ? 'text-red-600' :
            betColor.includes('yellow') ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {betLabel}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${betColor}`}
            style={{ width: `${betStatus === 'closed' ? 100 : betPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

const EMPTY_TOURNAMENT_FORM = {
  name: '', fase: '', description: '',
  start_date: '', end_date: '', is_active: true,
}

function TorneosTab({ onRefresh }: { tournaments: Tournament[], onRefresh: () => void }) {
  const { show } = useToastStore()
  const [allTournaments, setAllTournaments] = useState<TournamentWithCount[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [createForm, setCreateForm] = useState(EMPTY_TOURNAMENT_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_TOURNAMENT_FORM)
  const [applyingCutoff, setApplyingCutoff] = useState<string | null>(null)
  const [cutoffMinutes, setCutoffMinutes] = useState<Record<string, string>>({})

  const loadAll = async () => {
    setLoadingAll(true)
    try {
      const { data } = await api.get('/tournaments/admin/all')
      setAllTournaments(data.data)
    } catch {
      show('Error al cargar torneos', 'error')
    } finally {
      setLoadingAll(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/tournaments', createForm)
      show('Torneo creado ✓', 'success')
      setCreateForm(EMPTY_TOURNAMENT_FORM)
      loadAll(); onRefresh()
    } catch {
      show('Error al crear torneo', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (t: TournamentWithCount) => {
    if (editingId === t.id) { setEditingId(null); return }
    setEditingId(t.id)
    setEditForm({
      name: t.name,
      fase: t.fase,
      description: t.description || '',
      start_date: t.start_date ? t.start_date.slice(0, 10) : '',
      end_date: t.end_date ? t.end_date.slice(0, 10) : '',
      is_active: t.is_active,
    })
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      await api.put(`/tournaments/${id}`, editForm)
      show('Torneo actualizado ✓', 'success')
      setEditingId(null)
      loadAll(); onRefresh()
    } catch {
      show('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyCutoff = async (tournamentId: string) => {
    const mins = parseInt(cutoffMinutes[tournamentId] || '')
    if (isNaN(mins) || mins < 0) { show('Ingresá un número válido de minutos', 'error'); return }
    setApplyingCutoff(tournamentId)
    try {
      // Fetch matches for this tournament and update each
      const { data: mData } = await api.get('/matches?limit=500')
      const tournamentMatches = (mData.data.matches || []).filter(
        (m: Record<string, unknown>) => m.tournament_id === tournamentId
      )
      await Promise.all(
        tournamentMatches.map((m: Record<string, unknown>) =>
          api.put(`/matches/${m.id}`, { halftime_minutes: mins })
        )
      )
      show(`Cierre de ${mins} min aplicado a ${tournamentMatches.length} partidos ✓`, 'success')
    } catch {
      show('Error al aplicar cierre', 'error')
    } finally {
      setApplyingCutoff(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Formulario nuevo torneo */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-semibold text-[#001A4B] text-sm">Nuevo Torneo</h3>
        <div className="grid grid-cols-2 gap-3">
          <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder="Nombre del torneo" required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
          <input value={createForm.fase} onChange={(e) => setCreateForm({ ...createForm, fase: e.target.value })}
            placeholder="Fase (Grupos, Octavos...)" required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
            <input type="date" value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha fin</label>
            <input type="date" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="bg-[#FFDF00] text-[#001A4B] text-sm font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50">
          Crear torneo
        </button>
      </form>

      {/* Lista de torneos */}
      <div className="space-y-2">
        {loadingAll ? (
          <div className="py-6 flex justify-center"><Spinner size="sm" /></div>
        ) : allTournaments.length === 0 ? (
          <EmptyState icon="🏆" message="No hay torneos" />
        ) : allTournaments.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Cabecera del torneo */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#001A4B]">{t.name}</p>
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{t.fase}</span>
                  {t.match_count != null && t.match_count > 0 && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                      {t.match_count} partidos
                    </span>
                  )}
                  {t.start_date && (
                    <span className="text-[10px] text-gray-400">
                      {format(new Date(t.start_date), "d MMM yyyy", { locale: es })}
                      {t.end_date && ` → ${format(new Date(t.end_date), "d MMM yyyy", { locale: es })}`}
                    </span>
                  )}
                </div>
                {t.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{t.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.is_active ? '● Activo' : '○ Inactivo'}
                </span>
                <button onClick={() => openEdit(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${editingId === t.id ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                  {editingId === t.id ? 'Cancelar' : 'Editar'}
                </button>
              </div>
            </div>

            {/* Barras de progreso */}
            <TournamentProgressBars t={t} />

            {/* Panel de edición */}
            {editingId === t.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fase</label>
                    <input value={editForm.fase} onChange={(e) => setEditForm({ ...editForm, fase: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                  <input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Descripción opcional..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
                    <input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
                    <input type="date" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_active}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#0042A5]" />
                    <span className="text-xs font-medium text-gray-700">Visible en la app</span>
                  </label>
                </div>

                {/* Cierre de pronósticos */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs font-semibold text-[#001A4B] mb-2">⏱ Cierre de pronósticos</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Establecé cuántos minutos antes del inicio se cierran los pronósticos para todos los partidos de este torneo.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={10080}
                      value={cutoffMinutes[t.id] || ''}
                      onChange={(e) => setCutoffMinutes({ ...cutoffMinutes, [t.id]: e.target.value })}
                      placeholder="ej: 45"
                      className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
                    />
                    <span className="text-xs text-gray-500">minutos antes del partido</span>
                    <button
                      type="button"
                      onClick={() => handleApplyCutoff(t.id)}
                      disabled={applyingCutoff === t.id || !cutoffMinutes[t.id]}
                      className="text-xs bg-[#0042A5] text-white font-bold px-3 py-1.5 rounded-lg hover:bg-[#003080] disabled:opacity-40 ml-auto"
                    >
                      {applyingCutoff === t.id ? 'Aplicando...' : 'Aplicar a todos'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button onClick={() => handleSaveEdit(t.id)} disabled={saving}>
                    Guardar cambios
                  </Button>
                  <button type="button" onClick={() => setEditingId(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── AdminSubTab ─────────────────────────────────────────────────────── */
function AdminSubTab({ tab }: { tab: 'planillas' | 'usuarios' }) {
  const { show } = useToastStore()
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [unlockCounts, setUnlockCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // Detalle usuario
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userPlanillas, setUserPlanillas] = useState<Record<string, unknown>[]>([])
  const [loadingPlanillas, setLoadingPlanillas] = useState(false)
  const [planillaTournamentFilter, setPlanillaTournamentFilter] = useState<string>('all')
  const [allPlanillas, setAllPlanillas] = useState<Record<string, unknown>[] | null>(null)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; name: string } | null>(null)
  const [confirmDeletePlanilla, setConfirmDeletePlanilla] = useState<{ id: string; nombre: string; userName: string } | null>(null)
  const USERS_PER_PAGE = 20
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)

  const loadTabData = useCallback(async () => {
    if (tab === 'usuarios') {
      const [uRes, urRes] = await Promise.allSettled([
        api.get(`/users?page=${page}&limit=${USERS_PER_PAGE}`),
        api.get('/bets/unlock-requests'),
      ])
      if (uRes.status === 'fulfilled') {
        setData(uRes.value.data.data.users || [])
        const pag = uRes.value.data.data.pagination
        if (pag) { setTotalPages(pag.pages); setTotalUsers(pag.total) }
      } else show('Error al cargar usuarios', 'error')
      if (urRes.status === 'fulfilled') {
        const counts: Record<string, number> = {}
        for (const r of (urRes.value.data.data || [])) {
          const uid = String(r.requester_user_id)
          counts[uid] = (counts[uid] || 0) + 1
        }
        setUnlockCounts(counts)
      }
    } else {
      const { data: d } = await api.get('/planillas/admin/all').catch(() => { show('Error al cargar', 'error'); return { data: { data: [] } } })
      setData(d.data)
    }
  }, [tab, show, page])

  useEffect(() => {
    setLoading(true)
    loadTabData().finally(() => setLoading(false))
    const interval = setInterval(loadTabData, 30000)
    return () => clearInterval(interval)
  }, [loadTabData])

  useEffect(() => { setExpandedUserId(null) }, [page])
  useEffect(() => { setPage(1) }, [tab])

  const handleUserClick = useCallback(async (uid: string) => {
    if (expandedUserId === uid) { setExpandedUserId(null); return }
    setExpandedUserId(uid)
    setPlanillaTournamentFilter('all')
    setLoadingPlanillas(true)
    try {
      let pl = allPlanillas
      if (!pl) {
        const { data: d } = await api.get('/planillas/admin/all')
        pl = d.data || []
        setAllPlanillas(pl)
      }
      setUserPlanillas((pl || []).filter(p => String(p.user_id) === uid))
    } catch {
      show('Error al cargar planillas', 'error')
    } finally {
      setLoadingPlanillas(false)
    }
  }, [expandedUserId, allPlanillas, show])

  const handleDeleteUser = (userId: string, userName: string) => {
    setConfirmDeleteUser({ id: userId, name: userName })
  }

  const doDeleteUser = async () => {
    if (!confirmDeleteUser) return
    const { id: userId, name: userName } = confirmDeleteUser
    setConfirmDeleteUser(null)
    try {
      await api.delete(`/users/${userId}`)
      setData(prev => {
        const next = prev.filter(u => String(u.id) !== userId)
        if (next.length === 0 && page > 1) setPage(p => p - 1)
        return next
      })
      show(`Usuario ${userName} eliminado completamente ✓`, 'success')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al eliminar usuario'
      show(msg, 'error')
    }
  }

  const handleDeletePlanilla = async () => {
    if (!confirmDeletePlanilla) return
    const { id, nombre, userName } = confirmDeletePlanilla
    setConfirmDeletePlanilla(null)
    try {
      await api.delete(`/planillas/admin/${id}`)
      setData(prev => prev.filter(p => String(p.id) !== id))
      show(`Planilla "${nombre}" de ${userName} eliminada ✓`, 'success')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al eliminar planilla'
      show(msg, 'error')
    }
  }

  const handlePaid = async (id: string, current: boolean) => {
    try {
      await api.put(`/planillas/admin/${id}`, { precio_pagado: !current })
      setData(data.map((d) => d.id === id ? { ...d, precio_pagado: !current } : d))
      show('Actualizado ✓', 'success')
    } catch {
      show('Error', 'error')
    }
  }

  if (loading) return <Spinner />

  if (tab === 'planillas') {
    return (
      <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 border-b">
              <th className="text-left px-4 py-2 font-semibold">Usuario</th>
              <th className="text-left px-4 py-2 font-semibold">Planilla</th>
              <th className="text-center px-4 py-2 font-semibold">Pts</th>
              <th className="text-center px-4 py-2 font-semibold">Pagada</th>
              <th className="text-center px-4 py-2 font-semibold">Eliminar</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={String(p.id)} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2 text-gray-600 text-xs">{String(p.user_name || '')}</td>
                <td className="px-4 py-2 font-medium text-[#001A4B]">{String(p.nombre_planilla || '')}</td>
                <td className="px-4 py-2 text-center text-gray-600">{String(p.puntos_totales || 0)}</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => handlePaid(String(p.id), Boolean(p.precio_pagado))}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.precio_pagado ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                    {p.precio_pagado ? 'Pagada' : 'IMPAGO'}
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => setConfirmDeletePlanilla({ id: String(p.id), nombre: String(p.nombre_planilla || ''), userName: String(p.user_name || '') })}
                    className="text-red-400 hover:text-red-600 transition-colors text-base"
                    title="Eliminar planilla"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmModal
        open={!!confirmDeletePlanilla}
        title="Eliminar planilla"
        message={`¿Eliminar la planilla "${confirmDeletePlanilla?.nombre}" de ${confirmDeletePlanilla?.userName}? Se borrarán todos sus pronósticos y puntajes. El usuario recibirá un email de notificación.`}
        onConfirm={handleDeletePlanilla}
        onCancel={() => setConfirmDeletePlanilla(null)}
      />
    </>
    )
  }

  // Torneos únicos de las planillas del usuario expandido
  const userTournaments = Array.from(new Set(
    userPlanillas.map(p => String(p.tournament_name || '')).filter(Boolean)
  ))
  const filteredPlanillas = planillaTournamentFilter === 'all'
    ? userPlanillas
    : userPlanillas.filter(p => String(p.tournament_name || '') === planillaTournamentFilter)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs text-gray-500 border-b">
            <th className="text-left px-4 py-2 font-semibold">Nombre</th>
            <th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Email</th>
            <th className="text-center px-4 py-2 font-semibold">Rol</th>
            <th className="text-center px-4 py-2 font-semibold">Verificado</th>
            <th className="text-center px-4 py-2 font-semibold">Solicitudes</th>
            <th className="text-right px-4 py-2 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => {
            const uid = String(u.id)
            const reqCount = unlockCounts[uid] || 0
            const isExpanded = expandedUserId === uid
            return (
              <React.Fragment key={uid}>
              <tr
                className={`border-b border-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50/50'}`}
                onClick={() => handleUserClick(uid)}
              >
                <td className="px-4 py-2 font-medium text-[#001A4B] flex items-center gap-2">
                  <span className="text-gray-400 text-xs">{isExpanded ? '▾' : '▸'}</span>
                  {String(u.nombre || '')}
                </td>
                <td className="px-4 py-2 text-gray-500 text-xs hidden md:table-cell">{String(u.email || '')}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {String(u.rol || '')}
                  </span>
                </td>
                <td className="px-4 py-2 text-center text-sm">{u.email_verified ? '✅' : '❌'}</td>
                <td className="px-4 py-2 text-center">
                  {reqCount > 0
                    ? <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                        🔓 {reqCount}
                      </span>
                    : <span className="text-gray-300 text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteUser(uid, String(u.nombre || ''))
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 transition-colors"
                    title={`Eliminar a ${u.nombre} y todos sus datos`}
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
              {/* Panel expandible de planillas */}
              {isExpanded && (
                <tr key={`${uid}-detail`} className="bg-blue-50/60 border-b border-blue-100">
                  <td colSpan={5} className="px-6 py-4">
                    {loadingPlanillas ? (
                      <div className="flex justify-center py-4"><Spinner /></div>
                    ) : userPlanillas.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">Este usuario no tiene planillas</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Filtro de torneos */}
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPlanillaTournamentFilter('all') }}
                            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${planillaTournamentFilter === 'all' ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200'}`}
                          >
                            Todos ({userPlanillas.length})
                          </button>
                          {userTournaments.map(t => (
                            <button
                              key={t}
                              onClick={(e) => { e.stopPropagation(); setPlanillaTournamentFilter(t) }}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${planillaTournamentFilter === t ? 'bg-[#001A4B] text-white border-[#001A4B]' : 'bg-white text-gray-600 border-gray-200'}`}
                            >
                              {t} ({userPlanillas.filter(p => String(p.tournament_name || '') === t).length})
                            </button>
                          ))}
                        </div>
                        {/* Lista de planillas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {filteredPlanillas.map(p => (
                            <button
                              key={String(p.id)}
                              onClick={(e) => { e.stopPropagation(); navigate(`/planilla/${p.id}`) }}
                              className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-left hover:border-[#0042A5] hover:shadow-sm transition-all group"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-[#001A4B] group-hover:text-[#0042A5]">
                                    {String(p.nombre_planilla || 'Planilla')}
                                  </p>
                                  {p.tournament_name ? (
                                    <p className="text-xs text-gray-400 mt-0.5">{String(p.tournament_name)}</p>
                                  ) : null}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-[#0042A5]">{String(p.puntos_totales || 0)} pts</p>
                                  {!p.precio_pagado && (
                                    <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block">IMPAGO</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
      {tab === 'usuarios' && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>{totalUsers} usuarios · página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors text-xs"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors text-xs"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!confirmDeleteUser}
        title="⚠️ Eliminar usuario"
        message={`¿Eliminar a "${confirmDeleteUser?.name}" y TODOS sus datos (planillas, apuestas, scores)? Es irreversible.`}
        requireText="CONFIRMAR"
        onConfirm={doDeleteUser}
        onCancel={() => setConfirmDeleteUser(null)}
      />
    </div>
  )
}

/* ── JobsTab ─────────────────────────────────────────────────────────── */
function JobCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[#001A4B]">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  )
}

function JobsTab() {
  const { show } = useToastStore()
  const [matchdays, setMatchdays] = useState<{ id: string; name: string; tournament_name?: string }[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [recalcMatchdayId, setRecalcMatchdayId] = useState('')
  const [winnerEmail, setWinnerEmail] = useState('')
  const [winnerMatchdayName, setWinnerMatchdayName] = useState('')
  const [winnerPoints, setWinnerPoints] = useState('42')
  const [winnerUserName, setWinnerUserName] = useState('')
  const [winnerImageUrl, setWinnerImageUrl] = useState('')
  const [weeklyTestEmail, setWeeklyTestEmail] = useState('')
  const [welcomeEmail, setWelcomeEmail] = useState('')
  const [voice5dayUserIds, setVoice5dayUserIds] = useState('')
  const [voice5dayDryRun, setVoice5dayDryRun] = useState(true)
  const [voice5dayPreview, setVoice5dayPreview] = useState<Array<{ tournament: string; user: string; phone: string; pending: number }>>([])
  const [waTo, setWaTo] = useState('')
  const [waMessage, setWaMessage] = useState('')
  const [jobResult, setJobResult] = useState<{ id: string; text: string } | null>(null)
  const [confirmWeekly, setConfirmWeekly] = useState(false)
  const [confirmVoice5day, setConfirmVoice5day] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetExtendHours, setResetExtendHours] = useState('')

  useEffect(() => {
    // GET /matchdays requires tournament_id → load all tournaments first, then matchdays per tournament
    api.get('/tournaments/admin/all').then(async res => {
      const tournaments: { id: string; name: string }[] = res.data.data || []
      const all: { id: string; name: string; tournament_name: string }[] = []
      await Promise.allSettled(
        tournaments.map(async t => {
          const r = await api.get(`/matchdays?tournament_id=${t.id}`)
          for (const md of (r.data.data || [])) {
            all.push({ id: md.id, name: md.name, tournament_name: t.name })
          }
        })
      )
      setMatchdays(all)
    }).catch(() => show('Error al cargar fechas', 'error'))
  }, [])

  const runJob = async (jobId: string, fn: () => Promise<string>) => {
    setLoading(jobId)
    setJobResult(null)
    try {
      const msg = await fn()
      if (msg) { setJobResult({ id: jobId, text: msg }); show(msg, 'success') }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al ejecutar'
      show(msg, 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Recalcular Ranking */}
      <JobCard title="🔄 Recalcular Ranking" description="Suma todos los puntos de la tabla scores y recalcula posiciones.">
        <Button
          onClick={() => runJob('ranking', async () => {
            await api.post('/admin/jobs/recalculate-ranking', {})
            return 'Ranking recalculado ✓'
          })}
          disabled={!!loading}
          loading={loading === 'ranking'}
        >
          {loading === 'ranking' ? 'Recalculando...' : 'Ejecutar'}
        </Button>
        {jobResult?.id === 'ranking' && <p className="text-xs text-green-600 font-medium">{jobResult.text}</p>}
      </JobCard>

      {/* Recalcular Jornada */}
      <JobCard title="📅 Recalcular Jornada" description="Recalcula puntos y detecta ganador para una jornada específica.">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Jornada</label>
            <select
              value={recalcMatchdayId}
              onChange={e => setRecalcMatchdayId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            >
              <option value="">— Seleccioná —</option>
              {matchdays.map(m => (
                <option key={m.id} value={m.id}>
                  {m.tournament_name ? `${m.tournament_name} · ` : ''}{m.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => runJob('matchday', async () => {
              if (!recalcMatchdayId) { show('Seleccioná una jornada', 'error'); return '' }
              const { data } = await api.post('/admin/jobs/recalc-matchday', { matchday_id: recalcMatchdayId })
              return `Jornada recalculada ✓ (${data.data?.updated ?? 0} apuestas)`
            })}
            disabled={!!loading || !recalcMatchdayId}
            loading={loading === 'matchday'}
            className="whitespace-nowrap"
          >
            {loading === 'matchday' ? 'Calculando...' : 'Ejecutar'}
          </Button>
        </div>
        {jobResult?.id === 'matchday' && <p className="text-xs text-green-600 font-medium">{jobResult.text}</p>}
      </JobCard>

      {/* Publicar Ganador */}
      <JobCard title="🏆 Publicar Ganador de Jornada" description="Dispara notificaciones (email, WhatsApp, push) y publica la imagen hero en el modal de Ganadores.">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email del ganador *</label>
            <input
              type="email"
              value={winnerEmail}
              onChange={e => setWinnerEmail(e.target.value)}
              placeholder="cfdelrio@gmail.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de jornada</label>
              <input
                value={winnerMatchdayName}
                onChange={e => setWinnerMatchdayName(e.target.value)}
                placeholder="Fecha 1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Puntos</label>
              <input
                type="number"
                value={winnerPoints}
                onChange={e => setWinnerPoints(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del ganador (opcional)</label>
            <input
              value={winnerUserName}
              onChange={e => setWinnerUserName(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL imagen hero (opcional — si la cargás se muestra en el modal de Ganadores)</label>
            <input
              value={winnerImageUrl}
              onChange={e => setWinnerImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
          </div>
          {winnerImageUrl && (
            <img
              src={winnerImageUrl}
              alt="Preview"
              className="w-full rounded-xl max-h-48 object-cover border border-gray-100"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <button
            onClick={() => runJob('winner', async () => {
              if (!winnerEmail) { show('Ingresá el email del ganador', 'error'); return '' }
              const pts = winnerPoints ? parseInt(winnerPoints) : undefined
              await api.post('/admin/jobs/trigger-winner', {
                email: winnerEmail,
                matchday_name: winnerMatchdayName || undefined,
                points: pts,
              })
              if (winnerImageUrl) {
                await api.post('/admin/winner-image', {
                  image_url: winnerImageUrl,
                  matchday_label: winnerMatchdayName || undefined,
                  user_name: winnerUserName || undefined,
                  points: pts,
                })
              }
              const parts = [`Ganador publicado para ${winnerEmail} ✓`]
              if (winnerImageUrl) parts.push('+ imagen hero guardada')
              return parts.join(' ')
            })}
            disabled={!!loading || !winnerEmail}
            className="bg-green-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50"
          >
            {loading === 'winner' ? 'Publicando...' : '🚀 Publicar ganador'}
          </button>
          {jobResult?.id === 'winner' && <p className="text-xs text-green-600 font-medium">{jobResult.text}</p>}
        </div>
      </JobCard>

      {/* Email Semanal */}
      <JobCard title="📧 Email Semanal" description="Con email de prueba lo envía solo a esa dirección. Vacío = envía a todos los usuarios.">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Email de prueba (opcional)</label>
            <input
              type="email"
              value={weeklyTestEmail}
              onChange={e => setWeeklyTestEmail(e.target.value)}
              placeholder="vacío = enviar a todos"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
          </div>
          <button
            onClick={() => {
              if (!weeklyTestEmail) { setConfirmWeekly(true); return }
              runJob('weekly', async () => {
                const { data } = await api.post('/admin/weekly-email', { test_email: weeklyTestEmail })
                return `Email semanal: ${data.data.sent} enviados, ${data.data.failed} fallidos`
              })
            }}
            disabled={!!loading}
            className="bg-[#FFDF00] text-[#001A4B] text-sm font-bold px-5 py-2 rounded-xl hover:bg-yellow-400 disabled:opacity-50 whitespace-nowrap"
          >
            {loading === 'weekly' ? 'Enviando...' : '📤 Enviar'}
          </button>
        </div>
        {jobResult?.id === 'weekly' && <p className="text-xs text-green-600 font-medium">{jobResult.text}</p>}
      </JobCard>

      {/* Email de Bienvenida */}
      <JobCard title="👋 Email de Bienvenida" description="Re-envía el email de bienvenida a un usuario registrado.">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Email del usuario *</label>
            <input
              type="email"
              value={welcomeEmail}
              onChange={e => setWelcomeEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
          </div>
          <Button
            onClick={() => runJob('welcome', async () => {
              if (!welcomeEmail) { show('Ingresá un email', 'error'); return '' }
              await api.post('/admin/jobs/send-welcome', { email: welcomeEmail })
              return `Email de bienvenida enviado a ${welcomeEmail} ✓`
            })}
            disabled={!!loading || !welcomeEmail}
            loading={loading === 'welcome'}
            className="whitespace-nowrap"
          >
            {loading === 'welcome' ? 'Enviando...' : '📤 Enviar'}
          </Button>
        </div>
        {jobResult?.id === 'welcome' && <p className="text-xs text-green-600 font-medium">{jobResult.text}</p>}
      </JobCard>

      {/* Test WhatsApp */}
      <JobCard title="💬 Test WhatsApp" description="Envía un mensaje de WhatsApp a un número específico para verificar la integración.">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Número (con código de país) *</label>
            <input
              value={waTo}
              onChange={e => setWaTo(e.target.value)}
              placeholder="+5491112345678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mensaje *</label>
            <input
              value={waMessage}
              onChange={e => setWaMessage(e.target.value)}
              placeholder="Mensaje de prueba desde PRODE Caballito"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
          </div>
          <button
            onClick={() => runJob('whatsapp', async () => {
              if (!waTo || !waMessage) { show('Completá número y mensaje', 'error'); return '' }
              await api.post('/admin/test-whatsapp', { to: waTo, message: waMessage })
              return `WhatsApp enviado a ${waTo} ✓`
            })}
            disabled={!!loading || !waTo || !waMessage}
            className="bg-green-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50"
          >
            {loading === 'whatsapp' ? 'Enviando...' : '📱 Enviar WhatsApp'}
          </button>
          {jobResult?.id === 'whatsapp' && <p className="text-xs text-green-600 font-medium">{jobResult.text}</p>}
        </div>
      </JobCard>
      {/* Voice Survey 5 días antes del torneo */}
      <JobCard
        title="📞 Voice Survey 5 días"
        description="Dispara prode.voice_survey via Engage para usuarios con apuestas pendientes a 5 días del primer partido. Usa el template 'Onboarding Workcup 2026' + voice.orkestai."
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">User IDs (opcional, separados por coma)</label>
            <input
              value={voice5dayUserIds}
              onChange={e => setVoice5dayUserIds(e.target.value)}
              placeholder="vacío = todos los users con bets pendientes en ventana T-5d"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={voice5dayDryRun}
              onChange={e => setVoice5dayDryRun(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Dry-run (preview sin llamar)</span>
          </label>
          <button
            onClick={() => {
              const userIds = voice5dayUserIds.split(',').map(s => s.trim()).filter(Boolean)
              if (!voice5dayDryRun && userIds.length === 0) {
                setConfirmVoice5day(true)
                return
              }
              runJob('voice5day', async () => {
                const body: { user_ids?: string[]; dry_run: boolean } = { dry_run: voice5dayDryRun }
                if (userIds.length > 0) body.user_ids = userIds
                const { data } = await api.post('/admin/voice-5day-trigger', body)
                setVoice5dayPreview(data.data.preview || [])
                const mode = voice5dayDryRun ? 'preview' : 'disparado'
                return `Voice 5d ${mode}: ${data.data.users_notified} users, ${data.data.tournaments_in_window} torneos en ventana, ${data.data.skipped} skip`
              })
            }}
            disabled={!!loading}
            className="bg-purple-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
          >
            {loading === 'voice5day' ? 'Procesando...' : voice5dayDryRun ? '🔍 Preview' : '📞 Disparar llamadas'}
          </button>
          {jobResult?.id === 'voice5day' && <p className="text-xs text-green-600 font-medium">{jobResult.text}</p>}
          {voice5dayPreview.length > 0 && (
            <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Torneo</th>
                    <th className="text-left px-3 py-2">Usuario</th>
                    <th className="text-left px-3 py-2">Teléfono</th>
                    <th className="text-right px-3 py-2">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {voice5dayPreview.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{r.tournament}</td>
                      <td className="px-3 py-2">{r.user}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{r.phone}</td>
                      <td className="px-3 py-2 text-right">{r.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </JobCard>

      {/* ── Reset del Juego ─────────────────────────────────────────────── */}
      <JobCard
        title="♻️ Reset del Juego"
        description="Borra resultados, puntos, ranking, ganadores, streaks y badges. Preserva planillas y pronósticos."
      >
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700 space-y-1.5">
          <p className="font-semibold">⚠️ Qué se borra:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Resultados de todos los partidos (vuelven a "pending")</li>
            <li>Puntos de todas las apuestas y planillas</li>
            <li>Tabla de ranking completa</li>
            <li>Ganadores (activo e historial de jornadas)</li>
            <li>Streaks y badges de todos los usuarios</li>
          </ul>
          <p className="font-semibold">✅ Qué se preserva:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Planillas y pronósticos (goles apostados)</li>
            <li>Partidos (sin resultados), torneos y usuarios</li>
          </ul>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Extender fechas de partidos (opcional)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              max="8760"
              value={resetExtendHours}
              onChange={e => setResetExtendHours(e.target.value)}
              placeholder="0 hs (no extiende)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <span className="text-xs text-gray-400 whitespace-nowrap">horas</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Re-abre el período de apuestas empujando los horarios de los partidos hacia adelante.</p>
        </div>
        <button
          onClick={() => setConfirmReset(true)}
          disabled={!!loading}
          className="w-full bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'reset' ? 'Reseteando...' : '♻️ Resetear juego'}
        </button>
        {jobResult?.id === 'reset' && <p className="text-xs text-green-600 font-medium">{jobResult.text}</p>}
      </JobCard>

      <ConfirmModal
        open={confirmWeekly}
        title="Enviar email semanal"
        message="¿Enviar el email semanal a TODOS los usuarios?"
        onConfirm={() => {
          setConfirmWeekly(false)
          runJob('weekly', async () => {
            const { data } = await api.post('/admin/weekly-email', {})
            return `Email semanal: ${data.data.sent} enviados, ${data.data.failed} fallidos`
          })
        }}
        onCancel={() => setConfirmWeekly(false)}
      />

      <ConfirmModal
        open={confirmVoice5day}
        title="Disparar voice survey"
        message="¿Disparar voice survey a TODOS los users con bets pendientes? Esto cuesta plata 💸"
        onConfirm={() => {
          setConfirmVoice5day(false)
          runJob('voice5day', async () => {
            const { data } = await api.post('/admin/voice-5day-trigger', { dry_run: false })
            setVoice5dayPreview(data.data.preview || [])
            return `Voice 5d disparado: ${data.data.users_notified} users, ${data.data.tournaments_in_window} torneos en ventana, ${data.data.skipped} skip`
          })
        }}
        onCancel={() => setConfirmVoice5day(false)}
      />

      <ConfirmModal
        open={confirmReset}
        title="♻️ Reset del Juego"
        message="Esto borrará TODOS los resultados, puntos, ranking y ganadores. Las planillas y los pronósticos quedan intactos. Esta acción es IRREVERSIBLE."
        requireText="RESET"
        onConfirm={() => {
          setConfirmReset(false)
          runJob('reset', async () => {
            const extendHours = Number(resetExtendHours) || 0
            const { data } = await api.post('/admin/jobs/reset-game', extendHours > 0 ? { extend_hours: extendHours } : {})
            return data.message ?? 'Juego reseteado ✓'
          })
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  )
}

/* ── BroadcastTab ────────────────────────────────────────────────────── */
function BroadcastTab() {
  const { show } = useToastStore()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ total: number; sent: number; failed: number } | null>(null)
  const [confirmSend, setConfirmSend] = useState(false)

  const handleSend = () => {
    if (!message.trim()) { show('Escribí un mensaje', 'error'); return }
    setConfirmSend(true)
  }

  const doSend = async () => {
    setConfirmSend(false)
    setSending(true)
    setResult(null)
    try {
      const { data } = await api.post('/internal/broadcast-whatsapp', { message }, {
        headers: { 'x-internal-secret': import.meta.env.VITE_INTERNAL_SECRET || '' },
      })
      setResult(data.data)
      show(`Enviado: ${data.data.sent} ✓ / ${data.data.failed} ✗`, data.data.failed === 0 ? 'success' : 'error')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al enviar'
      show(msg, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#001A4B] mb-1">📣 Mensaje broadcast por WhatsApp</h3>
          <p className="text-xs text-gray-400">Se enviará a todos los jugadores que tienen número de WhatsApp y dieron su consentimiento.</p>
        </div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={"Ejemplo:\n⚽ PRODE Caballito\n\nRecordá apostar el partido de hoy antes de las 20:00 hs.\n\n👉 prodecaballito.com/apuestas"}
          rows={6}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5] resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{message.length} caracteres</span>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="t-btn-cta text-sm px-5 py-2 disabled:opacity-50"
          >
            {sending ? 'Enviando...' : '📤 Enviar a todos'}
          </button>
        </div>
        {result && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <p className="font-medium text-[#001A4B]">Resultado del envío</p>
            <p className="text-gray-600">Total destinatarios: <span className="font-semibold">{result.total}</span></p>
            <p className="text-green-600">Enviados: <span className="font-semibold">{result.sent}</span></p>
            {result.failed > 0 && <p className="text-red-500">Fallidos: <span className="font-semibold">{result.failed}</span></p>}
          </div>
        )}
      </div>
      <ConfirmModal
        open={confirmSend}
        title="Enviar broadcast WhatsApp"
        message="¿Enviar este mensaje por WhatsApp a todos los usuarios que dieron su consentimiento?"
        onConfirm={doSend}
        onCancel={() => setConfirmSend(false)}
      />
    </div>
  )
}

/* ── PollsTab ────────────────────────────────────────────────────────── */
interface PollOption { id: number; label: string; flag_emoji: string; flag_code: string; vote_count: number }
interface PollData {
  id: number; slug: string; title: string; active: boolean; ended: boolean
  winner_option_id: number | null; options: PollOption[]; total_votes: number
}

function PollsTab() {
  const [poll, setPoll] = useState<PollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { show } = useToastStore()

  const load = useCallback(async () => {
    try {
      const r = await api.get('/public/polls/mundial-2026')
      setPoll(r.data.data)
    } catch {
      setPoll(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true)
    try {
      await api.patch('/public/polls/mundial-2026', body)
      await load()
      show('Poll actualizada', 'success')
    } catch {
      show('Error al actualizar', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-8 text-center text-gray-400 text-sm">Cargando...</div>
  if (!poll) return <div className="py-8 text-center text-gray-400 text-sm">Poll no encontrada — ejecutá las migraciones primero.</div>

  const sorted = [...poll.options].sort((a, b) => b.vote_count - a.vote_count)
  const max = sorted[0]?.vote_count || 1

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-[#001A4B] px-4 py-3 flex items-center justify-between">
          <span className="text-[10px] font-black text-white uppercase tracking-widest">🗳️ {poll.title}</span>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${poll.active && !poll.ended ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
              {poll.ended ? 'Cerrada' : poll.active ? 'Activa' : 'Inactiva'}
            </span>
            <span className="text-white/50 text-[10px]">{poll.total_votes.toLocaleString('es-AR')} votos</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-gray-100">
          {!poll.ended ? (
            <button
              onClick={() => patch({ ended: true, active: false })}
              disabled={saving}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              🔒 Cerrar votación
            </button>
          ) : (
            <button
              onClick={() => patch({ ended: false, active: true })}
              disabled={saving}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
            >
              🔓 Reabrir votación
            </button>
          )}
          {poll.winner_option_id && (
            <button
              onClick={() => patch({ winner_option_id: null })}
              disabled={saving}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              ✕ Quitar ganador
            </button>
          )}
        </div>

        {/* Resultados */}
        <div className="p-4 space-y-3">
          {sorted.map(opt => {
            const pct = poll.total_votes > 0 ? Math.round((opt.vote_count / poll.total_votes) * 100) : 0
            const isWinner = poll.winner_option_id === opt.id
            return (
              <div key={opt.id} className={`p-3 rounded-xl border transition-all ${isWinner ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 font-semibold text-sm text-gray-800">
                    {isWinner && <span className="text-yellow-500">★</span>}
                    <span className="text-lg leading-none">{opt.flag_emoji}</span>
                    {opt.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-600">{pct}% · {opt.vote_count.toLocaleString('es-AR')} votos</span>
                    {!isWinner && (
                      <button
                        onClick={() => patch({ winner_option_id: opt.id, ended: true, active: false })}
                        disabled={saving}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        ★ Marcar ganador
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(opt.vote_count / max) * 100}%`, background: isWinner ? '#f59e0b' : '#0042A5' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── CampanasTab ─────────────────────────────────────────────────────── */
function CampanasTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CampaignBuilder />
        <CampaignLiveActivity />
      </div>
      <EngageVerifyPanel />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

interface Winner {
  matchday_id: string
  matchday_name: string
  match_date: string
  points: number
  rank_in_matchday: number
  is_winner: boolean
  user_name: string
  user_avatar: string | null
  tournament_id: string
}

export function Ganadas() {
  const { user } = useAuthStore()
  const { show } = useToastStore()
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const loadWinners = async () => {
      try {
        const { data } = await api.get('/matchdays/me')
        const wonJornadas = data.data.history.filter((m: Winner) => m.is_winner)
        setWinners(wonJornadas)
      } catch (err) {
        show('Error al cargar ganadas', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadWinners()
  }, [user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (winners.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#001A4B] to-[#0d2c5c] p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-white mb-2">Aún no ganaste ninguna jornada</h1>
          <p className="text-gray-300">Seguí apuntando alto — tu trophy está cerca</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001A4B] to-[#0d2c5c] p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8 mt-6">
          <h1 className="text-3xl font-bold text-white">🏆 Mis victorias</h1>
          <span className="bg-yellow-500 text-[#001A4B] font-bold px-3 py-1 rounded-full text-lg">
            {winners.length}
          </span>
        </div>

        <div className="grid gap-4">
          {winners.map((w) => (
            <div
              key={w.matchday_id}
              className="bg-white/10 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 hover:bg-white/15 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-yellow-300 mb-1">{w.matchday_name}</h2>
                  <p className="text-gray-300 text-sm mb-3">
                    {new Date(w.match_date).toLocaleDateString('es-AR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="flex gap-4">
                    <div className="bg-yellow-500/20 px-4 py-2 rounded-lg">
                      <div className="text-xs text-gray-300">Puntos</div>
                      <div className="text-2xl font-bold text-yellow-300">{w.points}</div>
                    </div>
                    <div className="bg-purple-500/20 px-4 py-2 rounded-lg">
                      <div className="text-xs text-gray-300">Posición</div>
                      <div className="text-2xl font-bold text-purple-300">#{w.rank_in_matchday}</div>
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  {w.user_avatar ? (
                    <img
                      src={w.user_avatar}
                      alt={w.user_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-yellow-500 mb-2"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-2 text-3xl">
                      🏆
                    </div>
                  )}
                  <p className="text-sm text-gray-300">{w.user_name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

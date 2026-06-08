import { useEffect, useState, useCallback } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { useT } from '@/hooks/useT'
import { Sk, SkRankRow } from '@/components/ui/Skeleton'
import { StreakBadge } from '@/components/StreakBadge'
import { useGamification } from '@/hooks/useGamification'

function RankingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <Sk className="h-7 w-32" />
      <div className="flex gap-2 flex-wrap">
        {[0, 1, 2, 3].map(i => <Sk key={i} className="h-9 w-20 rounded-full" />)}
      </div>
      <div className="t-gradient-hero rounded-xl p-4 flex items-center gap-4">
        <div className="animate-pulse bg-white/20 h-8 w-8 rounded" />
        <div className="animate-pulse bg-white/20 rounded-full w-10 h-10 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="animate-pulse bg-white/30 h-4 w-28 rounded" />
          <div className="animate-pulse bg-white/20 h-3 w-16 rounded" />
        </div>
        <div className="space-y-1">
          <div className="animate-pulse bg-white/30 h-7 w-10 rounded" />
          <div className="animate-pulse bg-white/20 h-3 w-12 rounded" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 h-9 border-b border-gray-100" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <SkRankRow key={i} />)}
      </div>
    </div>
  )
}

function RankingContentSkeleton() {
  return (
    <>
      <div className="t-gradient-hero rounded-xl p-4 flex items-center gap-4">
        <div className="animate-pulse bg-white/20 h-8 w-8 rounded" />
        <div className="animate-pulse bg-white/20 rounded-full w-10 h-10 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="animate-pulse bg-white/30 h-4 w-28 rounded" />
          <div className="animate-pulse bg-white/20 h-3 w-16 rounded" />
        </div>
        <div className="space-y-1">
          <div className="animate-pulse bg-white/30 h-7 w-10 rounded" />
          <div className="animate-pulse bg-white/20 h-3 w-12 rounded" />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 h-9 border-b border-gray-100" />
        {[0, 1, 2, 3, 4, 5].map(i => <SkRankRow key={i} />)}
      </div>
    </>
  )
}
import { useRankingDeltas } from '@/hooks/useRankingDeltas'
import type { RankingEntry } from '@/types'

const MEDAL = ['🥇', '🥈', '🥉']
const PODIUM_BORDER = ['border-l-2 border-l-yellow-400', 'border-l-2 border-l-slate-300', 'border-l-2 border-l-amber-600/60']

function getPlayerBadge(r: RankingEntry): { emoji: string; label: string } | null {
  if (r.exactos_count >= 10) return { emoji: '🎯', label: 'Sniper' }
  if (r.aciertos_celeste >= 5) return { emoji: '⚡', label: 'Bonus' }
  if (r.position > 5 && r.exactos_count >= 5) return { emoji: '🎭', label: 'Tapado' }
  return null
}

export function Ranking() {
  const { user } = useAuthStore()
  const { data: gamification } = useGamification(user?.id ?? null)
  const myStreak = gamification.streaks[0]?.current_streak ?? 0
  const { show } = useToastStore()
  const t = useT()
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<RankingEntry | null>(null)
  const [shared, setShared] = useState(false)
  const [avatarFullscreen, setAvatarFullscreen] = useState(false)

  // Favoritos
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  const [favBannerVisible, setFavBannerVisible] = useState(
    () => localStorage.getItem('prode_fav_banner_v2') !== '0'
  )
  const closeFavBanner = () => {
    localStorage.setItem('prode_fav_banner_v2', '0')
    setFavBannerVisible(false)
  }

  useEffect(() => {
    Promise.allSettled([
      api.get('/ranking?limit=500'),
      api.get('/ranking/favorites').catch(() => ({ data: { data: [] } })),
    ]).then(([rRes, fRes]) => {
      if (rRes.status === 'fulfilled') setRanking(rRes.value.data.data.ranking || [])
      else show(t.ranking.errorLoad, 'error')
      if (fRes.status === 'fulfilled') setFavorites(new Set(fRes.value.data.data || []))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setShared(false)
    setAvatarFullscreen(false)
  }, [selected])

  // Filtro de favoritos aplicado sobre el ranking — siempre incluye las planillas propias
  const displayRanking = showOnlyFavorites
    ? ranking.filter(r => favorites.has(r.planilla_id) || r.user_id === user?.id)
    : ranking

  const isLoadingDisplay = loading

  const handleShare = async (r: RankingEntry) => {
    const text = t.ranking.shareText(r.user_name, r.position, r.puntos_totales)
    const url = window.location.origin + '/ranking'
    if (navigator.share) {
      await navigator.share({ title: 'PRODE Caballito', text, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleShareMine = async () => {
    if (!myEntry) return
    const text = t.ranking.shareMyText(myEntry.position, myEntry.puntos_totales)
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {})
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }
  }

  const handleToggleFavorite = useCallback(async (planillaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (togglingFav) return
    setTogglingFav(planillaId)
    try {
      const { data } = await api.post(`/ranking/favorites/${planillaId}`, {})
      setFavorites(prev => {
        const next = new Set(prev)
        if (data.action === 'added') next.add(planillaId)
        else next.delete(planillaId)
        return next
      })
    } catch {
      show(t.ranking.errorFavorite, 'error')
    } finally {
      setTogglingFav(null)
    }
  }, [togglingFav, show, t])

  const myEntry = ranking.find((r) => r.user_id === user?.id)
  const deltas = useRankingDeltas(ranking)

  if (loading) return <RankingSkeleton />

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold t-text-nav">{t.ranking.title}</h1>

      {/* Favoritos */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowOnlyFavorites(v => !v)}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
            showOnlyFavorites
              ? 'bg-yellow-400 text-yellow-900 border-yellow-400 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-yellow-300 hover:text-yellow-600'
          }`}
        >
          {t.ranking.favorites}
          {favorites.size > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${showOnlyFavorites ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {favorites.size}
            </span>
          )}
        </button>

      </div>

      {/* Banner explicativo — cerrable, se recuerda con localStorage */}
      {favBannerVisible && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 flex gap-3 items-start">
          <span className="text-xl shrink-0">⭐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-yellow-900">{t.ranking.favHintTitle}</p>
            <p className="text-xs text-yellow-700 mt-0.5 leading-relaxed">{t.ranking.favHintDesc}</p>
            <div className="mt-2 flex flex-col gap-1">
              <p className="text-xs text-yellow-700"><span className="font-semibold">1.</span> {t.ranking.favStep1}</p>
              <p className="text-xs text-yellow-700"><span className="font-semibold">2.</span> {t.ranking.favStep2}</p>
              <p className="text-xs text-yellow-700"><span className="font-semibold">3.</span> {t.ranking.favStep3}</p>
            </div>
          </div>
          <button
            onClick={closeFavBanner}
            className="shrink-0 text-yellow-400 hover:text-yellow-700 transition-colors text-xl leading-none mt-0.5"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {isLoadingDisplay ? (
        <RankingContentSkeleton />
      ) : (
        <>
          {/* Mi posición */}
          {myEntry && !showOnlyFavorites && (
            <>
            <div className={`t-gradient-hero rounded-xl p-4 text-white ${myEntry.position === 1 ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}>
              {myEntry.position === 1 && (
                <p className="text-xs text-yellow-300 font-bold mb-2 tracking-wide">👑 ¡Sos el líder! 🔥 No aflojés.</p>
              )}
              <div
                onClick={() => setSelected(myEntry)}
                className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="text-3xl font-black">{myEntry.position === 1 ? '👑' : `#${myEntry.position}`}</div>
                {myEntry.user_avatar
                  ? <img src={myEntry.user_avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30 shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg shrink-0">
                      {myEntry.user_name[0].toUpperCase()}
                    </div>
                }
                <div className="flex-1">
                  <p className="font-semibold">{myEntry.user_name}</p>
                  <p className="text-white/60 text-xs">{t.ranking.globalLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black t-text-secondary">{myEntry.puntos_totales}</p>
                  <p className="text-white/60 text-xs">{t.ranking.points}</p>
                </div>
              </div>

              {/* Social pressure — gap to rival */}
              {myEntry.position === 1 && (() => {
                const below = ranking.find(r => r.position === 2)
                if (!below || !myEntry.puntos_totales) return null
                const gap = myEntry.puntos_totales - below.puntos_totales
                return (
                  <p className="text-yellow-300/70 text-xs text-center mt-2">
                    {gap === 0
                      ? `¡${below.user_name} te empató! 👀 Cuidado`
                      : `${below.user_name} te persigue a ${gap} pt${gap !== 1 ? 's' : ''} 🔥`}
                  </p>
                )
              })()}
              {myEntry.position > 1 && (() => {
                const above = ranking.find(r => r.position === myEntry.position - 1)
                if (!above) return null
                const gap = above.puntos_totales - myEntry.puntos_totales
                return (
                  <p className="text-white/50 text-xs text-center mt-2">
                    {gap === 0
                      ? `Empatado con ${above.user_name} 🤝`
                      : `${above.user_name} te lleva ${gap} pt${gap !== 1 ? 's' : ''} — podés alcanzarlo`}
                  </p>
                )
              })()}

              {myEntry.puntos_totales > 0 && (
                <button
                  onClick={handleShareMine}
                  className="mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/25 transition-colors border border-white/20"
                >
                  {t.ranking.shareBtn}
                </button>
              )}
            </div>
            </>
          )}

          {showOnlyFavorites && displayRanking.length === 0 && (
            <EmptyState
              icon="⭐"
              message={`${t.ranking.noFavorites}. ${t.ranking.noFavoritesDesc}`}
              action={{ label: t.ranking.favHintCta, onClick: () => setShowOnlyFavorites(false) }}
            />
          )}

          {/* Tabla */}
          {displayRanking.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              {showOnlyFavorites && (
                <div className="t-bg-nav px-4 py-2 flex items-center gap-2">
                  <span className="text-yellow-400 text-sm">⭐</span>
                  <p className="text-xs font-semibold text-white/80">{t.ranking.favorites}</p>
                </div>
              )}
              <div className="grid grid-cols-[2rem_1fr_auto_auto_2rem] gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
                <span>#</span>
                <span>{t.ranking.player}</span>
                <span className="text-center">{t.ranking.exact}</span>
                <span className="text-right">{t.ranking.pts}</span>
                <span />
              </div>
              {displayRanking.map((r, i) => {
                const isMe = r.user_id === user?.id
                const isFav = favorites.has(r.planilla_id)
                const isToggling = togglingFav === r.planilla_id
                const deltaInfo = deltas.get(r.planilla_id)
                const rankChangeClass = deltaInfo?.delta && deltaInfo.delta > 0
                  ? 'row-rank-up'
                  : deltaInfo?.delta && deltaInfo.delta < 0
                    ? 'row-rank-down'
                    : deltaInfo?.isNew
                      ? 'row-rank-new'
                      : ''
                const podiumBorder = i < 3 ? PODIUM_BORDER[i] : ''
                const playerBadge = !isMe ? getPlayerBadge(r) : null
                return (
                  <div
                    key={r.planilla_id}
                    onClick={() => setSelected(r)}
                    style={{ '--row-i': Math.min(i, 25) } as React.CSSProperties}
                    className={`row-entrance ${rankChangeClass} ${podiumBorder} grid grid-cols-[2rem_1fr_auto_auto_2rem] gap-2 items-center px-4 py-3 cursor-pointer transition-colors ${i < displayRanking.length - 1 ? `border-b ${i === 0 ? 'border-yellow-100' : 'border-gray-50'}` : ''} ${i === 0 ? 'bg-yellow-50' : (isMe ? 't-row-me' : 'hover:bg-gray-50')}`}
                  >
                    <span className="text-sm font-bold text-gray-400">
                      {i < 3 ? MEDAL[i] : r.position}
                    </span>
                    <div className="min-w-0 flex items-center gap-2.5">
                      {r.user_avatar
                        ? <img src={r.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-100" />
                        : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 't-bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {r.user_name[0].toUpperCase()}
                          </div>
                      }
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-sm font-semibold truncate ${isMe ? 't-text-primary' : 't-text-nav'}`}>
                            {r.user_name} {isMe && <span className="text-xs font-normal">{t.ranking.you}</span>}
                          </p>
                          {isMe && myStreak >= 3 && <StreakBadge streak={myStreak} />}
                          {/* Gamification badge for other players */}
                          {playerBadge && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold shrink-0">
                              {playerBadge.emoji} {playerBadge.label}
                            </span>
                          )}
                          {/* Position delta badge */}
                          {deltaInfo && deltaInfo.delta > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-green-100 text-green-600 font-bold shrink-0 leading-none">
                              ↑{deltaInfo.delta}
                            </span>
                          )}
                          {deltaInfo && deltaInfo.delta < 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-500 font-bold shrink-0 leading-none">
                              ↓{Math.abs(deltaInfo.delta)}
                            </span>
                          )}
                          {deltaInfo?.isNew && (
                            <span className="inline-flex items-center text-[9px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-600 font-bold shrink-0 leading-none">
                              ★ nuevo
                            </span>
                          )}
                          {r.whatsapp_number && (
                            <a
                              href={`https://wa.me/${r.whatsapp_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              title={`WhatsApp${!isMe ? ` a ${r.user_name}` : ''}`}
                              className="shrink-0 transition-opacity opacity-70 hover:opacity-100 leading-none flex-none"
                              data-testid="whatsapp-link"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25D366' }}>
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-1.557.821-2.989 2.065-4.11 3.652a9.995 9.995 0 001.378 15.323c1.557.821 3.291 1.243 5.031 1.243 5.516 0 9.996-4.482 9.996-9.998 0-2.670-.997-5.165-2.806-7.151-1.81-1.988-4.307-3.192-7.010-3.457z" />
                              </svg>
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">{r.nombre_planilla}
                          {!r.precio_pagado && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">IMPAGO</span>}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-center text-gray-600">{r.exactos_count}</span>
                    <span className="font-black t-text-primary text-right">{r.puntos_totales}</span>
                    {/* Botón favorito — no mostrar en fila propia */}
                    {!isMe ? (
                      <button
                        onClick={(e) => handleToggleFavorite(r.planilla_id, e)}
                        disabled={isToggling}
                        title={isFav ? t.ranking.unfollow : t.ranking.follow}
                        aria-label={isFav ? t.ranking.unfollow : t.ranking.follow}
                        aria-pressed={isFav}
                        className={`text-base leading-none transition-all disabled:opacity-40 hover:scale-125 ${isFav ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}
                      >
                        {isToggling ? '…' : isFav ? '⭐' : '☆'}
                      </button>
                    ) : <span />}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Drawer de jugador */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto"
            style={{ animation: 'slideUp 0.25s ease-out both' }}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-6 pt-2 pb-5">
              <div className="flex flex-col items-center gap-2 mb-4">
                <button
                  onClick={() => selected.user_avatar && setAvatarFullscreen(true)}
                  disabled={!selected.user_avatar}
                  className={`rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0042A5] focus-visible:ring-offset-2 ${selected.user_avatar ? 'cursor-pointer active:scale-95 transition-transform' : 'cursor-default'}`}
                  aria-label={selected.user_avatar ? 'Ver foto completa' : undefined}
                >
                  {selected.user_avatar
                    ? <img src={selected.user_avatar} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-[#0042A5]/20 shadow-md" />
                    : <div className="w-24 h-24 rounded-full bg-[#0042A5] flex items-center justify-center text-4xl font-black text-white shadow-md">
                        {selected.user_name[0].toUpperCase()}
                      </div>
                  }
                </button>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-black">
                      {selected.position <= 3 ? MEDAL[selected.position - 1] : `#${selected.position}`}
                    </span>
                    <h2 className="text-lg font-bold text-[#001A4B]">{selected.user_name}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{selected.nombre_planilla}</p>
                  {!selected.precio_pagado && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">{t.ranking.noOfficial}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-black text-[#0042A5]">{selected.puntos_totales}</p>
                    <p className="text-xs text-gray-400">{t.ranking.points}</p>
                  </div>
                  {selected.user_id !== user?.id && (
                    <button
                      onClick={(e) => handleToggleFavorite(selected.planilla_id, e)}
                      disabled={togglingFav === selected.planilla_id}
                      className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        favorites.has(selected.planilla_id)
                          ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600'
                      }`}
                    >
                      {favorites.has(selected.planilla_id) ? '⭐' : '☆'}
                      {favorites.has(selected.planilla_id) ? t.ranking.unfollow : t.ranking.follow}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { label: t.ranking.exact,     value: selected.exactos_count,    color: 'text-red-500' },
                  { label: t.ranking.extraBonus, value: selected.aciertos_celeste, color: 'text-sky-500' },
                  { label: t.ranking.partial,    value: selected.aciertos_verde,   color: 'text-green-600' },
                  { label: t.ranking.tendency,   value: selected.aciertos_amarillo, color: 'text-yellow-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-black ${color}`}>{value || 0}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* Gap to leader */}
              {selected.position > 1 && ranking.length > 0 && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center">
                  <p className="text-xs text-blue-600 font-medium">
                    {(() => {
                      const leader = ranking[0]
                      const gap = leader.puntos_totales - selected.puntos_totales
                      return gap === 0
                        ? `¡Empató con el líder ${leader.user_name}! 🤝`
                        : `A ${gap} pt${gap !== 1 ? 's' : ''} del líder ${leader.user_name} 🏆`
                    })()}
                  </p>
                </div>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => handleShare(selected)}
                  disabled={selected.user_id !== user?.id}
                  className="flex-1 border-2 border-[#001A4B] text-[#001A4B] text-sm font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                  title={selected.user_id !== user?.id ? 'Comparte tu propia planilla' : ''}
                >
                  {shared ? t.ranking.copied : t.ranking.share}
                </button>
              </div>
            </div>
          </div>

          {/* Foto fullscreen */}
          {avatarFullscreen && selected.user_avatar && (
            <div
              className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center backdrop-blur-sm"
              onClick={() => setAvatarFullscreen(false)}
            >
              <img
                src={selected.user_avatar}
                alt={selected.user_name}
                className="max-w-[88vw] max-h-[88vh] rounded-2xl object-contain shadow-2xl"
                onClick={e => e.stopPropagation()}
              />
              <button
                onClick={() => setAvatarFullscreen(false)}
                className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white text-xl hover:bg-black/70 transition-colors"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

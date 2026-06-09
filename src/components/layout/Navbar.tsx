import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { useT } from '@/hooks/useT'
import { useNotificationHistory } from '@/hooks/useNotificationHistory'
import { api } from '@/api/client'
import { GanadoresModal } from './GanadoresModal'
import { NotificationHistoryDrawer } from '../NotificationHistoryDrawer'

export function Navbar() {
  const { user, logout, updateUser, isAdmin } = useAuthStore()
  const { show } = useToastStore()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [switchingLang, setSwitchingLang] = useState(false)
  const [showGanadores, setShowGanadores] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const { unreadCount } = useNotificationHistory()
  const [hasGanadas, setHasGanadas] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    api.get('/matchdays/me').then(res => {
      const history: { is_winner: boolean }[] = res.data?.data?.history ?? []
      setHasGanadas(history.some(m => m.is_winner))
    }).catch(() => {})
  }, [user?.id])

  const navLinks: { to: string; label: string; icon: string; external?: boolean }[] = [
    { to: '/reglamento',                label: t.nav.rules,   icon: '📖' },
    { to: '/',                          label: t.nav.home,    icon: '🏠' },
    { to: '/apuestas',                  label: t.nav.bets,    icon: '⚽' },
    { to: '/matriz',                    label: t.nav.matrix,  icon: '📊' },
    { to: '/ranking',                   label: t.nav.ranking, icon: '🏆' },
    ...(hasGanadas ? [{ to: '/ganadas', label: 'Ganadas',     icon: '🥇' }] : []),
    { to: '/fixture',                   label: t.nav.fixture, icon: '🗓️' },
  ]

  const adminLinks = [
    { to: '/messages', label: t.nav.messages, icon: '💬' },
  ]

  const handleLogout = async () => {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }) } catch { /* ignore */ }
    logout()
    navigate('/login')
  }

  const handleToggleLang = async () => {
    if (!user || switchingLang) return
    const newLang = user.idioma_pref === 'pt' ? 'es' : 'pt'
    updateUser({ idioma_pref: newLang })
    setSwitchingLang(true)
    try {
      await api.put(`/users/${user.id}`, { idioma_pref: newLang })
    } catch (err: any) {
      show('No se pudo cambiar el idioma', 'error')
    } finally {
      setSwitchingLang(false)
    }
  }

  if (!user) return null

  const langFlag = user.idioma_pref === 'pt' ? '🇧🇷' : '🇦🇷'

  return (
    <nav
      className="text-white sticky top-0 z-40"
      style={{
        background: 'var(--theme-nav-bg)',
        borderBottom: '1px solid rgba(201,162,74,0.18)',
        boxShadow: '0 1px 24px rgba(0,0,0,0.6)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-black text-lg shrink-0">
          <span
            className="flex items-center justify-center text-base font-black rounded-lg"
            style={{
              background: 'linear-gradient(145deg, #C9A24A, #E5C980)',
              color: '#06070E',
              width: 28, height: 28,
              fontSize: 14,
              boxShadow: '0 2px 8px rgba(201,162,74,0.4)',
            }}
          >
            ♦
          </span>
          <span
            className="hidden sm:block text-sm font-black tracking-wider"
            style={{ letterSpacing: '0.10em' }}
          >
            PRODE{' '}
            <span style={{ color: 'var(--theme-secondary)' }}>HR</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => l.external ? (
            <a
              key={l.to}
              href={l.to}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
            >
              {l.icon} {l.label}
            </a>
          ) : (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 text-sm font-medium transition-all hover:opacity-100"
              style={location.pathname === l.to
                ? { color: 'var(--theme-secondary)', opacity: 1, borderBottom: '2px solid var(--theme-secondary)', paddingBottom: 4 }
                : { opacity: 0.65 }}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => setShowGanadores(true)}
            className="px-3 py-1.5 text-sm font-medium transition-all hover:opacity-100"
            style={{ opacity: 0.65 }}
          >
            🏆 {t.nav.winners}
          </button>
          {isAdmin() && adminLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-1.5 text-sm font-medium transition-all hover:opacity-100"
              style={location.pathname === l.to
                ? { color: 'var(--theme-secondary)', opacity: 1, borderBottom: '2px solid var(--theme-secondary)', paddingBottom: 4 }
                : { opacity: 0.65 }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin() && (
            <Link
              to="/admin"
              className="px-3 py-1.5 text-sm font-medium transition-all hover:opacity-100"
              style={location.pathname.startsWith('/admin')
                ? { color: 'var(--theme-secondary)', opacity: 1, borderBottom: '2px solid var(--theme-secondary)', paddingBottom: 4 }
                : { opacity: 0.65 }}
            >
              {t.nav.admin}
            </Link>
          )}
        </div>

        {/* Right: lang toggle + notifications + avatar */}
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={handleToggleLang}
            disabled={switchingLang}
            title={t.nav.switchLang}
            className="text-lg leading-none px-1 py-0.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {langFlag}
          </button>

          {/* Notifications button */}
          <button
            onClick={() => setShowNotifications(true)}
            title="Notificaciones"
            className="relative text-lg leading-none px-1 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            🔔
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>

          <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {user.foto_url
              ? <img src={user.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" style={{ border: '2px solid rgba(201,162,74,0.5)' }} />
              : <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--theme-primary)', color: 'var(--theme-on-primary)' }}
                >
                  {user.nombre[0].toUpperCase()}
                </div>
            }
            <span className="hidden sm:block text-sm max-w-[120px] truncate">{user.nombre}</span>
          </Link>
          <button onClick={handleLogout} className="hidden md:block text-xs text-white/60 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors">
            {t.nav.logout}
          </button>

          {/* Mobile hamburger */}
          <button className="md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1"
          style={{ background: 'var(--theme-nav-bg-2)' }}
        >
          {navLinks.map((l) => l.external ? (
            <a key={l.to} href={l.to} target="_blank" rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>{l.icon}</span>{l.label}
            </a>
          ) : (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
          <button
            onClick={() => { setShowGanadores(true); setMenuOpen(false) }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white w-full text-left"
          >
            <span>🏆</span>{t.nav.winners}
          </button>
          {isAdmin() && adminLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>{l.icon}</span>{l.label}
            </Link>
          ))}
          {isAdmin() && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
              <span>⚙️</span>{t.nav.admin}
            </Link>
          )}
          <button onClick={handleToggleLang} disabled={switchingLang}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-white/80">
            <span className="text-base">{langFlag}</span>
            {t.nav.switchLang}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-sm text-red-300 mt-2 border-t border-white/10 pt-3">
            <span>🚪</span>{t.nav.logoutMobile}
          </button>
        </div>
      )}

      {showGanadores && <GanadoresModal onClose={() => setShowGanadores(false)} />}
      {showNotifications && (
        <NotificationHistoryDrawer
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Mobile bottom tab bar — compacto, fuera del <nav> sticky */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex backdrop-blur-md"
        style={{
          background: 'rgba(6,7,14,0.96)',
          borderTop: '1px solid rgba(201,162,74,0.18)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        }}
      >
        {[...navLinks.filter(l => !l.external), ...(isAdmin() ? adminLinks : [])].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex-1 flex flex-col items-center justify-center py-1.5 gap-0.5 transition-all"
            style={location.pathname === l.to
              ? { color: '#C9A24A' }
              : { color: 'rgba(240,234,214,0.38)' }}
          >
            <span className="text-base leading-none">{l.icon}</span>
            <span className="text-[9px] font-medium leading-none">{l.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

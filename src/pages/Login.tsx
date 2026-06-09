import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

export function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { show } = useToastStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      setAuth(data.data.user, data.data.token, data.data.refreshToken)
      navigate('/')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al iniciar sesión'
      show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, #0E0F1F 0%, #070912 55%, #030408 100%)',
      }}
    >
      {/* Decorative grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ opacity: 0.06 }}
      >
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(201,162,74,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,74,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Radial gold spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 600px 400px at 50% 50%, rgba(201,162,74,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Outer glow border */}
        <div
          className="absolute -inset-px rounded-2xl hr-border-pulse"
          style={{ background: 'linear-gradient(135deg, rgba(201,162,74,0.35), rgba(201,162,74,0.10), rgba(201,162,74,0.35))', zIndex: 0, borderRadius: 20 }}
          aria-hidden="true"
        />

        {/* Card */}
        <div
          className="relative overflow-hidden"
          style={{
            background: 'rgba(7,9,18,0.96)',
            borderRadius: 20,
            border: '1px solid rgba(201,162,74,0.28)',
            boxShadow: '0 0 60px rgba(201,162,74,0.06), 0 40px 80px rgba(0,0,0,0.6)',
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div className="text-center px-8 pt-10 pb-6">
            {/* Diamond logo mark */}
            <div
              className="mx-auto mb-4 flex items-center justify-center hr-glow"
              style={{
                width: 64, height: 64,
                background: 'linear-gradient(145deg, #C9A24A, #E5C980, #A8822A)',
                borderRadius: 16,
                fontSize: 30,
                color: '#070912',
                fontWeight: 900,
                boxShadow: '0 8px 28px rgba(201,162,74,0.45)',
              }}
            >
              ♦
            </div>

            <h1
              className="text-white font-black tracking-wider"
              style={{ fontSize: 17, letterSpacing: '0.14em' }}
            >
              PRODE HIGH ROLLING
            </h1>
            <p
              className="mt-1 font-bold tracking-widest"
              style={{ fontSize: 10, color: '#C9A24A', letterSpacing: '0.22em' }}
            >
              MUNDIAL 2026
            </p>
          </div>

          {/* Gold divider */}
          <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(201,162,74,0.35), transparent)', margin: '0 28px' }} />

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div>
              <label
                className="block text-xs font-bold mb-1.5 tracking-wider uppercase"
                style={{ color: 'rgba(201,162,74,0.75)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(201,162,74,0.25)',
                  color: '#F0EAD6',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,162,74,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(201,162,74,0.25)')}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label
                className="block text-xs font-bold mb-1.5 tracking-wider uppercase"
                style={{ color: 'rgba(201,162,74,0.75)' }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(201,162,74,0.25)',
                  color: '#F0EAD6',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,162,74,0.6)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(201,162,74,0.25)')}
                placeholder="••••••"
                required
              />
            </div>

            {/* CTA button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full font-black text-sm py-3.5 rounded-xl transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 mt-1"
              style={{
                background: 'linear-gradient(135deg, #C9A24A, #D4BB7C, #A8822A)',
                color: '#070912',
                letterSpacing: '0.06em',
                boxShadow: loading ? 'none' : '0 6px 24px rgba(201,162,74,0.4)',
              }}
            >
              {loading ? 'Ingresando...' : 'INGRESAR'}
            </button>

            <p className="text-center text-xs" style={{ color: 'rgba(240,234,214,0.45)' }}>
              <Link
                to="/recuperar-contrasena"
                className="hover:underline transition-colors"
                style={{ color: 'rgba(201,162,74,0.7)' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>

            {/* Gold divider + register */}
            <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(201,162,74,0.18), transparent)' }} />

            <p className="text-center text-xs" style={{ color: 'rgba(240,234,214,0.4)' }}>
              ¿No tenés cuenta?{' '}
              <Link
                to="/register"
                className="font-bold hover:underline"
                style={{ color: '#C9A24A' }}
              >
                Registrate
              </Link>
            </p>
          </form>
        </div>

        {/* Bottom tagline */}
        <p
          className="text-center mt-5 text-xs tracking-widest font-semibold"
          style={{ color: 'rgba(201,162,74,0.35)', letterSpacing: '0.2em' }}
        >
          ACCESO EXCLUSIVO
        </p>
      </div>
    </div>
  )
}

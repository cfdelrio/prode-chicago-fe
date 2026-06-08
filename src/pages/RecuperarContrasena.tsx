import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useToastStore } from '@/store/toastStore'
import { Button } from '@/components/ui/Button'

export function RecuperarContrasena() {
  const { show } = useToastStore()
  const navigate = useNavigate()

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      show('Te enviamos un código al email', 'success')
      setStep('code')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error al enviar email'
      show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      show('Las contraseñas no coinciden', 'error')
      return
    }
    if (password.length < 6) {
      show('La contraseña debe tener al menos 6 caracteres', 'error')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, code, newPassword: password })
      show('Contraseña restablecida correctamente', 'success')
      navigate('/login')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Código inválido o expirado'
      show(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001A4B] to-[#0042A5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-[#001A4B] to-[#0042A5] px-8 py-6 text-center">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-white font-bold text-2xl">PRODE Caballito</h1>
          <p className="text-[#FFDF00] text-sm mt-1">Recuperar Contraseña</p>
        </div>

        <div className="p-8 space-y-4">
          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <p className="text-gray-600 text-sm">
                Ingresá tu email y te enviamos un código de 6 dígitos.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              <Button type="submit" size="lg" fullWidth loading={loading}>
                {loading ? 'Enviando...' : 'Enviar Código'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-gray-600 text-sm">
                Revisá tu email <strong>{email}</strong> e ingresá el código de 6 dígitos.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm text-center tracking-[0.5em] font-bold text-lg"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
                  placeholder="••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
                  placeholder="••••••"
                  required
                />
              </div>
              <Button type="submit" size="lg" fullWidth loading={loading}>
                {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
              </Button>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Volver a ingresar email
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            <Link to="/login" className="text-[#0042A5] font-semibold hover:underline">
              Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

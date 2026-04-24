import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка входа')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0f172a' }}
    >
      <div
        className="p-8 rounded-2xl w-full max-w-md shadow-2xl"
        style={{ backgroundColor: '#1e293b' }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span style={{ color: '#ef4444' }}>L</span>
            <span className="text-white">ife</span>
            <span style={{ color: '#ef4444' }}>Q</span>
            <span className="text-white">uest</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Войдите в свой аккаунт</p>
        </div>

        {error && (
          <div
            className="p-3 rounded-lg mb-4 text-sm"
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              style={inputStyle}
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Пароль</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-white rounded-lg px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                style={inputStyle}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full font-semibold py-3 rounded-lg transition-opacity mt-2 text-white"
            style={{ backgroundColor: '#4f46e5', opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-slate-500 text-center mt-6 text-sm">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  )
}
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await register(name, email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
  }

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value)
    if (error) setError('')
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
        {/* Логотип */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span style={{ color: '#ef4444' }}>L</span>
            <span className="text-white">ife</span>
            <span style={{ color: '#ef4444' }}>Q</span>
            <span className="text-white">uest</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Создайте аккаунт</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Имя</label>
            <input
              type="text"
              value={name}
              onChange={handleChange(setName)}
              className="w-full text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              style={inputStyle}
              placeholder="Иван Иванов"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={handleChange(setEmail)}
              className="w-full text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              style={inputStyle}
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={handleChange(setPassword)}
              className="w-full text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              style={inputStyle}
              placeholder="Минимум 6 символов"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full font-semibold py-3 rounded-lg transition-colors mt-2"
            style={{ backgroundColor: '#4f46e5' }}
          >
            <span className="text-white">
              {isLoading ? 'Создание...' : 'Создать аккаунт'}
            </span>
          </button>
        </form>

        <p className="text-slate-500 text-center mt-6 text-sm">
          Уже есть аккаунт?{' '}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
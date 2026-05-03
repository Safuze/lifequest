import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAuth } from '../hooks/useAuth'
import {
  User, Lock, Eye, EyeOff, Shield, Trash2,
  Moon, Sun, Bell, Save, ChevronRight, AlertTriangle
} from 'lucide-react'

type Theme = 'dark' | 'light'

interface DeleteModalProps {
  onConfirm: (password: string) => Promise<void>
  onClose: () => void
}

function DeleteAccountModal({ onConfirm, onClose }: DeleteModalProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!password) { setError('Введите пароль для подтверждения'); return }
    setLoading(true)
    try {
      await onConfirm(password)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка удаления')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 z-10"
        style={{ backgroundColor: '#1e293b', border: '1px solid rgba(239,68,68,0.4)' }}>
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} className="text-red-400 shrink-0" />
          <h3 className="text-white font-semibold text-lg">Удалить аккаунт?</h3>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Это действие необратимо. Все данные, прогресс, задачи, привычки и достижения будут удалены навсегда.
        </p>
        {error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}
        <div className="mb-4">
          <label className="text-slate-400 text-sm mb-1.5 block">Введите пароль для подтверждения</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 text-white"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
            placeholder="Ваш пароль"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-slate-400 font-medium"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            Отмена
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#ef4444', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Удаление...' : 'Удалить аккаунт'}
          </button>
        </div>
      </div>
    </div>
  )
}

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <span className="text-indigo-400">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  )

  const ToggleSwitch = ({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <button
      onClick={() => !disabled && onChange(!value)}
      className="w-12 h-6 rounded-full transition-colors relative shrink-0"
      style={{ backgroundColor: value ? '#4f46e5' : '#334155', cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all"
        style={{ left: value ? '26px' : '2px' }} />
    </button>
  )

export default function SettingsPage() {
  const navigate = useNavigate()
  const { loadUser, logout } = useAuth()

  const [userData, setUserData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Форма профиля
  const [name, setName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [nameError, setNameError] = useState('')

  // Форма пароля
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [pwdError, setPwdError] = useState('')

  // Приватность
  const [isProfilePublic, setIsProfilePublic] = useState(true)
  const [privacySaving, setPrivacySaving] = useState(false)

  // Тема
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('lifequest_theme') as Theme) || 'dark'
  )

  // Уведомления
  const [notifEnabled, setNotifEnabled] = useState(() =>
    localStorage.getItem('lifequest_notif') !== 'false'
  )

  // Модалка удаления
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/users/settings')
        setUserData(res.data.user)
        setName(res.data.user.name)
        setIsProfilePublic(res.data.user.isProfilePublic ?? true)
      } catch (error) {
        console.error('Settings load error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const handleSaveName = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Имя должно содержать минимум 2 символа')
      return
    }
    setNameSaving(true)
    setNameError('')
    try {
      await apiClient.patch('/users/settings', { name: name.trim() })
      setNameSuccess(true)
      loadUser()
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err: any) {
      setNameError(err.response?.data?.error || 'Ошибка сохранения')
    } finally {
      setNameSaving(false)
    }
  }

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPwdError('Заполните оба поля')
      return
    }
    setPwdSaving(true)
    setPwdError('')
    try {
      await apiClient.patch('/users/settings', { currentPassword, newPassword })
      setPwdSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setTimeout(() => setPwdSuccess(false), 3000)
    } catch (err: any) {
      setPwdError(err.response?.data?.error || 'Ошибка смены пароля')
    } finally {
      setPwdSaving(false)
    }
  }

  const handlePrivacyToggle = async (value: boolean) => {
    setIsProfilePublic(value)
    setPrivacySaving(true)
    try {
      await apiClient.patch('/users/settings', { isProfilePublic: value })
    } catch (error) {
      setIsProfilePublic(!value) // откатываем
    } finally {
      setPrivacySaving(false)
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('lifequest_theme', newTheme)
    // Применяем тему через class на body
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleNotifToggle = async (value: boolean) => {
    setNotifEnabled(value)
    localStorage.setItem('lifequest_notif', String(value))
    if (value && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') setNotifEnabled(false)
    }
  }

  const handleDeleteAccount = async (password: string) => {
    await apiClient.delete('/users/account', { data: { password } })
    logout()
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка настроек...</div>
      </div>
    )
  }

  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }

  

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-white">Настройки</h1>
        <p className="text-slate-400 text-sm mt-1">Управление аккаунтом и предпочтениями</p>
      </div>

      {/* Профиль */}
      <Section title="Профиль" icon={<User size={18} />}>
        <div className="space-y-4">
          {userData && (
            <div className="flex items-center gap-3 p-3 rounded-xl mb-4"
              style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                {userData.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{userData.name}</p>
                <p className="text-slate-500 text-xs">{userData.email} · ID #{userData.id}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Отображаемое имя</label>
            <div className="flex gap-2">
              <input
                type="text" value={name} onChange={e => { setName(e.target.value); setNameError('') }}
                className="flex-1 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                style={inputStyle}
                placeholder="Ваше имя"
              />
              <button onClick={handleSaveName} disabled={nameSaving}
                className="px-4 py-3 rounded-lg text-white font-medium flex items-center gap-1"
                style={{ backgroundColor: nameSuccess ? '#22c55e' : '#4f46e5', opacity: nameSaving ? 0.7 : 1 }}>
                <Save size={16} />
                {nameSaving ? 'Сохранение...' : nameSuccess ? 'Сохранено!' : 'Сохранить'}
              </button>
            </div>
            {nameError && <p className="text-red-400 text-xs mt-1">{nameError}</p>}
          </div>
        </div>
      </Section>

      {/* Пароль */}
      <Section title="Безопасность" icon={<Lock size={18} />}>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Текущий пароль</label>
            <div className="relative">
              <input
                type={showCurrentPwd ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => { setCurrentPassword(e.target.value); setPwdError('') }}
                className="w-full rounded-lg px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-indigo-500"
                style={inputStyle}
                placeholder="••••••••"
              />
              <button onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Новый пароль</label>
            <div className="relative">
              <input
                type={showNewPwd ? 'text' : 'password'}
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPwdError('') }}
                className="w-full rounded-lg px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-indigo-500"
                style={inputStyle}
                placeholder="Минимум 6 символов"
              />
              <button onClick={() => setShowNewPwd(!showNewPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {pwdError && <p className="text-red-400 text-sm">{pwdError}</p>}

          <button onClick={handleSavePassword} disabled={pwdSaving}
            className="w-full py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: pwdSuccess ? '#22c55e' : '#4f46e5', opacity: pwdSaving ? 0.7 : 1 }}>
            {pwdSaving ? 'Изменение...' : pwdSuccess ? '✓ Пароль изменён' : 'Изменить пароль'}
          </button>
        </div>
      </Section>

      {/* Приватность */}
      <Section title="Приватность" icon={<Shield size={18} />}>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div>
              <p className="text-white text-sm font-medium">Открытый профиль</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {isProfilePublic ? 'Другие могут видеть вашу статистику' : 'Профиль виден только вам'}
              </p>
            </div>
            <ToggleSwitch value={isProfilePublic} onChange={handlePrivacyToggle} disabled={privacySaving} />
          </div>
        </div>
      </Section>

      {/* Внешний вид */}
      <Section title="Внешний вид" icon={<Sun size={18} />}>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Тема интерфейса</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'dark', label: 'Тёмная', icon: <Moon size={16} />, desc: 'Меньше нагрузка на глаза' },
                { id: 'light', label: 'Светлая', icon: <Sun size={16} />, desc: 'Для светлых помещений' },
              ] as const).map(opt => (
                <button key={opt.id} onClick={() => handleThemeChange(opt.id)}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                  style={{
                    backgroundColor: theme === opt.id ? 'rgba(99,102,241,0.2)' : '#0f172a',
                    border: `1px solid ${theme === opt.id ? '#6366f1' : '#334155'}`,
                  }}>
                  <span className={theme === opt.id ? 'text-indigo-400' : 'text-slate-400'}>{opt.icon}</span>
                  <div>
                    <p className="text-white text-sm">{opt.label}</p>
                    <p className="text-slate-500 text-xs">{opt.desc}</p>
                  </div>
                  {theme === opt.id && <span className="text-indigo-400 text-xs ml-auto">✓</span>}
                </button>
              ))}
            </div>
            {theme === 'light' && (
              <p className="text-yellow-400 text-xs mt-2">⚠️ Светлая тема в разработке — применится в следующей версии</p>
            )}
          </div>
        </div>
      </Section>

      {/* Уведомления */}
      <Section title="Уведомления" icon={<Bell size={18} />}>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div>
              <p className="text-white text-sm font-medium">Push-уведомления</p>
              <p className="text-slate-500 text-xs mt-0.5">Оповещения об окончании помодоро-сессий</p>
            </div>
            <ToggleSwitch value={notifEnabled} onChange={handleNotifToggle} />
          </div>
        </div>
      </Section>

      {/* Данные аккаунта */}
      <Section title="Аккаунт" icon={<User size={18} />}>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-slate-800/30"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <span className="text-slate-300 text-sm">Просмотреть профиль</span>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>
      </Section>

      {/* Опасная зона */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(239,68,68,0.3)' }}>
        <h2 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle size={18} /> Опасная зона
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          Удаление аккаунта приведёт к безвозвратной потере всех данных: задач, привычек, целей, достижений и золота.
        </p>
        <button onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all"
          style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          <Trash2 size={16} /> Удалить аккаунт
        </button>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}
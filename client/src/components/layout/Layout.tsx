import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import apiClient from '../../api/client'
import AchievementToast from '../AchievementToast'
import { RewardModalManager } from '../RewardModal'
import { getAvatarBorderStyle, getAvatarBorderClass } from '../../utils/avatar'
import { LEVEL_XP } from '../../data/levelData'
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Timer,
  Repeat,
  BarChart3,
  Trophy,
  Users,
  Settings,
  LogOut,
  Bell,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ShoppingBag
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/goals',       icon: Target,          label: 'Goals'        },
  { to: '/tasks',       icon: CheckSquare,     label: 'Tasks'        },
  { to: '/pomodoro',    icon: Timer,           label: 'Pomodoro'     },
  { to: '/habits',      icon: Repeat,          label: 'Habits'       },
  { to: '/lifescope',   icon: BarChart3,       label: 'LifeScope'    },
  { to: '/leaderboard', icon: Trophy,          label: 'Leaderboard'  },
  { to: '/friends',     icon: Users,           label: 'Friends'      },
  { to: '/shop',        icon: ShoppingBag,     label: 'Shop'         },
]

// Тип уведомления
interface AppNotification {
  id: number
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
  data?: any
}

// Компонент уведомлений (добавь в Layout перед return):
function NotificationDropdown({
    onClose,
    onUnreadCountChange,
  }: {
    onClose: () => void
    onUnreadCountChange: React.Dispatch<React.SetStateAction<number>>
  }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/notifications')
        setNotifications(res.data.notifications)
        // Синхронизируем счётчик сразу при открытии
        onUnreadCountChange(res.data.unreadCount)
      } catch { /* ignore */ }
      finally { setIsLoading(false) }
    }
    load()
  }, [])

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      onUnreadCountChange(0) // ← сразу обнуляем
    } catch { /* ignore */ }
  }

  const markRead = async (id: number) => {
    const notif = notifications.find(n => n.id === id)
    if (!notif || notif.isRead) return
    try {
      await apiClient.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      // Декрементируем счётчик немедленно
      onUnreadCountChange(prev => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  const getIcon = (type: string) => {
    if (type === 'friend_request') return '👥'
    if (type === 'task_due') return '⏰'
    if (type === 'habit_reminder') return '🔥'
    if (type === 'achievement') return '🏅'
    return '🔔'
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
      style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #334155' }}>
        <h3 className="text-white font-semibold text-sm">Уведомления</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.isRead) && (
            <button onClick={markAllRead} className="text-indigo-400 text-xs hover:text-indigo-300">
              Прочитать все
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-slate-400 text-sm">Загрузка...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="text-slate-400 text-sm">Нет уведомлений</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div key={notif.id}
              className="flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
              style={{
                borderBottom: '1px solid #334155',
                backgroundColor: notif.isRead ? 'transparent' : 'rgba(99,102,241,0.05)',
              }}
              onClick={() => !notif.isRead && markRead(notif.id)}>
              <span className="text-xl shrink-0 mt-0.5">{getIcon(notif.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{notif.title}</p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{notif.body}</p>
                <p className="text-slate-600 text-xs mt-1">
                  {new Date(notif.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!notif.isRead && (
                <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingAchievements, setPendingAchievements] = useState<any[]>([])


  function getXpProgress(xp: number) {
    let level = 0

    for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_XP[i]) {
        level = i
        break
      }
    }

    const nextLevelXp = LEVEL_XP[level + 1] || LEVEL_XP[level] + 10000
    const prevLevelXp = LEVEL_XP[level]

    return Math.round(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)
  }
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { achievements } = e.detail || {}

      if (achievements?.length > 0) {
        setPendingAchievements(prev => [...prev, ...achievements])
      }
    }

    window.addEventListener('rewards', handler as EventListener)
    return () => window.removeEventListener('rewards', handler as EventListener)
  }, [])

  // Загружаем счётчик непрочитанных
  useEffect(() => {
    const loadUnread = async () => {
      try {
        const res = await apiClient.get('/notifications')
        setUnreadCount(res.data.unreadCount)
      } catch { /* ignore */ }
    }
    loadUnread()
    const interval = setInterval(loadUnread, 60000) // каждую минуту
    return () => clearInterval(interval)
  }, [])

  const sidebarWidth = collapsed ? '72px' : '220px'

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: '#0f172a' }}
    >
      {/* Sidebar */}
      <aside
        className="flex flex-col fixed top-0 left-0 h-full z-40 transition-all duration-300"
        style={{ width: sidebarWidth, backgroundColor: '#1e293b', borderRight: '1px solid #334155' }}
      >
        {/* Логотип */}
        <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: '1px solid #334155' }}>
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight">
              <span style={{ color: '#ef4444' }}>L</span>
              <span className="text-white">ife</span>
              <span style={{ color: '#ef4444' }}>Q</span>
              <span className="text-white">uest</span>
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Навигация */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`
              }
              style={({ isActive }) =>
                isActive ? { backgroundColor: '#4f46e5' } : {}
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Нижняя часть */}
        <div className="px-2 py-4 space-y-1" style={{ borderTop: '1px solid #334155' }}>
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title={collapsed ? 'Выйти' : undefined}
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Выйти</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {/* Header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}
        >
          <div />
          <div className="flex items-center gap-4">
            {/* XP и уровень */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400">Уровень {user?.level}</div>
                <div className="text-xs text-yellow-400 font-medium">{user?.xp} XP</div>
              </div>
              {/* XP прогресс бар */}
              <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${getXpProgress(user?.xp || 0)}%` }}
                />
              </div>
            </div>

            {/* Золото */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-yellow-400 text-sm">Credits: </span>
              <span className="text-yellow-400 text-sm font-medium">{Number(user?.gold).toFixed(1).replace(/\.0$/, '')}</span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                style={{ backgroundColor: 'rgba(30,41,59,0.8)' }}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: '#ef4444' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationDropdown
                  onClose={() => setShowNotifications(false)}
                  onUnreadCountChange={setUnreadCount} 
                />
              )}
            </div>

            {/* Аватар */}
            <button
              onClick={() => navigate('/profile')}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarBorderClass(user?.avatarBorder)}`}
              style={{
                backgroundColor: '#4f46e5',
                ...getAvatarBorderStyle(user?.avatarBorder || 'default'),
              }}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievements={pendingAchievements}
          onDismiss={() => setPendingAchievements(prev => prev.slice(1))}
        />
      )}
      <RewardModalManager />
    </div>
  )
}
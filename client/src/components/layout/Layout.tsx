import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
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
  ChevronLeft,
  ChevronRight,
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
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
                  style={{ width: `${Math.min((user?.xp || 0) % 1000 / 10, 100)}%` }}
                />
              </div>
            </div>

            {/* Золото */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-yellow-400 text-sm">🪙</span>
              <span className="text-yellow-400 text-sm font-medium">{user?.gold}</span>
            </div>

            {/* Уведомления */}
            <button className="text-slate-400 hover:text-white transition-colors relative">
              <Bell size={20} />
            </button>

            {/* Аватар */}
            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#4f46e5' }}
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
    </div>
  )
}
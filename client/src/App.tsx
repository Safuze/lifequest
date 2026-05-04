import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import GoalsPage from './pages/GoalsPage'
import TasksPage from './pages/TasksPage'
import PomodoroPage from './pages/PomodoroPage'
import HabitsPage from './pages/HabitsPage'
import LifeScopePage from './pages/LifeScopePage'
import ProfilePage from './pages/ProfilePage'
import LeaderboardPage from './pages/LeaderboardPage'
import PublicProfilePage from './pages/PublicProfilePage'
import FriendsPage from './pages/FriendsPage'
import SettingsPage from './pages/SettingsPage'
import ShopPage from './pages/ShopPage'

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-slate-400">В разработке...</p>
    </div>
  </div>
)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { loadUser } = useAuth()
  const [appLoading, setAppLoading] = useState(true)

  useEffect(() => {
    loadUser().finally(() => setAppLoading(false))
  }, [])

  if (appLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="text-slate-400">Загрузка...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="pomodoro" element={<PomodoroPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="lifescope" element={<LifeScopePage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:userId" element={<PublicProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="shop" element={<ShopPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
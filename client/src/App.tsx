import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Временная заглушка для Dashboard
function DashboardPage() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold">Добро пожаловать, {user?.name}!</h1>
      <p className="text-gray-400 mt-2">Уровень: {user?.level} | XP: {user?.xp} | Золото: {user?.gold}</p>
      <button
        onClick={logout}
        className="mt-4 bg-red-600 px-4 py-2 rounded-lg"
      >
        Выйти
      </button>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="min-h-screen bg-gray-950" />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { loadUser } = useAuth()

  useEffect(() => {
    loadUser()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
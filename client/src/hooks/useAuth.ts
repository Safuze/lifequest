import { create } from 'zustand'
import type { User } from '../api/auth'
import { authApi } from '../api/auth'
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const data = await authApi.login({ email, password })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    set({ user: data.user, isAuthenticated: true })
  },

  register: async (name, email, password) => {
    const data = await authApi.register({ name, email, password })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    set({ user: data.user, isAuthenticated: true })
  },

  logout: () => {
    authApi.logout()
    set({ user: null, isAuthenticated: false })
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const data = await authApi.getMe()
      set({ user: data.user, isAuthenticated: true })
    } catch {
      authApi.logout()
    }
  },
}))
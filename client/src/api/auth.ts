import apiClient from './client'

export interface User {
  id: number
  publicId: string
  name: string
  email: string
  level: number
  xp: number
  gold: number
  characterClass: string
  avatar: string | null
  theme: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export const authApi = {
  register: async (data: {
    name: string
    email: string
    password: string
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data)
    return response.data
  },

  login: async (data: {
    email: string
    password: string
  }): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', data)
    return response.data
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },
}
import apiClient from './client'

export interface Habit {
  id: number
  title: string
  type: 'positive' | 'anti'
  trackingType: 'discrete' | 'continuous'
  frequency: string
  timesPerDay: number
  currentStreak: number
  bestStreak: number
  startDate: string | null
  logs: { id: number; date: string; repetition: number }[]
  createdAt: string
}

export interface HabitTemplate {
  title: string
  type: string
  trackingType: string
  timesPerDay: number
  category: string
}

export const habitsApi = {
  getAll: async (): Promise<{ habits: Habit[] }> => {
    const res = await apiClient.get('/habits')
    return res.data
  },
  getTemplates: async (): Promise<{ templates: HabitTemplate[] }> => {
    const res = await apiClient.get('/habits/templates')
    return res.data
  },
  create: async (data: {
    title: string
    type: string
    trackingType: string
    frequency?: string
    timesPerDay?: number
  }): Promise<{ habit: Habit }> => {
    const res = await apiClient.post('/habits', data)
    return res.data
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/habits/${id}`)
  },
  log: async (id: number): Promise<{
    success: boolean
    repetitionsDone: number
    repetitionsTotal: number
    isFullyCompleted: boolean
    currentStreak: number
    xpEarned: number
    goldEarned: number
    achievements: any[]
  }> => {
    const res = await apiClient.post(`/habits/${id}/log`)
    return res.data
  },
  restoreStreak: async (id: number): Promise<{ success: boolean; goldSpent: number }> => {
    const res = await apiClient.post(`/habits/${id}/restore-streak`)
    return res.data
  },
  getHeatmap: async (id: number): Promise<{ heatmap: Record<string, number> }> => {
    const res = await apiClient.get(`/habits/${id}/heatmap`)
    return res.data
  },
}
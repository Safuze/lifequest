import apiClient from './client'

export interface Goal {
  id: number
  title: string
  category: string
  horizon: string
  plannedHours: number | null
  spentHours: number
  progress: number
  status: string
  deadline: string | null
  createdAt: string
  _count?: { tasks: number }
}

export interface CreateGoalData {
  title: string
  category?: string
  horizon?: string
  plannedHours?: number
  deadline?: string
}

export const goalsApi = {
  getAll: async (): Promise<{ goals: Goal[] }> => {
    const res = await apiClient.get('/goals')
    return res.data
  },
  create: async (data: CreateGoalData): Promise<{ goal: Goal }> => {
    const res = await apiClient.post('/goals', data)
    return res.data
  },
  update: async (id: number, data: Partial<Goal & { deadline?: string | null }>): Promise<{ goal: Goal }> => {
    const res = await apiClient.patch(`/goals/${id}`, data)
    return res.data
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/goals/${id}`)
  },
}
import apiClient from './client'

export interface Goal {
  id: number
  title: string
  category: string
  horizon: string
  deadline: string | null
  plannedHours: number | null
  spentHours: number
  progress: number
  status: string
  createdAt: string
  _count?: { tasks: number }
}

export interface CreateGoalData {
  title: string
  category?: string
  horizon: string
  deadline?: string
  plannedHours?: number
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
  update: async (id: number, data: Partial<Goal>): Promise<{ goal: Goal }> => {
    const res = await apiClient.patch(`/goals/${id}`, data)
    return res.data
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/goals/${id}`)
  },
}
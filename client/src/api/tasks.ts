import apiClient from './client'

export interface Task {
  id: number
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category?: string
  labels: string[]
  status: 'todo' | 'inProgress' | 'done'
  goalId?: number | null
  goal?: { id: number; title: string; category: string } | null
  dueDate?: string | null
  completedAt?: string | null
  isPinned: boolean
  isFocusToday: boolean
  timeSpent: number
  subtasks?: { id: number; title: string; status: string }[]
  _count?: { sessions: number }
  createdAt: string
}

export interface CreateTaskData {
  title: string
  description?: string
  priority?: string
  category?: string
  labels?: string[]
  goalId?: number
  dueDate?: string
}

export const tasksApi = {
  getAll: async (params?: {
    status?: string
    priority?: string
    goalId?: number
    search?: string
  }): Promise<{ tasks: Task[] }> => {
    const res = await apiClient.get('/tasks', { params })
    return res.data
  },

  create: async (data: CreateTaskData): Promise<{ task: Task }> => {
    const res = await apiClient.post('/tasks', data)
    return res.data
  },

  update: async (id: number, data: Partial<Task>): Promise<{ task: Task }> => {
    const res = await apiClient.patch(`/tasks/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },
}
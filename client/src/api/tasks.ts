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
  totalPomodoroMin: number
  subtasks?: { id: number; title: string; status: string }[]
  createdAt: string
}

export interface CreateTaskData {
  title: string
  description?: string
  priority?: string
  category?: string
  labels?: string[]
  goalId?: number
  parentId?: number
  dueDate?: string
}
export interface AchievementItem {
  type: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface LevelUp {
  level: number
  levelName: string
}

export interface TaskReward {
  xp: number | null
  gold: number | null
}

export interface UpdateTaskResponse {
  task: Task
  reward?: { xp: number; gold: number }
  levelUp?: LevelUp | null
  achievements?: AchievementItem[]
}

export const tasksApi = {
  getAll: async (params?: {
    status?: string
    priority?: string
    category?: string
    goalId?: number
    date?: string
    search?: string
  }): Promise<{ tasks: Task[] }> => {
    const res = await apiClient.get('/tasks', { params })
    return res.data
  },

  create: async (data: CreateTaskData): Promise<{ task: Task }> => {
    const res = await apiClient.post('/tasks', data)
    return res.data
  },

  update: async (id: number, data: Partial<Task>): Promise<UpdateTaskResponse> => {
    const res = await apiClient.patch(`/tasks/${id}`, data)
    return res.data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },

  getArchived: async (): Promise<{ tasks: Task[] }> => {
    const res = await apiClient.get('/tasks/archive')
    return res.data
  },
}


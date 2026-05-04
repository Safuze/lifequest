import apiClient from './client'
export interface PomodoroSettings {
  id: number
  workDuration: number
  shortBreak: number
  longBreak: number
  cyclesBeforeLong: number
}

export interface PomodoroSession {
  id: number
  taskId: number
  goalId?: number | null
  plannedDuration: number
  actualDuration: number
  status: string
  startedAt: string
  completedAt?: string | null
  task?: { id: number; title: string; isFocusToday: boolean }
}

export interface TodayStats {
  totalMinutes: number
  sessionsCount: number
  completedCycles: number
}

export interface AchievementItem {
  type: string
  title: string
  description: string
  icon: string
  rarity: string
}

export interface LevelUp {
  level: number
  levelName: string
}
export interface CompleteSessionResponse {
  session: any
  reward: { xp: number; gold: number }
  cycleBonus: { xp: number; gold: number } | null
  achievements: AchievementItem[]
  levelUp: LevelUp | null
}

export const pomodoroApi = {
  getSettings: async (): Promise<{ settings: PomodoroSettings }> => {
    const res = await apiClient.get('/pomodoro/settings')
    return res.data
  },
  updateSettings: async (data: Partial<PomodoroSettings>): Promise<{ settings: PomodoroSettings }> => {
    const res = await apiClient.patch('/pomodoro/settings', data)
    return res.data
  },
  getActive: async (): Promise<{ session: PomodoroSession | null }> => {
    const res = await apiClient.get('/pomodoro/active')
    return res.data
  },
  getTodayStats: async (): Promise<TodayStats> => {
    const res = await apiClient.get('/pomodoro/today-stats')
    return res.data
  },
  startSession: async (data: { taskId: number; goalId?: number; plannedDuration: number }): Promise<{ session: PomodoroSession }> => {
    const res = await apiClient.post('/pomodoro/sessions', data)
    return res.data
  },
  completeSession: async (
    id: number,
    actualDuration: number
  ): Promise<CompleteSessionResponse> => {
    const res = await apiClient.patch(
      `/pomodoro/sessions/${id}/complete`,
      { actualDuration }
    )
    return res.data
  },
}

export const inventoryApi = {
  getUnlocked: async (): Promise<{ items: { itemType: string; name: string }[] }> => {
    const res = await apiClient.get('/inventory')
    return res.data
  },
  purchase: async (itemType: string, name: string, price: number): Promise<boolean> => {
    try {
      await apiClient.post('/inventory/purchase', { itemType, name, price })
      return true
    } catch {
      return false
    }
  }
}
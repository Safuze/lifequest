import { create } from 'zustand'

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

interface TimerStore {
  // Состояние
  mode: TimerMode
  timeLeft: number
  modeDuration: number
  isRunning: boolean
  sessionId: number | null
  selectedTaskId: number | null
  taskSelected: boolean
  sessionCount: number
  activeSecondsToday: number
  sessionStartEpoch: number
  activeSecondsBeforePause: number
  todayMinutes: number
  todaySessions: number
  todayCycles: number
  lastReward: { xp: number; gold: number } | null
  autoSwitch: boolean
  isFlipped: boolean

  // Сеттеры (атомарные)
  setMode: (mode: TimerMode) => void
  setTimeLeft: (t: number) => void
  setModeDuration: (d: number) => void
  setIsRunning: (r: boolean) => void
  setSessionId: (id: number | null) => void
  setSelectedTaskId: (id: number | null) => void
  setTaskSelected: (v: boolean) => void
  setSessionCount: (n: number) => void
  setActiveSecondsToday: (s: number) => void
  setSessionStartEpoch: (e: number) => void
  setActiveSecondsBeforePause: (s: number) => void
  setTodayStats: (min: number, sessions: number, cycles: number) => void
  setLastReward: (r: { xp: number; gold: number } | null) => void
  setAutoSwitch: (v: boolean) => void
  setIsFlipped: (v: boolean) => void
}

export const useTimerStore = create<TimerStore>((set) => ({
  mode: 'work',
  timeLeft: 25 * 60,
  modeDuration: 25 * 60,
  isRunning: false,
  sessionId: null,
  selectedTaskId: null,
  taskSelected: false,
  sessionCount: 0,
  activeSecondsToday: 0,
  sessionStartEpoch: 0,
  activeSecondsBeforePause: 0,
  todayMinutes: 0,
  todaySessions: 0,
  todayCycles: 0,
  lastReward: null,
  autoSwitch: true,
  isFlipped: false,

  setMode: (mode) => set({ mode }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setModeDuration: (modeDuration) => set({ modeDuration }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setSessionId: (sessionId) => set({ sessionId }),
  setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
  setTaskSelected: (taskSelected) => set({ taskSelected }),
  setSessionCount: (sessionCount) => set({ sessionCount }),
  setActiveSecondsToday: (activeSecondsToday) => set({ activeSecondsToday }),
  setSessionStartEpoch: (sessionStartEpoch) => set({ sessionStartEpoch }),
  setActiveSecondsBeforePause: (activeSecondsBeforePause) => set({ activeSecondsBeforePause }),
  setTodayStats: (todayMinutes, todaySessions, todayCycles) => set({ todayMinutes, todaySessions, todayCycles }),
  setLastReward: (lastReward) => set({ lastReward }),
  setAutoSwitch: (autoSwitch) => set({ autoSwitch }),
  setIsFlipped: (isFlipped) => set({ isFlipped }),
}))
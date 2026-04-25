import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { pomodoroApi } from '../api/pomodoro'
import type { PomodoroSettings, PomodoroSession, TodayStats } from '../api/pomodoro'

import { tasksApi } from '../api/tasks'
import type { Task } from '../api/tasks'
import { useAuth } from '../hooks/useAuth'
import {
  Play, Pause, RotateCcw, Settings, X,
  ChevronRight, Music, Wind, Coffee
} from 'lucide-react'

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

const SOUNDS = [
  { id: 'none',   label: 'Тишина',     icon: '🔇' },
  { id: 'lofi',   label: 'Lo-fi',      icon: '🎵' },
  { id: 'nature', label: 'Природа',    icon: '🌿' },
  { id: 'rain',   label: 'Дождь',      icon: '🌧️' },
  { id: 'white',  label: 'Белый шум',  icon: '📻' },
]

const BACKGROUNDS = [
  { id: 'dark',    label: 'Тёмный',    style: { backgroundColor: '#0f172a' } },
  { id: 'forest',  label: 'Лес',       style: { background: 'linear-gradient(135deg, #1a2f1a 0%, #0f172a 100%)' } },
  { id: 'ocean',   label: 'Океан',     style: { background: 'linear-gradient(135deg, #0c1a2e 0%, #0f172a 100%)' } },
  { id: 'sunset',  label: 'Закат',     style: { background: 'linear-gradient(135deg, #2d1b1b 0%, #0f172a 100%)' } },
  { id: 'space',   label: 'Космос',    style: { background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)' } },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// Настройки
interface SettingsPanelProps {
  settings: PomodoroSettings
  onSave: (s: Partial<PomodoroSettings>) => void
  onClose: () => void
}

function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [work, setWork] = useState(settings.workDuration)
  const [shortB, setShortB] = useState(settings.shortBreak)
  const [longB, setLongB] = useState(settings.longBreak)
  const [cycles, setCycles] = useState(settings.cyclesBeforeLong)

  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 z-10"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Настройки таймера</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Рабочая сессия (мин)', value: work, setter: setWork, min: 1, max: 120 },
            { label: 'Короткий перерыв (мин)', value: shortB, setter: setShortB, min: 1, max: 30 },
            { label: 'Длинный перерыв (мин)', value: longB, setter: setLongB, min: 5, max: 60 },
            { label: 'Сессий до длинного перерыва', value: cycles, setter: setCycles, min: 1, max: 10 },
          ].map(({ label, value, setter, min, max }) => (
            <div key={label}>
              <label className="text-slate-400 text-sm mb-1.5 block">{label}</label>
              <input type="number" value={value} onChange={e => setter(parseInt(e.target.value))}
                min={min} max={max}
                className="w-full rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                style={inputStyle} />
            </div>
          ))}
        </div>
        <button
          onClick={() => { onSave({ workDuration: work, shortBreak: shortB, longBreak: longB, cyclesBeforeLong: cycles }); onClose() }}
          className="w-full mt-5 py-3 rounded-xl text-white font-medium"
          style={{ backgroundColor: '#4f46e5' }}>
          Сохранить
        </button>
      </div>
    </div>
  )
}

export default function PomodoroPage() {
  const location = useLocation()
  const { loadUser } = useAuth()

  const [settings, setSettings] = useState<PomodoroSettings | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [todayStats, setTodayStats] = useState<TodayStats>({ totalMinutes: 0, sessionsCount: 0, completedCycles: 0 })

  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [selectedSound, setSelectedSound] = useState('none')
  const [selectedBg, setSelectedBg] = useState('dark')
  const [showSettings, setShowSettings] = useState(false)
  const [showTaskSelect, setShowTaskSelect] = useState(false)
  const [lastReward, setLastReward] = useState<{ xp: number; gold: number } | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  // Загрузка начальных данных
  useEffect(() => {
    const init = async () => {
      try {
        const [settingsData, tasksData, statsData, activeData] = await Promise.all([
          pomodoroApi.getSettings(),
          tasksApi.getAll(),
          pomodoroApi.getTodayStats(),
          pomodoroApi.getActive(),
        ])
        setSettings(settingsData.settings)
        setTasks(tasksData.tasks)
        setTodayStats(statsData)
        setTimeLeft(settingsData.settings.workDuration * 60)

        if (activeData.session) {
          setCurrentSession(activeData.session)
          const elapsed = Math.floor((Date.now() - new Date(activeData.session.startedAt).getTime()) / 1000)
          const remaining = Math.max(activeData.session.plannedDuration * 60 - elapsed, 0)
          setTimeLeft(remaining)
          setSelectedTaskId(activeData.session.taskId)
          setIsRunning(true)
        }
      } catch (error) {
        console.error('Init error:', error)
      }
    }
    init()

    // Задача переданная из карточки
    if (location.state?.taskId) {
      setSelectedTaskId(location.state.taskId)
    }
  }, [])

  // Таймер
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerEnd()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, currentSession])

  const getDuration = (m: TimerMode) => {
    if (!settings) return 25
    if (m === 'work') return settings.workDuration
    if (m === 'shortBreak') return settings.shortBreak
    return settings.longBreak
  }

  const handleTimerEnd = useCallback(async () => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (currentSession && mode === 'work') {
      try {
        const actualDuration = getDuration('work')
        const result = await pomodoroApi.completeSession(currentSession.id, actualDuration)
        setLastReward(result.reward)
        setCurrentSession(null)
        setSessionCount(prev => prev + 1)
        loadUser() // обновляем XP и gold в хедере

        const stats = await pomodoroApi.getTodayStats()
        setTodayStats(stats)

        // Автопереход на перерыв
        const newCount = sessionCount + 1
        const cyclesBeforeLong = settings?.cyclesBeforeLong || 4
        const nextMode: TimerMode = newCount % cyclesBeforeLong === 0 ? 'longBreak' : 'shortBreak'
        setMode(nextMode)
        setTimeLeft(getDuration(nextMode) * 60)
      } catch (error) {
        console.error('Complete session error:', error)
      }
    } else {
      // Перерыв закончился — возврат к работе
      setMode('work')
      setTimeLeft(getDuration('work') * 60)
    }
  }, [currentSession, mode, sessionCount, settings])

  const handleStart = async () => {
    if (!selectedTaskId) {
      setShowTaskSelect(true)
      return
    }
    if (!settings) return

    try {
      const task = tasks.find(t => t.id === selectedTaskId)
      const result = await pomodoroApi.startSession({
        taskId: selectedTaskId,
        goalId: task?.goalId || undefined,
        plannedDuration: getDuration('work'),
      })
      setCurrentSession(result.session)
      startTimeRef.current = Date.now()
      setIsRunning(true)
      setLastReward(null)
    } catch (error) {
      console.error('Start session error:', error)
    }
  }

  const handlePause = () => setIsRunning(!isRunning)

  const handleReset = async () => {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (currentSession) {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60)
      if (elapsed > 0) {
        try {
          await pomodoroApi.completeSession(currentSession.id, elapsed)
        } catch {}
      }
      setCurrentSession(null)
    }
    setTimeLeft(getDuration(mode) * 60)
  }

  const handleModeChange = (newMode: TimerMode) => {
    if (isRunning) return
    setMode(newMode)
    setTimeLeft(getDuration(newMode) * 60)
    setCurrentSession(null)
  }

  const handleSaveSettings = async (data: Partial<PomodoroSettings>) => {
    try {
      const result = await pomodoroApi.updateSettings(data)
      setSettings(result.settings)
      if (!isRunning) setTimeLeft(result.settings.workDuration * 60)
    } catch (error) {
      console.error('Save settings error:', error)
    }
  }

  const totalDuration = getDuration(mode) * 60
  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0
  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const bgStyle = BACKGROUNDS.find(b => b.id === selectedBg)?.style || {}

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative"
      style={bgStyle}>

      {/* Кнопка настроек */}
      <button onClick={() => setShowSettings(true)}
        className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
        style={{ backgroundColor: 'rgba(30,41,59,0.8)' }}>
        <Settings size={20} />
      </button>

      <div className="w-full max-w-md px-4 space-y-6">

        {/* Переключатель режимов */}
        <div className="flex rounded-xl overflow-hidden mx-auto w-fit"
          style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>
          {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map(m => (
            <button key={m} onClick={() => handleModeChange(m)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                backgroundColor: mode === m ? '#4f46e5' : 'transparent',
                color: mode === m ? '#fff' : '#94a3b8',
              }}>
              {m === 'work' ? 'Фокус' : m === 'shortBreak' ? 'Перерыв' : 'Длинный перерыв'}
            </button>
          ))}
        </div>

        {/* Таймер */}
        <div className="flex flex-col items-center">
          <div className="relative w-64 h-64">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="4" />
              <circle cx="50" cy="50" r="45" fill="none"
                stroke={mode === 'work' ? '#4f46e5' : '#22c55e'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-white font-mono">{formatTime(timeLeft)}</span>
              <span className="text-slate-400 text-sm mt-1">
                {mode === 'work' ? 'Фокус' : mode === 'shortBreak' ? 'Перерыв' : 'Длинный перерыв'}
              </span>
            </div>
          </div>

          {/* Награда после сессии */}
          {lastReward && (
            <div className="mt-3 flex items-center gap-3 px-4 py-2 rounded-xl"
              style={{ backgroundColor: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <span className="text-indigo-400 text-sm font-medium">+{lastReward.xp} XP</span>
              <span className="text-yellow-400 text-sm font-medium">+{lastReward.gold} 🪙</span>
            </div>
          )}
        </div>

        {/* Текущая задача */}
        <button onClick={() => setShowTaskSelect(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
          style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>
          <span className="text-sm" style={{ color: selectedTask ? '#f1f5f9' : '#64748b' }}>
            {selectedTask ? selectedTask.title : 'Выбрать задачу...'}
          </span>
          <ChevronRight size={16} className="text-slate-400 shrink-0" />
        </button>

        {/* Кнопки управления */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={handleReset}
            className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>
            <RotateCcw size={18} />
          </button>

          <button
            onClick={isRunning ? handlePause : (currentSession ? () => setIsRunning(true) : handleStart)}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-semibold text-xl transition-all hover:scale-105"
            style={{ backgroundColor: '#4f46e5', boxShadow: '0 0 30px rgba(79,70,229,0.4)' }}>
            {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>

          <div className="w-12 h-12" />
        </div>

        {/* Статистика дня */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Минут', value: todayStats.totalMinutes },
            { label: 'Сессий', value: todayStats.sessionsCount },
            { label: 'Циклов', value: todayStats.completedCycles },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155' }}>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        {/* Фоны и звуки */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap justify-center">
            {BACKGROUNDS.map(bg => (
              <button key={bg.id} onClick={() => setSelectedBg(bg.id)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: selectedBg === bg.id ? '#4f46e5' : 'rgba(30,41,59,0.8)',
                  color: selectedBg === bg.id ? '#fff' : '#94a3b8',
                  border: `1px solid ${selectedBg === bg.id ? '#4f46e5' : '#334155'}`,
                }}>
                {bg.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {SOUNDS.map(s => (
              <button key={s.id} onClick={() => setSelectedSound(s.id)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1"
                style={{
                  backgroundColor: selectedSound === s.id ? 'rgba(99,102,241,0.3)' : 'rgba(30,41,59,0.8)',
                  color: selectedSound === s.id ? '#a5b4fc' : '#94a3b8',
                  border: `1px solid ${selectedSound === s.id ? '#6366f1' : '#334155'}`,
                }}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Модалка выбора задачи */}
      {showTaskSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTaskSelect(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-5 z-10 max-h-[70vh] overflow-y-auto"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Выберите задачу</h3>
              <button onClick={() => setShowTaskSelect(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {tasks.filter(t => t.status !== 'done').map(task => (
                <button key={task.id}
                  onClick={() => { setSelectedTaskId(task.id); setShowTaskSelect(false) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    backgroundColor: selectedTaskId === task.id ? 'rgba(99,102,241,0.2)' : '#0f172a',
                    border: `1px solid ${selectedTaskId === task.id ? '#6366f1' : '#334155'}`,
                  }}>
                  {task.isFocusToday && <span className="text-yellow-400">⭐</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{task.title}</p>
                    {task.goal && <p className="text-slate-500 text-xs">🎯 {task.goal.title}</p>}
                  </div>
                  {selectedTaskId === task.id && <span className="text-indigo-400 text-xs">✓</span>}
                </button>
              ))}
              {tasks.filter(t => t.status !== 'done').length === 0 && (
                <p className="text-slate-400 text-center py-4">Нет активных задач</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && settings && (
        <SettingsPanel settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { pomodoroApi } from '../api/pomodoro'
import type { PomodoroSettings, TodayStats } from '../api/pomodoro'
import { tasksApi } from '../api/tasks'
import type { Task } from '../api/tasks'
import { useAuth } from '../hooks/useAuth'
import apiClient from '../api/client'
import { Play, Pause, RotateCcw, Settings, X, ChevronRight, Lock } from 'lucide-react'

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

const SOUNDS = [
  { id: 'none',      label: 'Тишина',       icon: '🔇', price: 0   },
  { id: 'white',     label: 'Белый шум',    icon: '📻', price: 50  },
  { id: 'lofi',      label: 'Lo-fi',        icon: '🎵', price: 100 },
  { id: 'nature',    label: 'Природа',      icon: '🌿', price: 150 },
  { id: 'waves',     label: 'Волны',        icon: '🌊', price: 200 },
  { id: 'rain',      label: 'Дождь',        icon: '🌧️', price: 250 },
  { id: 'fire',      label: 'Огонь',        icon: '🔥', price: 300 },
  { id: 'fire_rain', label: 'Огонь+Дождь', icon: '🔥🌧️', price: 400 },
]

const BACKGROUNDS = [
  { id: 'dark',   label: 'Тёмный', price: 0,   style: { backgroundColor: '#0f172a' } },
  { id: 'forest', label: 'Лес',    price: 150, style: { background: 'linear-gradient(135deg, #1a2f1a 0%, #0f172a 100%)' } },
  { id: 'ocean',  label: 'Океан',  price: 200, style: { background: 'linear-gradient(135deg, #0c1a2e 0%, #0f172a 100%)' } },
  { id: 'sunset', label: 'Закат',  price: 250, style: { background: 'linear-gradient(135deg, #2d1b1b 0%, #0f172a 100%)' } },
  { id: 'space',  label: 'Космос', price: 300, style: { background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)' } },
]

// localStorage ключи для сохранения состояния таймера
const TIMER_STORAGE_KEY = 'lifequest_timer'

interface TimerState {
  mode: TimerMode
  timeLeft: number
  isRunning: boolean
  sessionId: number | null
  taskId: number | null
  sessionStartEpoch: number
  sessionCount: number
}

function saveTimerState(state: Partial<TimerState>) {
  try {
    const existing = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || '{}')
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ ...existing, ...state }))
  } catch {}
}

function loadTimerState(): Partial<TimerState> {
  try {
    return JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function clearTimerState() {
  localStorage.removeItem(TIMER_STORAGE_KEY)
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// Модалка покупки
interface PurchaseModalProps {
  item: { id: string; label: string; price: number; icon: string }
  userGold: number
  onConfirm: () => Promise<void>
  onClose: () => void
}

function PurchaseModal({ item, userGold, onConfirm, onClose }: PurchaseModalProps) {
  const [loading, setLoading] = useState(false)
  const canAfford = userGold >= item.price

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative rounded-2xl p-6 z-10 w-full max-w-sm text-center"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="text-5xl mb-3">{item.icon}</div>
        <h3 className="text-white font-semibold text-lg mb-1">{item.label}</h3>
        <p className="text-slate-400 text-sm mb-4">
          Стоимость: <span className="text-yellow-400 font-bold">{item.price} 🪙</span>
        </p>
        <p className="text-slate-500 text-sm mb-4">
          Ваш баланс: <span className={canAfford ? 'text-yellow-400' : 'text-red-400'}>{userGold} 🪙</span>
        </p>
        {!canAfford && (
          <p className="text-red-400 text-xs mb-4">Недостаточно золота для покупки</p>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-slate-400 font-medium"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            Отмена
          </button>
          <button onClick={canAfford ? handleConfirm : undefined}
            disabled={!canAfford || loading}
            className="flex-1 py-2.5 rounded-xl text-white font-medium transition-opacity"
            style={{ backgroundColor: canAfford ? '#f59e0b' : '#475569', opacity: (!canAfford || loading) ? 0.6 : 1 }}>
            {loading ? 'Покупка...' : canAfford ? 'Купить' : 'Мало золота'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Панель настроек
interface SettingsPanelProps {
  settings: PomodoroSettings
  userGold: number
  unlockedSounds: string[]
  unlockedBgs: string[]
  selectedSound: string
  selectedBg: string
  onSaveTimer: (s: Partial<PomodoroSettings>) => void
  onSelectSound: (id: string) => void
  onSelectBg: (id: string) => void
  onPurchase: (type: 'sound' | 'bg', id: string, label: string, icon: string, price: number) => Promise<void>
  onClose: () => void
}

function SettingsPanel({
  settings, userGold, unlockedSounds, unlockedBgs,
  selectedSound, selectedBg,
  onSaveTimer, onSelectSound, onSelectBg, onPurchase, onClose
}: SettingsPanelProps) {
  const [work, setWork] = useState(settings.workDuration)
  const [shortB, setShortB] = useState(settings.shortBreak)
  const [longB, setLongB] = useState(settings.longBreak)
  const [cycles, setCycles] = useState(settings.cyclesBeforeLong)
  const [purchaseItem, setPurchaseItem] = useState<{
    id: string; label: string; price: number; icon: string; type: 'sound' | 'bg'
  } | null>(null)

  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }

  const handleItemClick = (
    type: 'sound' | 'bg',
    item: { id: string; label: string; price: number; icon?: string }
  ) => {
    const unlocked = type === 'sound' ? unlockedSounds : unlockedBgs
    const isUnlocked = item.price === 0 || unlocked.includes(item.id)
    if (isUnlocked) {
      if (type === 'sound') onSelectSound(item.id)
      else onSelectBg(item.id)
    } else {
      setPurchaseItem({ ...item, icon: item.icon || '🎨', type })
    }
  }

  const handlePurchaseConfirm = async () => {
    if (!purchaseItem) return
    await onPurchase(purchaseItem.type, purchaseItem.id, purchaseItem.label, purchaseItem.icon, purchaseItem.price)
    setPurchaseItem(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl p-6 z-10 max-h-[85vh] overflow-y-auto"
          style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-lg">Настройки</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>

          {/* Время */}
          <div className="space-y-3 mb-6">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide">⏱ Время</h3>
            {([
              { label: 'Рабочая сессия (мин)', value: work, setter: setWork, min: 1, max: 120 },
              { label: 'Короткий перерыв (мин)', value: shortB, setter: setShortB, min: 1, max: 30 },
              { label: 'Длинный перерыв (мин)', value: longB, setter: setLongB, min: 5, max: 60 },
              { label: 'Сессий до длинного', value: cycles, setter: setCycles, min: 1, max: 10 },
            ] as const).map(({ label, value, setter, min, max }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <label className="text-slate-300 text-sm flex-1">{label}</label>
                <input type="number" value={value}
                  onChange={e => (setter as (v: number) => void)(Number(e.target.value))}
                  min={min} max={max}
                  className="w-20 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-center text-sm"
                  style={inputStyle} />
              </div>
            ))}
            <button
              onClick={() => onSaveTimer({ workDuration: work, shortBreak: shortB, longBreak: longB, cyclesBeforeLong: cycles })}
              className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: '#4f46e5' }}>
              Сохранить настройки
            </button>
          </div>

          {/* Фоны */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide">🎨 Фон</h3>
              <span className="text-yellow-400 text-sm font-medium">🪙 {userGold}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map(bg => {
                const isUnlocked = bg.price === 0 || unlockedBgs.includes(bg.id)
                const isSelected = selectedBg === bg.id
                return (
                  <button key={bg.id} onClick={() => handleItemClick('bg', { ...bg, icon: '🎨' })}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all text-left"
                    style={{
                      backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a',
                      border: `1px solid ${isSelected ? '#6366f1' : '#334155'}`,
                    }}>
                    <div className="w-8 h-8 rounded-lg shrink-0" style={bg.style} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{bg.label}</p>
                      {!isUnlocked ? (
                        <p className="text-yellow-400 text-xs flex items-center gap-1">
                          <Lock size={10} /> {bg.price} 🪙
                        </p>
                      ) : isSelected ? (
                        <p className="text-indigo-400 text-xs">✓ Активен</p>
                      ) : (
                        <p className="text-slate-500 text-xs">Разблокирован</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Звуки */}
          <div>
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">🔊 Звук</h3>
            <div className="grid grid-cols-2 gap-2">
              {SOUNDS.map(sound => {
                const isUnlocked = sound.price === 0 || unlockedSounds.includes(sound.id)
                const isSelected = selectedSound === sound.id
                return (
                  <button key={sound.id} onClick={() => handleItemClick('sound', sound)}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all"
                    style={{
                      backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a',
                      border: `1px solid ${isSelected ? '#6366f1' : '#334155'}`,
                    }}>
                    <span className="text-xl shrink-0">{sound.icon}</span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm truncate">{sound.label}</p>
                      {!isUnlocked ? (
                        <p className="text-yellow-400 text-xs flex items-center gap-1">
                          <Lock size={10} /> {sound.price} 🪙
                        </p>
                      ) : isSelected ? (
                        <p className="text-indigo-400 text-xs">✓ Активен</p>
                      ) : (
                        <p className="text-slate-500 text-xs">Разблокирован</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {purchaseItem && (
        <PurchaseModal
          item={purchaseItem}
          userGold={userGold}
          onConfirm={handlePurchaseConfirm}
          onClose={() => setPurchaseItem(null)}
        />
      )}
    </>
  )
}

export default function PomodoroPage() {
  const location = useLocation()
  const { user, loadUser } = useAuth()

  const [settings, setSettings] = useState<PomodoroSettings | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalMinutes: 0, sessionsCount: 0, completedCycles: 0
  })

  // Восстанавливаем состояние из localStorage
  const savedState = loadTimerState()
  const [mode, setMode] = useState<TimerMode>(savedState.mode || 'work')
  const [timeLeft, setTimeLeft] = useState(savedState.timeLeft || 25 * 60)
  const [isRunning, setIsRunning] = useState(false) // не восстанавливаем isRunning — пусть пользователь сам нажмёт Play
  const [sessionId, setSessionId] = useState<number | null>(savedState.sessionId || null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(savedState.taskId || null)
  const [sessionCount, setSessionCount] = useState(savedState.sessionCount || 0)
  const [selectedSound, setSelectedSound] = useState(
    localStorage.getItem('lifequest_sound') || 'none'
  )
  const [selectedBg, setSelectedBg] = useState(
    localStorage.getItem('lifequest_bg') || 'dark'
  )
  const [showSettings, setShowSettings] = useState(false)
  const [showTaskSelect, setShowTaskSelect] = useState(false)
  const [lastReward, setLastReward] = useState<{ xp: number; gold: number } | null>(null)
  const [unlockedSounds, setUnlockedSounds] = useState<string[]>([])
  const [unlockedBgs, setUnlockedBgs] = useState<string[]>([])
  const [elapsedMinutes, setElapsedMinutes] = useState(0)

  const settingsRef = useRef<PomodoroSettings | null>(null)
  const modeRef = useRef<TimerMode>(mode)
  const timeLeftRef = useRef(timeLeft)
  const sessionIdRef = useRef<number | null>(sessionId)
  const sessionCountRef = useRef(sessionCount)
  const todayStatsRef = useRef(todayStats)
  const sessionStartRef = useRef(savedState.sessionStartEpoch || 0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { timeLeftRef.current = timeLeft }, [timeLeft])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => { sessionCountRef.current = sessionCount }, [sessionCount])
  useEffect(() => { todayStatsRef.current = todayStats }, [todayStats])
  useEffect(() => {
    if (settings) settingsRef.current = settings
  }, [settings])

  // Сохраняем звук и фон в localStorage при изменении
  useEffect(() => { localStorage.setItem('lifequest_sound', selectedSound) }, [selectedSound])
  useEffect(() => { localStorage.setItem('lifequest_bg', selectedBg) }, [selectedBg])

  const getDur = (m: TimerMode) => {
    const s = settingsRef.current
    if (!s) return m === 'work' ? 25 : m === 'shortBreak' ? 5 : 15
    return m === 'work' ? s.workDuration : m === 'shortBreak' ? s.shortBreak : s.longBreak
  }

  const completeSession = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false)

    const sid = sessionIdRef.current
    const currentMode = modeRef.current

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('LifeQuest', {
        body: currentMode === 'work' ? '🎉 Сессия завершена! Время перерыва.' : '⏰ Перерыв закончился!',
        icon: '/favicon.ico'
      })
    }

    if (sid && currentMode === 'work') {
      try {
        const actualDuration = getDur('work')
        const result = await pomodoroApi.completeSession(sid, actualDuration)
        setLastReward(result.reward)
        sessionIdRef.current = null
        setSessionId(null)

        const newCount = sessionCountRef.current + 1
        sessionCountRef.current = newCount
        setSessionCount(newCount)
        loadUser()

        const stats = await pomodoroApi.getTodayStats()
        setTodayStats(stats)
        todayStatsRef.current = stats
        setElapsedMinutes(0)

        const cyclesBeforeLong = settingsRef.current?.cyclesBeforeLong || 4
        const nextMode: TimerMode = newCount % cyclesBeforeLong === 0 ? 'longBreak' : 'shortBreak'
        const nextDuration = getDur(nextMode) * 60
        modeRef.current = nextMode
        timeLeftRef.current = nextDuration
        setMode(nextMode)
        setTimeLeft(nextDuration)

        saveTimerState({
          mode: nextMode,
          timeLeft: nextDuration,
          isRunning: false,
          sessionId: null,
          sessionCount: newCount,
        })
      } catch (error) {
        console.error('Complete error:', error)
      }
    } else {
      const workDur = getDur('work') * 60
      modeRef.current = 'work'
      timeLeftRef.current = workDur
      setMode('work')
      setTimeLeft(workDur)
      saveTimerState({ mode: 'work', timeLeft: workDur, isRunning: false, sessionId: null })
    }
  }, [loadUser])

  useEffect(() => {
    const init = async () => {
      try {
        const [settingsData, tasksData, statsData, inventoryData] = await Promise.all([
          pomodoroApi.getSettings(),
          tasksApi.getAll(),
          pomodoroApi.getTodayStats(),
          apiClient.get('/inventory').then(r => r.data).catch(() => ({ items: [] }))
        ])

        settingsRef.current = settingsData.settings
        setSettings(settingsData.settings)
        setTasks(tasksData.tasks)
        setTodayStats(statsData)
        todayStatsRef.current = statsData

        // Загружаем разблокированные предметы из БД
        const items: { itemType: string; name: string }[] = inventoryData.items || []
        setUnlockedSounds(items.filter(i => i.itemType === 'sound').map(i => i.name))
        setUnlockedBgs(items.filter(i => i.itemType === 'background').map(i => i.name))

        // Если нет сохранённого состояния — ставим дефолтное время
        if (!savedState.timeLeft) {
          const dur = settingsData.settings.workDuration * 60
          timeLeftRef.current = dur
          setTimeLeft(dur)
        }
      } catch (error) {
        console.error('Init error:', error)
      }
    }
    init()

    if (location.state?.taskId) {
      setSelectedTaskId(location.state.taskId)
      saveTimerState({ taskId: location.state.taskId })
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Таймер — только через refs
  useEffect(() => {
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        timeLeftRef.current -= 1
        setTimeLeft(timeLeftRef.current)

        // Обновляем elapsed каждую минуту
        if (sessionStartRef.current > 0) {
          const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 60000)
          setElapsedMinutes(elapsed)
        }

        // Сохраняем состояние каждые 10 секунд
        if (timeLeftRef.current % 10 === 0) {
          saveTimerState({ timeLeft: timeLeftRef.current, isRunning: true })
        }

        if (timeLeftRef.current <= 0) {
          clearInterval(intervalRef.current!)
          completeSession()
        }
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, completeSession])

  const handleStart = async () => {
    if (!selectedTaskId) { setShowTaskSelect(true); return }
    if (!settingsRef.current) return

    try {
      const task = tasks.find(t => t.id === selectedTaskId)
      const result = await pomodoroApi.startSession({
        taskId: selectedTaskId,
        goalId: task?.goalId || undefined,
        plannedDuration: getDur('work'),
      })
      sessionIdRef.current = result.session.id
      setSessionId(result.session.id)
      sessionStartRef.current = Date.now()
      setLastReward(null)
      setIsRunning(true)
      saveTimerState({
        sessionId: result.session.id,
        taskId: selectedTaskId,
        sessionStartEpoch: Date.now(),
        isRunning: true,
        timeLeft: timeLeftRef.current,
        mode: modeRef.current,
      })
    } catch (error) {
      console.error('Start error:', error)
    }
  }

  const handlePause = () => {
    setIsRunning(prev => {
      saveTimerState({ isRunning: !prev, timeLeft: timeLeftRef.current })
      return !prev
    })
  }

  const handleReset = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsRunning(false)

    if (sessionIdRef.current) {
      try { await pomodoroApi.completeSession(sessionIdRef.current, 0) } catch {}
      sessionIdRef.current = null
      setSessionId(null)
    }

    const dur = getDur(modeRef.current) * 60
    timeLeftRef.current = dur
    setTimeLeft(dur)
    setLastReward(null)
    setElapsedMinutes(0)
    saveTimerState({ timeLeft: dur, isRunning: false, sessionId: null, sessionStartEpoch: 0 })
  }

  const handleModeChange = (newMode: TimerMode) => {
    if (isRunning) return
    modeRef.current = newMode
    const dur = getDur(newMode) * 60
    timeLeftRef.current = dur
    setMode(newMode)
    setTimeLeft(dur)
    saveTimerState({ mode: newMode, timeLeft: dur })
  }

  const handleSaveSettings = async (data: Partial<PomodoroSettings>) => {
    try {
      const result = await pomodoroApi.updateSettings(data)
      settingsRef.current = result.settings
      setSettings(result.settings)
      if (!isRunning) {
        const dur = result.settings.workDuration * 60
        timeLeftRef.current = dur
        setTimeLeft(dur)
        saveTimerState({ timeLeft: dur })
      }
    } catch (error) {
      console.error('Save settings error:', error)
    }
  }

  const handlePurchase = async (
    type: 'sound' | 'bg',
    id: string,
    label: string,
    icon: string,
    price: number
  ) => {
    try {
      const itemType = type === 'sound' ? 'sound' : 'background'
      const res = await apiClient.post('/inventory/purchase', { itemType, name: id, price })

      if (type === 'sound') {
        setUnlockedSounds(prev => [...prev, id])
        setSelectedSound(id)
      } else {
        setUnlockedBgs(prev => [...prev, id])
        setSelectedBg(id)
      }

      loadUser() // обновляем gold в хедере немедленно
    } catch (error: any) {
      console.error('Purchase error:', error.response?.data?.error || error)
    }
  }

  const totalDuration = getDur(mode) * 60
  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0
  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const bgStyle = BACKGROUNDS.find(b => b.id === selectedBg)?.style || {}
  const displayMinutes = todayStats.totalMinutes + elapsedMinutes

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative transition-all duration-1000"
      style={bgStyle}>

      <button onClick={() => setShowSettings(true)}
        className="absolute top-4 right-4 p-2.5 rounded-xl text-slate-400 hover:text-white transition-colors"
        style={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid #334155' }}>
        <Settings size={20} />
      </button>

      <div className="w-full max-w-md px-4 space-y-6">

        {/* Режимы */}
        <div className="flex rounded-xl overflow-hidden mx-auto w-fit"
          style={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid #334155' }}>
          {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map(m => (
            <button key={m} onClick={() => handleModeChange(m)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                backgroundColor: mode === m ? '#4f46e5' : 'transparent',
                color: mode === m ? '#fff' : isRunning ? '#475569' : '#94a3b8',
                cursor: isRunning ? 'not-allowed' : 'pointer',
              }}>
              {m === 'work' ? 'Фокус' : m === 'shortBreak' ? 'Перерыв' : 'Длинный перерыв'}
            </button>
          ))}
        </div>

        {/* Таймер */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-64 h-64">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="6" />
              <circle cx="50" cy="50" r="45" fill="none"
                stroke={mode === 'work' ? '#4f46e5' : '#22c55e'}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-white font-mono tracking-wide">
                {formatTime(timeLeft)}
              </span>
              <span className="text-slate-400 text-sm mt-2">
                {mode === 'work' ? '🎯 Фокус' : mode === 'shortBreak' ? '☕ Перерыв' : '🛋️ Длинный перерыв'}
              </span>
              {isRunning && (
                <span className="text-indigo-400 text-xs mt-1 animate-pulse">● Фокус-режим</span>
              )}
            </div>
          </div>

          {lastReward && (
            <div className="flex items-center gap-4 px-5 py-2.5 rounded-xl"
              style={{ backgroundColor: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
              <span className="text-indigo-300 font-semibold">+{lastReward.xp} XP</span>
              <span className="text-yellow-400 font-semibold">+{lastReward.gold} 🪙</span>
            </div>
          )}
        </div>

        {/* Задача */}
        <button onClick={() => !isRunning && setShowTaskSelect(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
          style={{
            backgroundColor: 'rgba(30,41,59,0.9)',
            border: `1px solid ${selectedTask ? 'rgba(99,102,241,0.4)' : '#334155'}`,
            cursor: isRunning ? 'default' : 'pointer',
          }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-indigo-400 shrink-0">🎯</span>
            <span className="text-sm truncate" style={{ color: selectedTask ? '#f1f5f9' : '#64748b' }}>
              {selectedTask ? selectedTask.title : 'Выбрать задачу...'}
            </span>
          </div>
          {!isRunning && <ChevronRight size={16} className="text-slate-400 shrink-0" />}
        </button>

        {/* Управление */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={handleReset}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid #334155', color: '#94a3b8' }}>
            <RotateCcw size={18} />
          </button>

          <button
            onClick={isRunning ? handlePause : (sessionId ? () => setIsRunning(true) : handleStart)}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: '#4f46e5',
              boxShadow: isRunning ? '0 0 40px rgba(79,70,229,0.6)' : '0 0 20px rgba(79,70,229,0.3)'
            }}>
            {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>

          <div className="w-12 h-12" />
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Минут', value: displayMinutes },
            { label: 'Сессий', value: todayStats.sessionsCount },
            { label: 'Циклов', value: todayStats.completedCycles },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-3 rounded-xl"
              style={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid #334155' }}>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Выбор задачи */}
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
              {tasks.filter(t => t.status !== 'done' && !t.parentId).map(task => (
                <button key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id)
                    saveTimerState({ taskId: task.id })
                    setShowTaskSelect(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    backgroundColor: selectedTaskId === task.id ? 'rgba(99,102,241,0.2)' : '#0f172a',
                    border: `1px solid ${selectedTaskId === task.id ? '#6366f1' : '#334155'}`,
                  }}>
                  {task.isFocusToday && <span className="shrink-0">⭐</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{task.title}</p>
                    {task.goal && <p className="text-slate-500 text-xs">🎯 {task.goal.title}</p>}
                  </div>
                  {selectedTaskId === task.id && <span className="text-indigo-400 shrink-0">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSettings && settings && (
        <SettingsPanel
          settings={settings}
          userGold={user?.gold || 0}
          unlockedSounds={unlockedSounds}
          unlockedBgs={unlockedBgs}
          selectedSound={selectedSound}
          selectedBg={selectedBg}
          onSaveTimer={handleSaveSettings}
          onSelectSound={setSelectedSound}
          onSelectBg={setSelectedBg}
          onPurchase={handlePurchase}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
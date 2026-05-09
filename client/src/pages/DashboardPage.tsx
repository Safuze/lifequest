import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import apiClient from '../api/client'
import { tasksApi } from '../api/tasks'
import { Play, Target, Flame, Clock, CheckSquare, TrendingUp, ChevronRight, Star } from 'lucide-react'

const PRIORITY_CONFIG = {
  low:      { label: 'Низкий',      color: '#22c55e', bg: 'rgba(34,197,94,0.15)'    },
  medium:   { label: 'Средний',     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'   },
  high:     { label: 'Высокий',     color: '#ef4444', bg: 'rgba(239,68,68,0.15)'    },
  critical: { label: 'Критический', color: '#a855f7', bg: 'rgba(168,85,247,0.15)'   },
}

const LEVEL_NAMES = [
  'Новичок', 'Ученик', 'Практик', 'Эксперт', 'Мастер', 'Легенда'
]
const LEVEL_XP = [0, 1000, 3000, 6000, 10000, 15000]

function getLevelProgress(xp: number) {
  let level = 0
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) { level = i; break }
  }
  const currentLevelXp = LEVEL_XP[level]
  const nextLevelXp = LEVEL_XP[level + 1] || LEVEL_XP[level] + 5000
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
  return { level, levelName: LEVEL_NAMES[level] || 'Легенда', progress: Math.min(progress, 100), nextLevelXp, currentLevelXp }
}

function formatDuration(startDate: string): string {
  const diffMs = Date.now() - new Date(startDate).getTime()
  const diffDay = Math.floor(diffMs / 86400000)
  const diffMonth = Math.floor(diffDay / 30)
  if (diffDay < 1) return 'сегодня'
  if (diffMonth < 1) return `${diffDay} дн.`
  return `${diffMonth} мес.`
}

interface DashboardData {
  user: { name: string; xp: number; gold: number; level: number }
  todayTasks: any[]
  focusTask: any | null
  pomodoroMinutesToday: number
  pomodoroSessionsToday: number
  habits: any[]
  habitsDone: number
  habitsTotal: number
  taskStreak: number
  activeGoals: any[]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Доброе утро')
    else if (h < 17) setGreeting('Добрый день')
    else setGreeting('Добрый вечер')

    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await apiClient.get('/users/dashboard')
      setData(res.data)
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: number, currentStatus: string) => {
    try {
      await tasksApi.update(taskId, {
        status: currentStatus === 'done' ? 'todo' : 'done'
      })
      await loadDashboard()
    } catch {}
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    )
  }

  const { level, levelName, progress, nextLevelXp, currentLevelXp } = getLevelProgress(data.user.xp)

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* Приветствие */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {data.user.name}! 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Статистика — 4 блока */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: <CheckSquare size={18} />,
            label: 'Задач выполнено',
            value: `${data.todayTasks.filter(t => t.status === 'done').length}/${data.todayTasks.length}`,
            color: '#4f46e5',
            bg: 'rgba(79,70,229,0.15)',
            onClick: () => navigate('/tasks')
          },
          {
            icon: <Flame size={18} />,
            label: 'Стрик задач',
            value: `${data.taskStreak} дн.`,
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.15)',
            onClick: undefined
          },
          {
            icon: <Clock size={18} />,
            label: 'Минут в фокусе',
            value: data.pomodoroMinutesToday,
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.15)',
            onClick: () => navigate('/pomodoro')
          },
          {
            icon: <Target size={18} />,
            label: 'Привычек сегодня',
            value: `${data.habitsDone}/${data.habitsTotal}`,
            color: '#ec4899',
            bg: 'rgba(236,72,153,0.15)',
            onClick: () => navigate('/habits')
          },
        ].map(({ icon, label, value, color, bg, onClick }) => (
          <div key={label}
            className="p-4 rounded-2xl transition-all"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155', cursor: onClick ? 'pointer' : 'default' }}
            onClick={onClick}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: bg, color }}>
                {icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Уровень и XP */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-white font-semibold">{levelName}</span>
            <span className="text-slate-400 text-sm ml-2">Ур. {level}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-indigo-400 font-medium">{data.user.xp} XP</span>
            <span className="text-yellow-400 font-medium">{Number(data.user.gold).toFixed(1)} 🪙</span>
          </div>
        </div>
        <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, backgroundColor: '#4f46e5' }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1.5">
          <span>{data.user.xp - currentLevelXp} XP заработано</span>
          <span>Следующий уровень: {nextLevelXp} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Фокус-задача дня */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Star size={16} className="text-yellow-400" /> Фокус дня
            </h2>
            <button onClick={() => navigate('/tasks')}
              className="text-slate-500 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {data.focusTask ? (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#0f172a', border: '1px solid rgba(99,102,241,0.4)' }}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleTaskComplete(data.focusTask.id, data.focusTask.status)}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    borderColor: data.focusTask.status === 'done' ? '#22c55e' : '#4f46e5',
                    backgroundColor: data.focusTask.status === 'done' ? '#22c55e' : 'transparent',
                  }}>
                  {data.focusTask.status === 'done' && <span className="text-white text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium"
                    style={{ textDecoration: data.focusTask.status === 'done' ? 'line-through' : 'none' }}>
                    {data.focusTask.title}
                  </p>
                  {data.focusTask.goal && (
                    <p className="text-slate-500 text-xs mt-1">🎯 {data.focusTask.goal.title}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/pomodoro', { state: { taskId: data.focusTask.id } })}
                className="mt-3 w-full py-2 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: '#4f46e5' }}>
                <Play size={14} /> Запустить помодоро
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-slate-400 text-sm">Нет фокус-задачи</p>
              <button onClick={() => navigate('/tasks')}
                className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
                + Создать критическую задачу
              </button>
            </div>
          )}
        </div>

        {/* Привычки сегодня */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Flame size={16} className="text-orange-400" /> Привычки
            </h2>
            <button onClick={() => navigate('/habits')}
              className="text-slate-500 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          {data.habits.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-400 text-sm">Нет привычек</p>
              <button onClick={() => navigate('/habits')}
                className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
                + Добавить привычку
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.habits.slice(0, 5).map((habit: any) => (
                <div key={habit.id} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: habit.trackingType === 'continuous'
                        ? 'rgba(99,102,241,0.2)'
                        : habit.isCompletedToday
                          ? 'rgba(34,197,94,0.2)' : 'rgba(71,85,105,0.3)',
                      border: `1px solid ${habit.trackingType === 'continuous' ? '#6366f1' : habit.isCompletedToday ? '#22c55e' : '#475569'}`,
                    }}>
                    {habit.trackingType === 'continuous'
                      ? <span className="text-xs">⏱</span>
                      : habit.isCompletedToday
                        ? <span className="text-green-400 text-xs">✓</span>
                        : null}
                  </div>
                  <span className="text-sm flex-1 truncate"
                    style={{ color: habit.isCompletedToday ? '#64748b' : '#f1f5f9' }}>
                    {habit.title}
                  </span>
                  {habit.trackingType === 'discrete' ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {habit.timesPerDay > 1 && (
                        <span className="text-xs text-slate-500">{habit.logsToday}/{habit.timesPerDay}</span>
                      )}
                      <span className="text-xs text-orange-400 flex items-center gap-0.5">
                        <Flame size={10} />{habit.currentStreak}
                      </span>
                    </div>
                  ) : (
                    habit.startDate && (
                      <span className="text-xs text-indigo-400 shrink-0">
                        {formatDuration(habit.startDate)}
                      </span>
                    )
                  )}
                </div>
              ))}
              {data.habits.length > 5 && (
                <button onClick={() => navigate('/habits')}
                  className="text-slate-500 text-xs hover:text-indigo-400 transition-colors w-full text-center pt-1">
                  Ещё {data.habits.length - 5} привычек →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Задачи на сегодня */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <CheckSquare size={16} className="text-indigo-400" /> Задачи на сегодня
          </h2>
          <button onClick={() => navigate('/tasks')}
            className="text-slate-500 hover:text-white transition-colors text-sm flex items-center gap-1">
            Все <ChevronRight size={14} />
          </button>
        </div>

        {data.todayTasks.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-400 text-sm">Нет задач на сегодня</p>
            <button onClick={() => navigate('/tasks')}
              className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
              + Создать задачу
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {data.todayTasks.map((task: any) => {
              const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
              return (
                <div key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-800/30 transition-colors"
                  style={{
                    backgroundColor: '#0f172a',
                    border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : '#1e293b'}`,
                  }}>
                  <button
                    onClick={() => handleTaskComplete(task.id, task.status)}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{
                      borderColor: task.status === 'done' ? '#22c55e' : '#475569',
                      backgroundColor: task.status === 'done' ? '#22c55e' : 'transparent',
                    }}>
                    {task.status === 'done' && <span className="text-white text-xs">✓</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {task.isFocusToday && <Star size={11} className="text-yellow-400 shrink-0" />}
                      <span className="text-sm" style={{
                        color: task.status === 'done' ? '#64748b' : '#f1f5f9',
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      }}>
                        {task.title}
                      </span>
                    </div>
                    {task.goal && (
                      <p className="text-xs text-slate-500 mt-0.5">🎯 {task.goal.title}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: priority?.bg, color: priority?.color }}>
                      {priority?.label}
                    </span>
                    {isOverdue && (
                      <span className="text-xs text-red-400">⚠️</span>
                    )}
                    {task.dueDate && !isOverdue && (
                      <span className="text-xs text-slate-500">
                        {new Date(task.dueDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Активные цели */}
      {data.activeGoals.length > 0 && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp size={16} className="text-green-400" /> Активные цели
            </h2>
            <button onClick={() => navigate('/goals')}
              className="text-slate-500 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {data.activeGoals.map((goal: any) => (
              <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{goal.title}</p>
                  <p className="text-slate-500 text-xs">{goal._count.tasks} задач</p>
                </div>
                {goal.deadline && (
                  <span className="text-xs text-slate-400 shrink-0">
                    📅 {new Date(goal.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
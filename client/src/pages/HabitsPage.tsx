import { useState, useEffect } from 'react'
import { habitsApi } from '../api/habits'
import type { Habit,  } from '../api/habits'
import { useAuth } from '../hooks/useAuth'
import { Plus, Trash2, X, Flame, Trophy, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

// Тепловая карта за последние 30 дней (для страницы)
function MiniHeatmap({ logs }: { logs: { date: string; repetition: number }[] }) {
  const days = 30
  const today = new Date()
  const cells: { date: string; count: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = logs.filter(l => l.date.split('T')[0] === dateStr).length
    cells.push({ date: dateStr, count })
  }

  const maxCount = Math.max(...cells.map(c => c.count), 1)

  return (
    <div className="flex gap-0.5 flex-wrap mt-2">
      {cells.map(cell => (
        <div key={cell.date}
          className="w-3 h-3 rounded-sm transition-all"
          title={`${cell.date}: ${cell.count} отметок`}
          style={{
            backgroundColor: cell.count === 0
              ? '#1e293b'
              : `rgba(99,102,241,${0.2 + (cell.count / maxCount) * 0.8})`,
          }}
        />
      ))}
    </div>
  )
}

// Карточка привычки
interface HabitCardProps {
  habit: Habit
  userGold: number
  onLog: (id: number) => void
  onDelete: (id: number) => void
  onRestoreStreak: (id: number) => void
  lastReward: { xp: number; gold: number } | null
}

function HabitCard({ habit, userGold, onLog, onDelete, onRestoreStreak, lastReward }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false)

  const todayLogs = habit.logs.length
  const isCompleted = todayLogs >= habit.timesPerDay

  const getDaysWithoutHabit = () => {
    if (habit.trackingType !== 'continuous' || !habit.startDate) return 0
    const start = new Date(habit.startDate)
    const now = new Date()
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const daysCount = getDaysWithoutHabit()

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#1e293b', border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.3)' : '#334155'}` }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{habit.type === 'anti' ? '🚫' : '✅'}</span>
              <h3 className="text-white font-medium truncate">{habit.title}</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Flame size={12} className="text-orange-400" />
                Стрик: <span className="text-orange-400 font-medium">{habit.currentStreak}</span>
              </span>
              <span className="flex items-center gap-1">
                <Trophy size={12} className="text-yellow-400" />
                Рекорд: <span className="text-yellow-400 font-medium">{habit.bestStreak}</span>
              </span>
            </div>

            {/* Счётчик для непрерывного типа */}
            {habit.trackingType === 'continuous' && (
              <div className="mt-2 px-3 py-1.5 rounded-lg text-sm"
                style={{ backgroundColor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <span className="text-indigo-300">
                  {habit.type === 'anti'
                    ? `🕐 ${daysCount} дней без "${habit.title}"`
                    : `⏱ Отслеживается ${daysCount} дней`
                  }
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setExpanded(!expanded)}
              className="text-slate-500 hover:text-white transition-colors p-1">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={() => onDelete(habit.id)}
              className="text-slate-500 hover:text-red-400 transition-colors p-1">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Кнопки отметки */}
        <div className="mt-3">
          {habit.trackingType === 'discrete' ? (
            <div className="flex items-center gap-3">
              {habit.timesPerDay > 1 ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex gap-1 flex-1">
                    {Array.from({ length: habit.timesPerDay }).map((_, i) => (
                      <div key={i} className="h-1.5 flex-1 rounded-full transition-all"
                        style={{ backgroundColor: i < todayLogs ? '#22c55e' : '#334155' }} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {todayLogs}/{habit.timesPerDay}
                  </span>
                </div>
              ) : null}
              <button
                onClick={() => !isCompleted && onLog(habit.id)}
                disabled={isCompleted}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: isCompleted ? 'rgba(34,197,94,0.15)' : '#4f46e5',
                  color: isCompleted ? '#22c55e' : '#fff',
                  border: isCompleted ? '1px solid rgba(34,197,94,0.3)' : 'none',
                  cursor: isCompleted ? 'default' : 'pointer',
                  minWidth: '100px',
                }}>
                {isCompleted ? '✓ Готово' : habit.timesPerDay > 1 ? `+1 (${todayLogs}/${habit.timesPerDay})` : 'Отметить'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onLog(habit.id)}
                className="flex-1 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: habit.type === 'anti' ? '#ef4444' : '#4f46e5' }}>
                {habit.type === 'anti' ? '💔 Нарушил' : '✓ Выполнено'}
              </button>
            </div>
          )}
        </div>

        {/* Последняя награда */}
        {lastReward && (lastReward.xp > 0 || lastReward.gold > 0) && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            {lastReward.xp > 0 && <span className="text-indigo-400">+{lastReward.xp} XP</span>}
            {lastReward.gold > 0 && <span className="text-yellow-400">+{lastReward.gold} 🪙</span>}
          </div>
        )}

        {/* Кнопка восстановления стрика */}
        {!isCompleted && habit.currentStreak > 0 && (
          <button
            onClick={() => onRestoreStreak(habit.id)}
            className="mt-2 w-full py-1.5 rounded-lg text-xs text-yellow-400 flex items-center justify-center gap-1 transition-all hover:bg-yellow-400/10"
            style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
            <RotateCcw size={12} /> Восстановить стрик за 50 🪙
          </button>
        )}
      </div>

      {/* Тепловая карта (разворачивается) */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid #334155' }}>
          <p className="text-slate-500 text-xs mt-3 mb-2">Активность за 30 дней:</p>
          <MiniHeatmap logs={habit.logs} />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500">Меньше</span>
            {[0, 0.25, 0.5, 0.75, 1].map(opacity => (
              <div key={opacity} className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: opacity === 0 ? '#1e293b' : `rgba(99,102,241,${0.2 + opacity * 0.8})` }} />
            ))}
            <span className="text-xs text-slate-500">Больше</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Модалка создания привычки
interface CreateHabitModalProps {
  templates: HabitTemplate[]
  onClose: () => void
  onCreated: (habit: Habit) => void
}

function CreateHabitModal({ templates, onClose, onCreated }: CreateHabitModalProps) {
  const [tab, setTab] = useState<'custom' | 'template'>('custom')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'positive' | 'anti'>('positive')
  const [trackingType, setTrackingType] = useState<'discrete' | 'continuous'>('discrete')
  const [frequency, setFrequency] = useState('daily')
  const [timesPerDay, setTimesPerDay] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await habitsApi.create({ title, type, trackingType, frequency, timesPerDay })
      onCreated(result.habit)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateSelect = async (template: HabitTemplate) => {
    setIsLoading(true)
    try {
      const result = await habitsApi.create({
        title: template.title,
        type: template.type as any,
        trackingType: template.trackingType as any,
        timesPerDay: template.timesPerDay,
      })
      onCreated(result.habit)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl p-6 z-10 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Новая привычка</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Табы */}
        <div className="flex rounded-xl overflow-hidden mb-5" style={{ border: '1px solid #334155' }}>
          {(['custom', 'template'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-medium transition-all"
              style={{
                backgroundColor: tab === t ? '#4f46e5' : '#0f172a',
                color: tab === t ? '#fff' : '#94a3b8',
              }}>
              {t === 'custom' ? '✏️ Своя' : '📋 Шаблон'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-400"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {tab === 'custom' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Название *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                style={inputStyle} placeholder="Например: Читать 30 минут" required />
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Тип</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'positive', label: '✅ Положительная', desc: 'Хочу делать' },
                  { value: 'anti', label: '🚫 Антипривычка', desc: 'Хочу бросить' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setType(opt.value as any)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: type === opt.value ? 'rgba(99,102,241,0.2)' : '#0f172a',
                      border: `1px solid ${type === opt.value ? '#6366f1' : '#334155'}`,
                    }}>
                    <div className="text-sm text-white">{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Тип отслеживания</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'discrete', label: '☑️ Дискретное', desc: 'Сделал / не сделал' },
                  { value: 'continuous', label: '⏱ Непрерывное', desc: 'Считаем дни' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setTrackingType(opt.value as any)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: trackingType === opt.value ? 'rgba(99,102,241,0.2)' : '#0f172a',
                      border: `1px solid ${trackingType === opt.value ? '#6366f1' : '#334155'}`,
                    }}>
                    <div className="text-sm text-white">{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {trackingType === 'discrete' && (
              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">
                  Повторений в день: <span className="text-white font-medium">{timesPerDay}</span>
                </label>
                <input type="range" min={1} max={10} value={timesPerDay}
                  onChange={e => setTimesPerDay(Number(e.target.value))}
                  className="w-full accent-indigo-500" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 раз</span>
                  <span>10 раз</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-slate-400 text-sm mb-1.5 block">Частота</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'daily', label: 'Каждый день' },
                  { value: 'weekly', label: 'Несколько раз в неделю' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setFrequency(opt.value)}
                    className="py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      backgroundColor: frequency === opt.value ? '#4f46e5' : '#0f172a',
                      color: frequency === opt.value ? '#fff' : '#94a3b8',
                      border: `1px solid ${frequency === opt.value ? '#4f46e5' : '#334155'}`,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-lg text-slate-400"
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                Отмена
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 py-3 rounded-lg text-white font-medium"
                style={{ backgroundColor: '#4f46e5', opacity: isLoading ? 0.7 : 1 }}>
                {isLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {templates.map(template => (
              <button key={template.title}
                onClick={() => handleTemplateSelect(template)}
                disabled={isLoading}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:border-indigo-500/50"
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <span className="text-2xl shrink-0">
                  {template.type === 'anti' ? '🚫' : '✅'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{template.title}</p>
                  <p className="text-slate-500 text-xs">
                    {template.trackingType === 'discrete'
                      ? `${template.timesPerDay}x в день`
                      : 'Непрерывное отслеживание'}
                    {' · '}{template.category}
                  </p>
                </div>
                <Plus size={16} className="text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HabitsPage() {
  const { user, loadUser } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [templates, setTemplates] = useState<HabitTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [lastRewards, setLastRewards] = useState<Record<number, { xp: number; gold: number }>>({})

  useEffect(() => {
    Promise.all([loadHabits(), loadTemplates()])
  }, [])

  const loadHabits = async () => {
    try {
      const data = await habitsApi.getAll()
      setHabits(data.habits)
    } catch (error) {
      console.error('Load habits error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const data = await habitsApi.getTemplates()
      setTemplates(data.templates)
    } catch {}
  }

  const handleLog = async (id: number) => {
    try {
      const result = await habitsApi.log(id)

      setHabits(prev => prev.map(h => {
        if (h.id !== id) return h
        const newLog = { id: Date.now(), date: new Date().toISOString(), repetition: result.repetitionsDone }
        return {
          ...h,
          logs: [...h.logs, newLog],
          currentStreak: result.currentStreak,
        }
      }))

      if (result.xpEarned > 0 || result.goldEarned > 0) {
        setLastRewards(prev => ({ ...prev, [id]: { xp: result.xpEarned, gold: result.goldEarned } }))
        loadUser()
        setTimeout(() => {
          setLastRewards(prev => { const n = { ...prev }; delete n[id]; return n })
        }, 3000)
      }
    } catch (error: any) {
      console.error('Log error:', error.response?.data?.error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить привычку? История выполнений также удалится.')) return
    try {
      await habitsApi.delete(id)
      setHabits(prev => prev.filter(h => h.id !== id))
    } catch {}
  }

  const handleRestoreStreak = async (id: number) => {
    if (!confirm('Восстановить стрик за 50 🪙?')) return
    try {
      await habitsApi.restoreStreak(id)
      setHabits(prev => prev.map(h =>
        h.id === id ? { ...h, currentStreak: h.currentStreak + 1 } : h
      ))
      loadUser()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка восстановления')
    }
  }

  const completedCount = habits.filter(h =>
    h.trackingType === 'discrete' && h.logs.length >= h.timesPerDay
  ).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка привычек...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Привычки</h1>
          <p className="text-slate-400 text-sm mt-1">
            {completedCount}/{habits.filter(h => h.trackingType === 'discrete').length} выполнено сегодня
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#4f46e5' }}>
          <Plus size={18} /> Новая привычка
        </button>
      </div>

      {/* Прогресс дня */}
      {habits.filter(h => h.trackingType === 'discrete').length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Прогресс дня</span>
            <span className="text-white font-medium">
              {completedCount}/{habits.filter(h => h.trackingType === 'discrete').length}
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${habits.filter(h => h.trackingType === 'discrete').length > 0
                  ? (completedCount / habits.filter(h => h.trackingType === 'discrete').length) * 100
                  : 0}%`,
                backgroundColor: completedCount === habits.filter(h => h.trackingType === 'discrete').length && completedCount > 0
                  ? '#22c55e' : '#4f46e5'
              }} />
          </div>
          {completedCount === habits.filter(h => h.trackingType === 'discrete').length && completedCount > 0 && (
            <p className="text-green-400 text-sm mt-2 text-center">🎉 Все привычки выполнены!</p>
          )}
        </div>
      )}

      {/* Список привычек */}
      {habits.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="text-5xl mb-4">🌱</div>
          <h3 className="text-white font-semibold mb-2">Нет привычек</h3>
          <p className="text-slate-400 text-sm mb-6">
            Начните с малого — добавьте первую привычку
          </p>
          <button onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#4f46e5' }}>
            Добавить привычку
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Антипривычки сверху */}
          {habits.filter(h => h.type === 'anti').map(habit => (
            <HabitCard key={habit.id} habit={habit}
              userGold={user?.gold || 0}
              onLog={handleLog}
              onDelete={handleDelete}
              onRestoreStreak={handleRestoreStreak}
              lastReward={lastRewards[habit.id] || null}
            />
          ))}

          {/* Обычные привычки */}
          {habits.filter(h => h.type === 'positive').map(habit => (
            <HabitCard key={habit.id} habit={habit}
              userGold={user?.gold || 0}
              onLog={handleLog}
              onDelete={handleDelete}
              onRestoreStreak={handleRestoreStreak}
              lastReward={lastRewards[habit.id] || null}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateHabitModal
          templates={templates}
          onClose={() => setShowCreateModal(false)}
          onCreated={habit => setHabits(prev => [...prev, habit])}
        />
      )}
    </div>
  )
}
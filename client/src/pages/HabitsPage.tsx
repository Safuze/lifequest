import { useState, useEffect } from 'react'
import { habitsApi } from '../api/habits'
import type { Habit, HabitTemplate} from '../api/habits'
import { useAuth } from '../hooks/useAuth'
import { Plus, Trash2, X, Flame, Trophy, RotateCcw, ChevronDown, ChevronUp, Calendar, AlertTriangle } from 'lucide-react'
import { dispatchRewards } from '../utils/dispatchRewards'

// ============ УТИЛИТЫ ============

// Динамический счётчик для непрерывных привычек
function formatDuration(startDate: string): string {
  const start = new Date(startDate)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffMonth = Math.floor(diffDay / 30.44)
  const diffYear = Math.floor(diffMonth / 12)

  if (diffMin < 1) return `${diffSec} сек.`
  if (diffHour < 1) return `${diffMin} мин.`
  if (diffDay < 1) {
    const h = diffHour
    const m = diffMin % 60
    return m > 0 ? `${h} час. ${m} мин.` : `${h} час.`
  }
  if (diffMonth < 1) {
    const d = diffDay
    const h = diffHour % 24
    return h > 0 ? `${d} дн. ${h} час.` : `${d} дн.`
  }
  if (diffYear < 1) {
    const mo = diffMonth
    const d = diffDay % 30
    return d > 0 ? `${mo} мес. ${d} дн.` : `${mo} мес.`
  }
  const y = diffYear
  const mo = diffMonth % 12
  return mo > 0 ? `${y} г. ${mo} мес.` : `${y} г.`
}

interface HeatmapDay {
  date: string
  completedCount: number
  totalCount: number
  percent: number
}

function HabitHeatmap({ days = 30 }: { days?: number }) {
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    habitsApi.getHeatmap(days).then(d => {
      setHeatmap(d.heatmap)
      setIsLoading(false)
    })
  }, [days])

  if (isLoading) return <div className="text-slate-400 text-sm text-center py-4">Загрузка...</div>

  const getColor = (percent: number) => {
    if (percent === 0) return '#1e293b'
    if (percent <= 25) return 'rgba(99,102,241,0.3)'
    if (percent <= 50) return 'rgba(99,102,241,0.55)'
    if (percent <= 75) return 'rgba(99,102,241,0.8)'
    return '#4f46e5'
  }

  const getBorder = (percent: number) => {
    if (percent === 0) return '#334155'
    if (percent <= 25) return 'rgba(99,102,241,0.4)'
    if (percent <= 50) return 'rgba(99,102,241,0.6)'
    if (percent <= 75) return 'rgba(99,102,241,0.85)'
    return '#6366f1'
  }

  const today = new Date().toISOString().split('T')[0]

  // Разбиваем на недели (строки по 7)
  const weeks: HeatmapDay[][] = []
  for (let i = 0; i < heatmap.length; i += 7) {
    weeks.push(heatmap.slice(i, i + 7))
  }

  const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div>
      {/* Легенда */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-slate-500 text-xs">Меньше</span>
        {[0, 25, 50, 75, 100].map(p => (
          <div key={p} className="w-4 h-4 rounded-sm"
            style={{ backgroundColor: getColor(p), border: `1px solid ${getBorder(p)}` }} />
        ))}
        <span className="text-slate-500 text-xs">Больше</span>
      </div>

      {/* Метки дней недели */}
      <div className="flex gap-1 mb-1 ml-0">
        {DAYS_RU.map(d => (
          <div key={d} className="w-8 text-center text-slate-600 text-xs">{d}</div>
        ))}
      </div>

      {/* Сетка */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map((day) => {
              const isToday = day.date === today
              const isFuture = day.date > today
              const d = new Date(day.date)
              const dayNum = d.getDate()

              return (
                <div key={day.date}
                  title={`${day.date}: ${day.completedCount}/${day.totalCount} привычек (${day.percent}%)`}
                  className="relative w-8 h-8 rounded-md flex items-center justify-center cursor-default transition-all hover:scale-110"
                  style={{
                    backgroundColor: isFuture ? 'transparent' : getColor(day.percent),
                    border: `1px solid ${isFuture ? '#1e293b' : getBorder(day.percent)}`,
                    boxShadow: isToday ? '0 0 0 2px #6366f1' : 'none',
                    opacity: isFuture ? 0.3 : 1,
                  }}>
                  <span className="text-xs font-medium"
                    style={{ color: day.percent > 50 && !isFuture ? '#e2e8f0' : '#64748b' }}>
                    {dayNum}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Статистика под картой */}
      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
        <span>🟦 0–25%</span>
        <span>🔵 25–50%</span>
        <span>💙 50–75%</span>
        <span>🟣 75–100%</span>
      </div>
    </div>
  )
}

// Тепловая карта за N дней
function Heatmap({ logs, days = 30 }: { logs: { date: string }[]; days?: number }) {
  const today = new Date()
  const cells: { date: string; count: number }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = logs.filter(l => l.date.startsWith(dateStr)).length
    cells.push({ date: dateStr, count })
  }

  const maxCount = Math.max(...cells.map(c => c.count), 1)

  // Группируем по неделям для 365-дневной карты
  if (days === 365) {
    const weeks: { date: string; count: number }[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }
    return (
      <div className="flex gap-0.5 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map(cell => (
              <div key={cell.date}
                className="w-3 h-3 rounded-sm"
                title={`${cell.date}: ${cell.count} отметок`}
                style={{
                  backgroundColor: cell.count === 0
                    ? '#1e293b'
                    : `rgba(99,102,241,${0.2 + (cell.count / maxCount) * 0.8})`
                }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-0.5 flex-wrap">
      {cells.map(cell => (
        <div key={cell.date}
          className="w-3 h-3 rounded-sm"
          title={`${cell.date}: ${cell.count}`}
          style={{
            backgroundColor: cell.count === 0
              ? '#1e293b'
              : `rgba(99,102,241,${0.2 + (cell.count / maxCount) * 0.8})`
          }}
        />
      ))}
    </div>
  )
}

// Легенда тепловой карты
function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-500">Меньше</span>
      {[0, 0.2, 0.5, 0.8, 1].map(o => (
        <div key={o} className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: o === 0 ? '#1e293b' : `rgba(99,102,241,${0.2 + o * 0.8})` }} />
      ))}
      <span className="text-xs text-slate-500">Больше</span>
    </div>
  )
}

// ============ МОДАЛКА ПОДТВЕРЖДЕНИЯ НАРУШЕНИЯ ============
interface BreakConfirmModalProps {
  habitTitle: string
  onConfirm: () => void
  onClose: () => void
}

function BreakConfirmModal({ habitTitle, onConfirm, onClose }: BreakConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 z-10 text-center"
        style={{ backgroundColor: '#1e293b', border: '1px solid rgba(239,68,68,0.4)' }}>
        <div className="text-4xl mb-3">💔</div>
        <h3 className="text-white font-semibold text-lg mb-2">Вы уверены?</h3>
        <p className="text-slate-400 text-sm mb-2">
          Привычка «<span className="text-white">{habitTitle}</span>» будет нарушена.
        </p>
        <p className="text-red-400 text-sm mb-6">
          Счётчик обнулится и привычка удалится. Это действие необратимо.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-medium text-white"
            style={{ backgroundColor: '#4f46e5' }}>
            Нет, продолжаю!
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-medium"
            style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}>
            Да, нарушил
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ КАРТОЧКА ПРИВЫЧКИ ============
interface HabitCardProps {
  habit: Habit
  userGold: number
  onLog: (id: number) => void
  onBreak: (id: number) => void
  onDelete: (id: number) => void
  onRestoreStreak: (id: number) => void
  lastReward: { xp: number; gold: number } | null
  heatmapView: 'month' | 'year'
  streakRestored: boolean
}

function getStreakBorderStyle(streak: number): { borderColor: string; boxShadow?: string; label?: string } {
  if (streak >= 365) return {
    borderColor: '#b9f2ff',  // алмаз
    boxShadow: '0 0 12px rgba(185,242,255,0.4), 0 0 24px rgba(185,242,255,0.2)',
    label: '💠 Алмаз',
  }
  if (streak >= 180) return {
    borderColor: '#ef4444',  // рубин
    boxShadow: '0 0 10px rgba(239,68,68,0.4)',
    label: '♦️ Рубин',
  }
  if (streak >= 90) return {
    borderColor: '#10b981',  // изумруд
    boxShadow: '0 0 10px rgba(16,185,129,0.3)',
    label: '💚 Изумруд',
  }
  if (streak >= 30) return {
    borderColor: '#f59e0b',  // золото
    boxShadow: '0 0 8px rgba(245,158,11,0.3)',
    label: '🥇 Золото',
  }
  if (streak >= 7) return {
    borderColor: '#94a3b8',  // серебро
    boxShadow: '0 0 6px rgba(148,163,184,0.2)',
    label: '🥈 Серебро',
  }
  // до 7 — бронза если есть хоть какой-то стрик
  if (streak >= 3) return {
    borderColor: '#b45309',  // бронза
    label: '🥉 Бронза',
  }
  return { borderColor: '#334155' }
}

function HabitCard({ habit, userGold, onLog, onBreak, onDelete, onRestoreStreak, lastReward, heatmapView, streakRestored  }: HabitCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [timer, setTimer] = useState('')
  console.log(habit.canRestoreStreak)
  const todayLogs = habit.logs.length
  const isCompleted = habit.trackingType === 'discrete' && todayLogs >= habit.timesPerDay

  const streakStyle = habit.trackingType === 'discrete'
    ? getStreakBorderStyle(habit.currentStreak)
    : { borderColor: '#334155' }

  // Обновляем счётчик для непрерывных привычек
  useEffect(() => {
    if (habit.trackingType !== 'continuous' || !habit.startDate) return
    const update = () => setTimer(formatDuration(habit.startDate!))
    update()
    const interval = setInterval(update, 30000) // каждые 30 секунд
    return () => clearInterval(interval)
  }, [habit.trackingType, habit.startDate])
  
  return (
    
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        backgroundColor: '#1e293b',
        border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.4)' : streakStyle.borderColor}`,
        boxShadow: !isCompleted && streakStyle.boxShadow ? streakStyle.boxShadow : 'none',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        marginTop: '10px',
      }}>
      <div className="p-4">
        {/* Заголовок */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{habit.type === 'anti' ? '🚫' : '✅'}</span>
              <h3 className="text-white font-medium truncate">{habit.title}</h3>
              {habit.trackingType === 'continuous' && (
                <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                  непрерывная
                </span>
              )}
            </div>

            {/* Стрик (только для дискретных) */}
            {habit.trackingType === 'discrete' && (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Flame size={12} className="text-orange-400" />
                  <span className="text-orange-400 font-medium">{habit.currentStreak}</span> дн.
                </span>
                <span className="flex items-center gap-1">
                  <Trophy size={12} className="text-yellow-400" />
                  Рекорд: <span className="text-yellow-400 font-medium">{habit.bestStreak}</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-slate-500 hover:text-white transition-colors">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={() => onDelete(habit.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Счётчик для непрерывных */}
        {habit.trackingType === 'continuous' && habit.startDate && (
          <div className="mb-3 p-3 rounded-xl"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div className="text-xs text-slate-400 mb-1">
              {habit.type === 'anti' ? '⏱ Без нарушений:' : '⏱ Выполняется:'}
            </div>
            <div className="text-xl font-bold font-mono"
              style={{ color: habit.type === 'anti' ? '#22c55e' : '#6366f1' }}>
              {timer}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              с {new Date(habit.startDate).toLocaleDateString('ru-RU')}
            </div>
          </div>
        )}

        {/* Кнопки действий */}
        {habit.trackingType === 'discrete' ? (
          habit.canRestoreStreak ? (
            // ТОЛЬКО ВОССТАНОВЛЕНИЕ
            <button
              onClick={() => onRestoreStreak(habit.id)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: 'rgba(245,158,11,0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)'
              }}>
              <RotateCcw size={14} />
              Восстановить стрик за<strong>50</strong>баллов
            </button>
          ) : (
            // ОБЫЧНЫЕ КНОПКИ
            <div className="flex items-center gap-3">
              {habit.timesPerDay > 1 && (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex gap-1 flex-1">
                    {Array.from({ length: habit.timesPerDay }).map((_, i) => (
                      <div key={i}
                        className="h-1.5 flex-1 rounded-full transition-all"
                        style={{ backgroundColor: i < todayLogs ? '#22c55e' : '#334155' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {todayLogs}/{habit.timesPerDay}
                  </span>
                </div>
              )}

              <button
                onClick={() => !isCompleted && onLog(habit.id)}
                disabled={isCompleted}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: isCompleted ? 'rgba(34,197,94,0.15)' : '#4f46e5',
                  color: isCompleted ? '#22c55e' : '#fff',
                  border: isCompleted ? '1px solid rgba(34,197,94,0.3)' : 'none',
                  cursor: isCompleted ? 'default' : 'pointer',
                  minWidth: '110px',
                }}>
                {isCompleted
                  ? '✓ Готово'
                  : habit.timesPerDay > 1
                    ? `+1 (${todayLogs}/${habit.timesPerDay})`
                    : 'Отметить'}
              </button>
            </div>
          )
        ) : (
          // непрерывные привычки не трогаем
          <button
            onClick={() => onBreak(habit.id)}
            className="w-full py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
            }}>
            Нарушил
          </button>
        )}

        {/* Награда */}
        {lastReward && (lastReward.xp > 0 || lastReward.gold > 0) && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            {lastReward.xp > 0 && <span className="text-indigo-400">+{lastReward.xp} XP</span>}
            {lastReward.gold > 0 && <span className="text-yellow-400">+{lastReward.gold} Балла</span>}
          </div>
        )}
      </div>

      {/* Тепловая карта (разворачивается) */}
      {expanded && habit.trackingType === 'discrete' && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid #334155' }}>
          <p className="text-slate-500 text-xs mt-3 mb-2">
            Активность за {heatmapView === 'month' ? '30' : '365'} дней:
          </p>
          <Heatmap logs={habit.logs} days={heatmapView === 'month' ? 30 : 365} />
          <HeatmapLegend />
        </div>
      )}
    </div>
  )
}

// ============ МОДАЛКА СОЗДАНИЯ ============
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
  const [startDate, setStartDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [templateStartDate, setTemplateStartDate] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | null>(null)

  const maxDate = new Date().toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const payload: any = { title, type, trackingType, frequency, timesPerDay }
      if (trackingType === 'continuous' && startDate) {
        payload.startDate = new Date(startDate).toISOString()
      }
      const result = await habitsApi.create(payload)
      onCreated(result.habit)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateSelect = async (template: HabitTemplate) => {
    // Если непрерывная — сначала показываем выбор даты
    if (template.trackingType === 'continuous') {
      setSelectedTemplate(template)
      return
    }
    // Дискретная — сразу создаём
    await createFromTemplate(template, undefined)
  }

  const createFromTemplate = async (template: HabitTemplate, startDate?: string) => {
    setIsLoading(true)
    try {
      const payload: any = {
        title: template.title,
        type: template.type as any,
        trackingType: template.trackingType as any,
        timesPerDay: template.timesPerDay,
      }
      if (startDate) payload.startDate = new Date(startDate).toISOString()
      const result = await habitsApi.create(payload)
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
              <label className="text-slate-400 text-sm mb-1.5 block">Тип привычки</label>
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
                  { value: 'discrete', label: '☑️ Дискретное', desc: 'Отмечаю каждый день' },
                  { value: 'continuous', label: '⏱ Непрерывное', desc: 'Идёт счётчик дней' },
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
              <>
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">
                    Повторений в день: <span className="text-white font-medium">{timesPerDay}</span>
                  </label>
                  <input type="range" min={1} max={10} value={timesPerDay}
                    onChange={e => setTimesPerDay(Number(e.target.value))}
                    className="w-full accent-indigo-500" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1 раз</span><span>10 раз</span>
                  </div>
                </div>
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
              </>
            )}

            {trackingType === 'continuous' && (
              <div>
                <label className="text-slate-400 text-sm mb-1.5 block">
                  <Calendar size={14} className="inline mr-1" />
                  Дата начала
                  <span className="text-slate-500 ml-1">(если началось раньше сегодня)</span>
                </label>
                <input type="date" value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  max={maxDate}
                  className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  style={{ ...inputStyle, color: startDate ? '#fff' : '#64748b' }} />
                <p className="text-slate-500 text-xs mt-1">
                  Оставьте пустым — счётчик начнётся с сегодняшнего дня
                </p>
              </div>
            )}

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
          <>
            {selectedTemplate ? (
              // Мини-форма для даты непрерывного шаблона
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                  <span className="text-2xl">{selectedTemplate.type === 'anti' ? '🚫' : '✅'}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{selectedTemplate.title}</p>
                    <p className="text-slate-500 text-xs">Непрерывное отслеживание</p>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">
                    📅 Дата начала
                    <span className="text-slate-500 ml-1">(если началось раньше сегодня)</span>
                  </label>
                  <input type="date" value={templateStartDate}
                    onChange={e => setTemplateStartDate(e.target.value)}
                    max={maxDate}
                    className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: templateStartDate ? '#fff' : '#64748b' }} />
                  <p className="text-slate-500 text-xs mt-1">
                    Оставьте пустым — отсчёт начнётся с сегодня
                  </p>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setSelectedTemplate(null)}
                    className="flex-1 py-3 rounded-lg text-slate-400"
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                    ← Назад
                  </button>
                  <button type="button"
                    onClick={() => createFromTemplate(selectedTemplate, templateStartDate || undefined)}
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-lg text-white font-medium"
                    style={{ backgroundColor: '#4f46e5', opacity: isLoading ? 0.7 : 1 }}>
                    {isLoading ? 'Создание...' : 'Создать'}
                  </button>
                </div>
              </div>
            ) : (
              // Список шаблонов
              <div className="space-y-2">
                {templates.map(template => (
                  <button key={template.title}
                    onClick={() => handleTemplateSelect(template)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:border-indigo-500/50"
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                    <span className="text-2xl shrink-0">{template.type === 'anti' ? '🚫' : '✅'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{template.title}</p>
                      <p className="text-slate-500 text-xs">
                        {template.trackingType === 'continuous'
                          ? '⏱ Непрерывное · '
                          : `${template.timesPerDay}x в день · `}
                        {template.category}
                      </p>
                    </div>
                    <Plus size={16} className="text-indigo-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
export default function HabitsPage() {
  const { user, loadUser } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [templates, setTemplates] = useState<HabitTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [lastRewards, setLastRewards] = useState<Record<number, { xp: number; gold: number }>>({})
  const [heatmapView, setHeatmapView] = useState<'month' | 'year'>('month')
  const [breakConfirmId, setBreakConfirmId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'habits' | 'heatmap'>('habits')
  const [restoringStreakIds, setRestoringStreakIds] = useState<Set<number>>(new Set())
  const [heatmapDays, setHeatmapDays] = useState(30)
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
        return { ...h, logs: [...h.logs, newLog], currentStreak: result.currentStreak }
      }))
      if (result.xpEarned > 0 || result.goldEarned > 0) {
        setLastRewards(prev => ({ ...prev, [id]: { xp: result.xpEarned, gold: result.goldEarned } }))
        loadUser()
        setTimeout(() => {
          setLastRewards(prev => { const n = { ...prev }; delete n[id]; return n })
        }, 3000)
      }
      // Показываем модалки
      if (result.achievements?.length || result.levelUp) {
        dispatchRewards(result.achievements, result.levelUp)
      }
    } catch (error: any) {
      console.error('Log error:', error.response?.data?.error)
    }
  }

  const handleBreakConfirm = async () => {
    if (!breakConfirmId) return
    try {
      await habitsApi.break(breakConfirmId)
      setHabits(prev => prev.filter(h => h.id !== breakConfirmId))
    } catch (error: any) {
      console.error('Break error:', error)
    } finally {
      setBreakConfirmId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить привычку?')) return
    try {
      await habitsApi.delete(id)
      setHabits(prev => prev.filter(h => h.id !== id))
    } catch {}
  }

  const handleRestoreStreak = async (id: number) => {
    if (restoringStreakIds.has(id)) return // уже восстанавливается
    if (!confirm('Восстановить стрик за 50 баллов?')) return
    
    // Немедленно блокируем кнопку
    setRestoringStreakIds(prev => new Set([...prev, id]))
    
    try {
      await habitsApi.restoreStreak(id)
      // просто обнови данные с сервера
      await loadHabits()
      loadUser()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка')
      // Если ошибка — разблокируем
      setRestoringStreakIds(prev => { const n = new Set(prev); n.delete(id); return n })
    }
    // При успехе — НЕ разблокируем, кнопка остаётся скрытой до следующего дня
  }

  const discreteHabits = habits.filter(h => h.trackingType === 'discrete')
  const continuousHabits = habits.filter(h => h.trackingType === 'continuous')
  const completedCount = discreteHabits.filter(h => h.logs.length >= h.timesPerDay).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка привычек...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Привычки</h1>
          {discreteHabits.length > 0 && (
            <p className="text-slate-400 text-sm mt-1">
              {completedCount}/{discreteHabits.length} выполнено сегодня
            </p>
          )}
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#4f46e5' }}>
          <Plus size={18} /> Новая привычка
        </button>
      </div>

      {/* Табы */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        {([
          { id: 'habits', label: '📋 Привычки' },
          { id: 'heatmap', label: '🗓 Активность' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? '#4f46e5' : '#1e293b',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'habits' && (
        <>
          {/* Прогресс дня */}
          {discreteHabits.length > 0 && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Прогресс дня</span>
                <span className="text-white font-medium">{completedCount}/{discreteHabits.length}</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${discreteHabits.length > 0 ? (completedCount / discreteHabits.length) * 100 : 0}%`,
                    backgroundColor: completedCount === discreteHabits.length && completedCount > 0 ? '#22c55e' : '#4f46e5'
                  }} />
              </div>
              {completedCount === discreteHabits.length && completedCount > 0 && (
                <p className="text-green-400 text-sm mt-2 text-center">🎉 Все привычки выполнены!</p>
              )}
            </div>
          )}

          {habits.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <div className="text-5xl mb-4">🌱</div>
              <h3 className="text-white font-semibold mb-2">Нет привычек</h3>
              <p className="text-slate-400 text-sm mb-6">Начните с малого — добавьте первую привычку</p>
              <button onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#4f46e5' }}>
                Добавить привычку
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Непрерывные сверху */}
              {continuousHabits.length > 0 && (
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">⏱ Непрерывные</p>
                  {continuousHabits.map(habit => (
                    <HabitCard key={habit.id} habit={habit}
                      userGold={user?.gold || 0}
                      onLog={handleLog}
                      onBreak={(id) => setBreakConfirmId(id)}
                      onDelete={handleDelete}
                      onRestoreStreak={handleRestoreStreak}
                      lastReward={lastRewards[habit.id] || null}
                      heatmapView={heatmapView}
                      streakRestored={restoringStreakIds.has(habit.id)}
                    />
                  ))}
                </div>
              )}

              {/* Дискретные */}
              {discreteHabits.length > 0 && (
                <div>
                  {continuousHabits.length > 0 && (
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">☑️ Ежедневные</p>
                  )}
                  {discreteHabits.map(habit => (
                    <HabitCard key={habit.id} habit={habit}
                      userGold={user?.gold || 0}
                      onLog={handleLog}
                      onBreak={(id) => setBreakConfirmId(id)}
                      onDelete={handleDelete}
                      onRestoreStreak={handleRestoreStreak}
                      lastReward={lastRewards[habit.id] || null}
                      heatmapView={heatmapView}
                      streakRestored={restoringStreakIds.has(habit.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'heatmap' && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Активность привычек</h3>
            <select
              onChange={e => setHeatmapDays(parseInt(e.target.value))}
              className="text-sm rounded-lg px-3 py-1.5 outline-none"
              style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
            </select>
          </div>
          <HabitHeatmap days={heatmapDays} />
        </div>
      )}

      {/* Модалки */}
      {showCreateModal && (
        <CreateHabitModal
          templates={templates}
          onClose={() => setShowCreateModal(false)}
          onCreated={habit => setHabits(prev => [...prev, habit])}
        />
      )}

      {breakConfirmId !== null && (
        <BreakConfirmModal
          habitTitle={habits.find(h => h.id === breakConfirmId)?.title || ''}
          onConfirm={handleBreakConfirm}
          onClose={() => setBreakConfirmId(null)}
        />
      )}
    </div>
  )
}
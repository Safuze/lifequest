import { useState, useEffect } from 'react'
import { goalsApi } from '../api/goals'
import type { Goal, CreateGoalData } from '../api/goals'
import { Plus, Target, Clock, Trash2, CheckCircle, PauseCircle, X } from 'lucide-react'

const HORIZONS = [
  { value: 'day',      label: 'На день'  },
  { value: 'week',     label: 'На неделю'},
  { value: 'month',    label: 'На месяц' },
  { value: 'year',     label: 'На год'   },
  { value: 'longterm', label: 'Долгосрочная' },
]

const CATEGORIES = [
  { value: 'учёба',   label: 'Учёба',   color: '#4f46e5', emoji: '📚' },
  { value: 'работа',  label: 'Работа',  color: '#f59e0b', emoji: '💼' },
  { value: 'здоровье',label: 'Здоровье',color: '#22c55e', emoji: '💪' },
  { value: 'хобби',   label: 'Хобби',   color: '#ec4899', emoji: '🎨' },
  { value: 'личное',  label: 'Личное',  color: '#6b7280', emoji: '👤' },
  { value: 'проект',  label: 'Проект',  color: '#b6c94d', emoji: '✍️' },
]

const STATUS_CONFIG = {
  active:    { label: 'Активна',      color: '#22c55e', icon: Target },
  completed: { label: 'Завершена',    color: '#4f46e5', icon: CheckCircle },
  paused:    { label: 'На паузе',     color: '#f59e0b', icon: PauseCircle },
}

function getCategoryConfig(value: string) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[4]
}

interface CreateGoalModalProps {
  onClose: () => void
  onCreated: (goal: Goal) => void
}

function CreateGoalModal({ onClose, onCreated }: CreateGoalModalProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [horizon, setHorizon] = useState('week')
  const [plannedHours, setPlannedHours] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [deadline, setDeadline] = useState('')


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const data: CreateGoalData = {
        title,
        horizon,
        ...(category && { category }),
        ...(plannedHours && { plannedHours: parseFloat(plannedHours) }),
        ...(deadline && { deadline: new Date(deadline).toISOString() }),
      }
      const result = await goalsApi.create(data)
      onCreated(result.goal)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания цели')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#fff',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 z-10"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Новая цель</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-400"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Название цели *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              style={inputStyle}
              placeholder="Например: Написать дипломную работу"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">
              Категория
              <span className="text-slate-500 ml-1">(определится автоматически)</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                  className="flex flex-col items-center p-2 rounded-lg text-xs transition-all"
                  style={{
                    backgroundColor: category === cat.value ? `${cat.color}25` : '#0f172a',
                    border: `1px solid ${category === cat.value ? cat.color : '#334155'}`,
                    color: category === cat.value ? cat.color : '#94a3b8',
                  }}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="mt-0.5 truncate w-full text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Горизонт планирования *</label>
            <select
              value={horizon}
              onChange={e => setHorizon(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              style={inputStyle}
            >
              {HORIZONS.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">
                Дата дедлайна
                <span className="text-slate-500 ml-1">(необязательно)</span>
            </label>
            <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                color: deadline ? '#fff' : '#64748b',
                }}
                min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">
              Плановых часов в неделю
              <span className="text-slate-500 ml-1">(необязательно)</span>
            </label>
            <input
              type="number"
              value={plannedHours}
              onChange={e => setPlannedHours(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              style={inputStyle}
              placeholder="Например: 20"
              min="0.5"
              max="168"
              step="0.5"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-slate-400 font-medium transition-colors hover:text-white"
              style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 rounded-lg text-white font-medium transition-opacity"
              style={{ backgroundColor: '#4f46e5', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? 'Создание...' : 'Создать цель'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all')

  useEffect(() => {
  const loadGoals = async () => {
    try {
      const data = await goalsApi.getAll()
      setGoals(data.goals)
    } catch (error) {
      console.error('Failed to load goals:', error)
    } finally {
      setIsLoading(false)
    }
  }

    loadGoals()
    }, [])
  

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить цель? Все связанные задачи останутся.')) return
    try {
      await goalsApi.delete(id)
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const result = await goalsApi.update(id, { status })
      setGoals(prev => prev.map(g => g.id === id ? result.goal : g))
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  const filteredGoals = goals.filter(g => filter === 'all' || g.status === filter)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка целей...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Мои цели</h1>
          <p className="text-slate-400 text-sm mt-1">{goals.length} целей всего</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#4f46e5' }}
        >
          <Plus size={18} />
          Новая цель
        </button>
      </div>

      {/* Фильтры */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'completed', 'paused'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: filter === f ? '#4f46e5' : '#1e293b',
              color: filter === f ? '#fff' : '#94a3b8',
              border: `1px solid ${filter === f ? '#4f46e5' : '#334155'}`,
            }}
          >
            {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : f === 'completed' ? 'Завершённые' : 'На паузе'}
          </button>
        ))}
      </div>

      {/* Список целей */}
      {filteredGoals.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
        >
          <Target size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-white font-semibold mb-2">
            {filter === 'all' ? 'Нет целей' : 'Нет целей в этой категории'}
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            {filter === 'all' ? 'Создайте первую цель и начните отслеживать прогресс' : 'Попробуйте другой фильтр'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2.5 rounded-xl text-white font-medium"
              style={{ backgroundColor: '#4f46e5' }}
            >
              Создать первую цель
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map(goal => {
            const cat = getCategoryConfig(goal.category)
            const statusCfg = STATUS_CONFIG[goal.status as keyof typeof STATUS_CONFIG]
            const progressPercent = goal.plannedHours
              ? Math.min((goal.spentHours / goal.plannedHours) * 100, 100)
              : goal.progress

            return (
              <div
                key={goal.id}
                className="rounded-2xl p-5"
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">{goal.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.label}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {HORIZONS.find(h => h.value === goal.horizon)?.label}
                        </span>
                        {goal.deadline && (
                           <span className="text-slate-500 text-xs flex items-center gap-1">
                                📅 {new Date(goal.deadline).toLocaleDateString('ru-RU')}
                            </span>
                            )}
                        {goal._count && (
                          <span className="text-slate-500 text-xs">
                            {goal._count.tasks} задач
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={goal.status}
                      onChange={e => handleStatusChange(goal.id, e.target.value)}
                      className="text-xs rounded-lg px-2 py-1.5 outline-none"
                      style={{
                        backgroundColor: `${statusCfg.color}15`,
                        color: statusCfg.color,
                        border: `1px solid ${statusCfg.color}30`,
                      }}
                    >
                      <option value="active">Активна</option>
                      <option value="completed">Завершена</option>
                      <option value="paused">На паузе</option>
                    </select>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Прогресс */}
                {goal.plannedHours && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {goal.spentHours.toFixed(1)} / {goal.plannedHours} часов
                      </span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressPercent}%`,
                          backgroundColor: progressPercent >= 100 ? '#22c55e' : cat.color,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <CreateGoalModal
          onClose={() => setShowModal(false)}
          onCreated={goal => setGoals(prev => [goal, ...prev])}
        />
      )}
    </div>
  )
}
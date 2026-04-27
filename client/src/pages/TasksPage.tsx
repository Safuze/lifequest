import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { tasksApi } from '../api/tasks'
import type { Task, CreateTaskData } from '../api/tasks'

import { goalsApi } from '../api/goals'
import type { Goal } from '../api/goals'
import {
  Plus, List, LayoutGrid, Search, Trash2, X,
  Clock, Flag, Pin, Star, Play, ChevronLeft,
  ChevronRight, Calendar, CheckSquare
} from 'lucide-react'

const PRIORITY_CONFIG = {
  low:      { label: 'Низкий',       color: '#22c55e', bg: 'rgba(34,197,94,0.15)',    order: 1 },
  medium:   { label: 'Средний',      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',   order: 2 },
  high:     { label: 'Высокий',      color: '#ef4444', bg: 'rgba(239,68,68,0.15)',    order: 3 },
  critical: { label: 'Критический',  color: '#a855f7', bg: 'rgba(168,85,247,0.15)',   order: 4 },
}

const CATEGORIES_TASK = [
  { value: 'учёба',    label: 'Учёба',    emoji: '📚' },
  { value: 'работа',   label: 'Работа',   emoji: '💼' },
  { value: 'здоровье', label: 'Здоровье', emoji: '💪' },
  { value: 'хобби',    label: 'Хобби',    emoji: '🎨' },
  { value: 'личное',   label: 'Личное',   emoji: '👤' },
]

const COLUMNS = [
  { id: 'todo',       label: 'К выполнению' },
  { id: 'inProgress', label: 'В процессе'   },
  { id: 'done',       label: 'Готово'        },
]

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const hasTime = !(hours === 23 && minutes === 59)
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit' } : {})
  })
}

// ============ МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЗАДАЧИ ============
interface CreateTaskModalProps {
  goals: Goal[]
  defaultDueDate?: string
  onClose: () => void
  onCreated: (task: Task) => void
}

function CreateTaskModal({ goals, defaultDueDate, onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('')
  const [goalId, setGoalId] = useState('')
  const [dueDate, setDueDate] = useState(defaultDueDate || toDateInputValue(new Date()))
  const [dueTime, setDueTime] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [labels, setLabels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const addLabel = () => {
    const trimmed = labelInput.trim()
    if (trimmed && !labels.includes(trimmed)) {
      setLabels(prev => [...prev, trimmed])
      setLabelInput('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const dateTime = dueDate
        ? dueTime
          ? new Date(`${dueDate}T${dueTime}:00`).toISOString()
          : new Date(`${dueDate}T23:59:00`).toISOString()
        : undefined

      const data: CreateTaskData = {
        title,
        ...(description && { description }),
        priority,
        ...(category && { category }),
        labels,
        ...(goalId && { goalId: parseInt(goalId) }),
        ...(dateTime && { dueDate: dateTime }),
      }
      const result = await tasksApi.create(data)
      onCreated(result.task)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания задачи')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl p-6 z-10 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Новая задача</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm text-red-400"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Название */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Название *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              style={inputStyle} placeholder="Что нужно сделать?" required />
          </div>

          {/* Описание */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              style={{ ...inputStyle, minHeight: '70px' }} placeholder="Детали..." />
          </div>

          {/* Приоритет */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Приоритет</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setPriority(key)}
                  className="py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: priority === key ? cfg.bg : '#0f172a',
                    border: `1px solid ${priority === key ? cfg.color : '#334155'}`,
                    color: priority === key ? cfg.color : '#94a3b8',
                  }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Категория */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Категория</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES_TASK.map(cat => (
                <button key={cat.value} type="button"
                  onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                  className="flex flex-col items-center p-2 rounded-lg text-xs transition-all"
                  style={{
                    backgroundColor: category === cat.value ? 'rgba(99,102,241,0.2)' : '#0f172a',
                    border: `1px solid ${category === cat.value ? '#6366f1' : '#334155'}`,
                    color: category === cat.value ? '#a5b4fc' : '#94a3b8',
                  }}>
                  <span className="text-base">{cat.emoji}</span>
                  <span className="mt-0.5 truncate w-full text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Цель */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Привязать к цели</label>
            <select value={goalId} onChange={e => setGoalId(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              style={inputStyle}>
              <option value="">Без цели</option>
              {goals.filter(g => g.status === 'active').map(goal => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
          </div>

          {/* Дата и время — ОДНА строка */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Срок выполнения</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                style={{ ...inputStyle, color: '#fff' }} />
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                style={{ ...inputStyle, color: dueTime ? '#fff' : '#64748b' }}
                placeholder="Время (необязательно)" />
            </div>
          </div>

          {/* Метки */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Метки</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                className="flex-1 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                style={inputStyle} placeholder="Добавить метку и нажать Enter..." />
              <button type="button" onClick={addLabel}
                className="px-3 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: '#334155' }}>+</button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {labels.map(label => (
                  <span key={label} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                    style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                    #{label}
                    <button type="button"
                      onClick={() => setLabels(p => p.filter(l => l !== label))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-lg text-slate-400 font-medium"
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
      </div>
    </div>
  )
}

// ============ МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ЗАДАЧИ ============
interface TaskDetailModalProps {
  task: Task
  goals: Goal[]
  onClose: () => void
  onUpdate: (id: number, data: any) => Promise<void>
  onDelete: (id: number) => void
}

function TaskDetailModal({ task, goals, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const navigate = useNavigate()
  const [newSubtask, setNewSubtask] = useState('')
  const [newDueDate, setNewDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '')
  const [newDueTime, setNewDueTime] = useState(() => {
    if (!task.dueDate) return ''
    const d = new Date(task.dueDate)
    if (d.getHours() === 23 && d.getMinutes() === 59) return ''
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  })
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)

  const priority = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

  const addSubtask = async () => {
    if (!newSubtask.trim()) return
    setIsAddingSubtask(true)
    try {
      await tasksApi.create({ title: newSubtask.trim(), priority: 'medium', parentId: task.id } as any)
      setNewSubtask('')
      await onUpdate(task.id, {})
    } finally {
      setIsAddingSubtask(false)
    }
  }

  const handleDateChange = async () => {
    if (!newDueDate) {
      await onUpdate(task.id, { dueDate: null })
      return
    }
    const dateTime = newDueTime
      ? new Date(`${newDueDate}T${newDueTime}:00`).toISOString()
      : new Date(`${newDueDate}T23:59:00`).toISOString()
    await onUpdate(task.id, { dueDate: dateTime })
  }

  const startPomodoro = () => {
    navigate('/pomodoro', { state: { taskId: task.id, taskTitle: task.title, goalId: task.goalId } })
    onClose()
  }

  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl p-6 z-10 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>

        {/* Заголовок */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold text-lg leading-snug">{task.title}</h2>
            {task.goal && <p className="text-slate-400 text-sm mt-1">🎯 {task.goal.title}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onUpdate(task.id, { isPinned: !task.isPinned })}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: task.isPinned ? '#f59e0b' : '#475569', backgroundColor: task.isPinned ? 'rgba(245,158,11,0.1)' : 'transparent' }}
              title="Закрепить">
              <Pin size={16} />
            </button>
            <button onClick={() => onUpdate(task.id, { isFocusToday: !task.isFocusToday })}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: task.isFocusToday ? '#eab308' : '#475569', backgroundColor: task.isFocusToday ? 'rgba(234,179,8,0.1)' : 'transparent' }}
              title="Фокус-задача дня">
              <Star size={16} />
            </button>
            <button onClick={() => { onDelete(task.id); onClose() }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white ml-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Статусы и метаданные */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
            style={{ backgroundColor: priority.bg, color: priority.color }}>
            <Flag size={10} /> {priority.label}
          </span>
          {task.category && (
            <span className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
              {CATEGORIES_TASK.find(c => c.value === task.category)?.emoji} {task.category}
            </span>
          )}
          {isOverdue && (
            <span className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              ⚠️ Просрочена
            </span>
          )}
          {task.totalPomodoroMin > 0 && (
            <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <Clock size={10} /> {task.totalPomodoroMin} мин в таймере
            </span>
          )}
        </div>

        {/* Описание */}
        {task.description && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <p className="text-slate-300 text-sm leading-relaxed">{task.description}</p>
          </div>
        )}

        {/* Метки */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.labels.map(label => (
              <span key={label} className="text-xs px-2 py-0.5 rounded-md"
                style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                #{label}
              </span>
            ))}
          </div>
        )}

        {/* Дата и время */}
        <div className="mb-4">
          <label className="text-slate-400 text-sm mb-1.5 block flex items-center gap-1">
            <Calendar size={14} /> Срок выполнения
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              onBlur={handleDateChange}
              className="rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              style={{ ...inputStyle, color: newDueDate ? '#fff' : '#64748b' }} />
            <input type="time" value={newDueTime}
              onChange={e => setNewDueTime(e.target.value)}
              onBlur={handleDateChange}
              className="rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              style={{ ...inputStyle, color: newDueTime ? '#fff' : '#64748b' }} />
          </div>
        </div>

        {/* Статус */}
        <div className="mb-4">
          <label className="text-slate-400 text-sm mb-1.5 block">Статус</label>
          <div className="grid grid-cols-3 gap-2">
            {COLUMNS.map(col => (
              <button key={col.id} onClick={() => onUpdate(task.id, { status: col.id })}
                className="py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: task.status === col.id ? '#4f46e5' : '#0f172a',
                  color: task.status === col.id ? '#fff' : '#64748b',
                  border: `1px solid ${task.status === col.id ? '#4f46e5' : '#334155'}`,
                }}>
                {col.label}
              </button>
            ))}
          </div>
        </div>

        {/* Подзадачи */}
        <div className="mb-4">
          <label className="text-slate-400 text-sm mb-2 block flex items-center gap-1">
            <CheckSquare size={14} /> Подзадачи
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="text-slate-600 ml-1">
                ({task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length})
              </span>
            )}
          </label>

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {task.subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: '#0f172a' }}>
                  <div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: sub.status === 'done' ? '#22c55e' : '#475569',
                      backgroundColor: sub.status === 'done' ? '#22c55e' : 'transparent',
                    }}>
                    {sub.status === 'done' && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-sm flex-1" style={{
                    color: sub.status === 'done' ? '#64748b' : '#f1f5f9',
                    textDecoration: sub.status === 'done' ? 'line-through' : 'none',
                  }}>
                    {sub.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
              className="flex-1 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              style={inputStyle} placeholder="Добавить подзадачу..." />
            <button onClick={addSubtask} disabled={isAddingSubtask}
              className="px-3 py-2 rounded-lg text-white text-sm"
              style={{ backgroundColor: '#334155' }}>+</button>
          </div>
        </div>

        {/* Кнопка помодоро */}
        <button onClick={startPomodoro}
          className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#4f46e5' }}>
          <Play size={16} /> Запустить Pomodoro
        </button>
      </div>
    </div>
  )
}

// ============ КАРТОЧКА ЗАДАЧИ ============
interface TaskCardProps {
  task: Task
  onClick: () => void
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority]
  const now = new Date()
  const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'

  return (
    <div className="p-3 rounded-xl mb-2 cursor-pointer transition-all hover:translate-y-[-1px]"
      onClick={onClick}
      style={{
        backgroundColor: '#0f172a',
        border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.5)' : task.isFocusToday ? 'rgba(99,102,241,0.4)' : '#1e293b'}`,
        opacity: task.status === 'done' ? 0.6 : 1,
        boxShadow: task.isFocusToday ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
      }}>

      {/* Индикатор просрочки */}
      {isOverdue && (
        <div className="text-xs text-red-400 mb-1.5 flex items-center gap-1">
          ⚠️ Просрочена
        </div>
      )}

      {/* Заголовок */}
      <div className="flex items-start gap-1.5 mb-2">
        {task.isPinned && <Pin size={11} className="text-orange-400 mt-0.5 shrink-0" />}
        {task.isFocusToday && <Star size={11} className="text-yellow-400 mt-0.5 shrink-0" />}
        <span className="text-sm font-medium leading-snug flex-1"
          style={{
            color: task.status === 'done' ? '#64748b' : '#f1f5f9',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
          }}>
          {task.title}
        </span>
      </div>

      {/* Описание (краткое) */}
      {task.description && (
        <p className="text-xs text-slate-500 mb-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Метки — ЗДЕСЬ они отображаются */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map(label => (
            <span key={label} className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
              #{label}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-xs text-slate-500">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Метаданные */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs px-1.5 py-0.5 rounded"
          style={{ backgroundColor: priority.bg, color: priority.color }}>
          {priority.label}
        </span>
        {task.dueDate && (
          <span className="text-xs flex items-center gap-0.5"
            style={{ color: isOverdue ? '#ef4444' : '#64748b' }}>
            <Clock size={10} />
            {formatDateTime(task.dueDate)}
          </span>
        )}
        {task.totalPomodoroMin > 0 && (
          <span className="text-xs text-orange-400">⏱{task.totalPomodoroMin}м</span>
        )}
        {task.goal && (
          <span className="text-xs text-slate-600 truncate max-w-[70px]" title={task.goal.title}>
            🎯{task.goal.title}
          </span>
        )}
      </div>

      {/* Прогресс подзадач */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(task.subtasks.filter(s => s.status === 'done').length / task.subtasks.length) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGoal, setFilterGoal] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority')

  useEffect(() => {
    Promise.all([loadTasks(), loadGoals()])
  }, [])

  const loadTasks = async () => {
    try {
      const data = await tasksApi.getAll()
      setTasks(data.tasks)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadGoals = async () => {
    try {
      const data = await goalsApi.getAll()
      setGoals(data.goals)
    } catch (error) {
      console.error('Failed to load goals:', error)
    }
  }

  const handleUpdate = useCallback(async (id: number, data: any) => {
    try {
      const result = await tasksApi.update(id, data)
      setTasks(prev => prev.map(t => t.id === id ? result.task : t))
      setSelectedTask(prev => prev?.id === id ? result.task : prev)
    } catch (error) {
      console.error('Update error:', error)
    }
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Удалить задачу?')) return
    try {
      await tasksApi.delete(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
    }
  }, [])

  const navigateDate = (direction: 'prev' | 'next') => {
    const base = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date()
    base.setDate(base.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(toDateInputValue(base))
  }

  // Фильтрация
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.parentId) return false // скрываем подзадачи из основного списка
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterPriority && task.priority !== filterPriority) return false
      if (filterCategory && task.category !== filterCategory) return false
      if (filterStatus && task.status !== filterStatus) return false
      if (filterGoal && task.goalId !== parseInt(filterGoal)) return false
      if (selectedDate) {
        if (!task.dueDate) return false
        if (task.dueDate.split('T')[0] !== selectedDate) return false
      }
      return true
    })
  }, [tasks, search, filterPriority, filterCategory, filterStatus, filterGoal, selectedDate])

  function sortTasks(tasks: Task[], sortBy: 'priority' | 'date'): Task[] {
    return [...tasks].sort((a, b) => {
      // Закреплённые всегда сверху
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      // Фокус-задача всегда вторая
      if (a.isFocusToday !== b.isFocusToday) return a.isFocusToday ? -1 : 1

      if (sortBy === 'priority') {
        const pa = PRIORITY_CONFIG[a.priority]?.order ?? 0
        const pb = PRIORITY_CONFIG[b.priority]?.order ?? 0
        if (pa !== pb) return pb - pa
        // Внутри одного приоритета — по дате
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        if (a.dueDate) return -1
        if (b.dueDate) return 1
      } else {
        // Сортировка по дате: задачи с датой сначала, ближайшие выше
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        // Без даты — по приоритету
        const pa = PRIORITY_CONFIG[a.priority]?.order ?? 0
        const pb = PRIORITY_CONFIG[b.priority]?.order ?? 0
        if (pa !== pb) return pb - pa
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }

  // Сортированные задачи
  const sortedTasks = useMemo(() => sortTasks(filteredTasks, sortBy), [filteredTasks, sortBy])

  // Закреплённые задачи отдельно
  const pinnedTasks = useMemo(() => sortedTasks.filter(t => t.isPinned), [sortedTasks])

  // Задачи по колонкам (без закреплённых в отдельном блоке)
  const getColumnTasks = (status: string) =>
    sortedTasks.filter(t => t.status === status)

  const todayStr = toDateInputValue(new Date())
  const hasActiveFilters = !!(filterPriority || filterCategory || filterStatus || filterGoal || selectedDate || search)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка задач...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Задачи</h1>
          <p className="text-slate-400 text-sm mt-1">{tasks.filter(t => !t.parentId).length} задач</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#4f46e5' }}>
          <Plus size={18} /> Новая задача
        </button>
      </div>

      {/* Закреплённые задачи — отдельный блок сверху */}
      {pinnedTasks.length > 0 && (
        <div className="rounded-2xl p-4"
          style={{ backgroundColor: '#1e293b', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Pin size={14} className="text-orange-400" />
            <span className="text-orange-400 text-sm font-medium">Закреплённые ({pinnedTasks.length})</span>
          </div>
          <div className="space-y-2">
            {pinnedTasks.map(task => (
              <div key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setSelectedTask(task)}
                style={{ backgroundColor: '#0f172a', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Pin size={12} className="text-orange-400 shrink-0" />
                <span className="text-white text-sm flex-1 truncate">{task.title}</span>
                {task.dueDate && (
                  <span className="text-xs text-slate-400 shrink-0">{formatDateTime(task.dueDate)}</span>
                )}
                <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: PRIORITY_CONFIG[task.priority]?.bg,
                    color: PRIORITY_CONFIG[task.priority]?.color,
                  }}>
                  {PRIORITY_CONFIG[task.priority]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Панель фильтров */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        {/* Строка 1 */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск задач..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #334155' }}>
            <button onClick={() => setView('kanban')} className="px-3 py-2 transition-colors"
              style={{ backgroundColor: view === 'kanban' ? '#4f46e5' : '#0f172a', color: view === 'kanban' ? '#fff' : '#64748b' }}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('list')} className="px-3 py-2 transition-colors"
              style={{ backgroundColor: view === 'list' ? '#4f46e5' : '#0f172a', color: view === 'list' ? '#fff' : '#64748b' }}>
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Строка 2: фильтры */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Навигация по дате */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #334155' }}>
            <button onClick={() => navigateDate('prev')}
              className="px-2 py-2 text-slate-400 hover:text-white transition-colors"
              style={{ backgroundColor: '#0f172a' }}>
              <ChevronLeft size={14} />
            </button>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="px-2 py-2 text-sm outline-none"
              style={{ backgroundColor: '#0f172a', color: selectedDate ? '#f1f5f9' : '#64748b', width: '115px' }} />
            <button onClick={() => navigateDate('next')}
              className="px-2 py-2 text-slate-400 hover:text-white transition-colors"
              style={{ backgroundColor: '#0f172a' }}>
              <ChevronRight size={14} />
            </button>
            {selectedDate && (
              <button onClick={() => setSelectedDate('')}
                className="px-2 py-2 text-slate-500 hover:text-red-400 transition-colors"
                style={{ backgroundColor: '#0f172a' }}>
                <X size={12} />
              </button>
            )}
          </div>

          <button onClick={() => setSelectedDate(selectedDate === todayStr ? '' : todayStr)}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: selectedDate === todayStr ? '#4f46e5' : '#0f172a',
              color: selectedDate === todayStr ? '#fff' : '#94a3b8',
              border: `1px solid ${selectedDate === todayStr ? '#4f46e5' : '#334155'}`,
            }}>
            Сегодня
          </button>
          
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #334155' }}>
            <button onClick={() => setSortBy('priority')}
              className="px-3 py-2 text-xs transition-colors flex items-center gap-1"
              style={{
                backgroundColor: sortBy === 'priority' ? '#4f46e5' : '#0f172a',
                color: sortBy === 'priority' ? '#fff' : '#64748b'
              }}>
              <Flag size={12} /> Приоритет
            </button>
            <button onClick={() => setSortBy('date')}
              className="px-3 py-2 text-xs transition-colors flex items-center gap-1"
              style={{
                backgroundColor: sortBy === 'date' ? '#4f46e5' : '#0f172a',
                color: sortBy === 'date' ? '#fff' : '#64748b'
              }}>
              <Calendar size={12} /> Дата
            </button>
          </div>

          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}>
            <option value="">Приоритет</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}>
            <option value="">Категория</option>
            {CATEGORIES_TASK.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}>
            <option value="">Статус</option>
            {COLUMNS.map(col => (
              <option key={col.id} value={col.id}>{col.label}</option>
            ))}
          </select>

          <select value={filterGoal} onChange={e => setFilterGoal(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}>
            <option value="">Все цели</option>
            {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>

          {hasActiveFilters && (
            <button onClick={() => {
              setFilterPriority(''); setFilterCategory(''); setFilterStatus('')
              setFilterGoal(''); setSelectedDate(''); setSearch('')
            }} className="px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 transition-colors"
              style={{ backgroundColor: '#0f172a', border: '1px solid rgba(239,68,68,0.3)' }}>
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Канбан */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(column => {
            const columnTasks = getColumnTasks(column.id)
            return (
              <div key={column.id} className="rounded-2xl p-4"
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', minHeight: '300px' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium text-sm">{column.label}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#334155', color: '#94a3b8' }}>
                    {columnTasks.length}
                  </span>
                </div>

                {columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <p className="text-slate-600 text-sm">Нет задач</p>
                    {column.id === 'todo' && (
                      <button onClick={() => setShowCreateModal(true)}
                        className="mt-2 text-indigo-400 text-xs hover:text-indigo-300">
                        + Добавить
                      </button>
                    )}
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Список */}
      {view === 'list' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #334155' }}>
          {sortedTasks.length === 0 ? (
            <div className="p-12 text-center" style={{ backgroundColor: '#1e293b' }}>
              <p className="text-slate-400">Нет задач</p>
            </div>
          ) : (
            sortedTasks.map((task, i) => {
              const priority = PRIORITY_CONFIG[task.priority]
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
              return (
                <div key={task.id}
                  className="cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => setSelectedTask(task)}
                  style={{
                    backgroundColor: i % 2 === 0 ? '#1e293b' : '#172033',
                    borderBottom: '1px solid #334155',
                  }}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button onClick={e => {
                      e.stopPropagation()
                      handleUpdate(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
                    }}
                      className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{
                        borderColor: task.status === 'done' ? '#22c55e' : '#475569',
                        backgroundColor: task.status === 'done' ? '#22c55e' : 'transparent',
                      }}>
                      {task.status === 'done' && <span className="text-white text-xs">✓</span>}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {task.isPinned && <Pin size={11} className="text-orange-400 shrink-0" />}
                        {task.isFocusToday && <Star size={11} className="text-yellow-400 shrink-0" />}
                        <span className="text-sm" style={{
                          color: task.status === 'done' ? '#64748b' : '#f1f5f9',
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}>
                          {task.title}
                        </span>
                      </div>
                      {/* Метки в списке */}
                      {task.labels && task.labels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {task.labels.slice(0, 3).map(label => (
                            <span key={label} className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                              #{label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: priority.bg, color: priority.color }}>
                        {priority.label}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs" style={{ color: isOverdue ? '#ef4444' : '#64748b' }}>
                          {formatDateTime(task.dueDate)}
                        </span>
                      )}
                      {task.goal && (
                        <span className="text-xs text-slate-500 hidden sm:block">🎯 {task.goal.title}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Модалки */}
      {showCreateModal && (
        <CreateTaskModal
          goals={goals}
          defaultDueDate={selectedDate || undefined}
          onClose={() => setShowCreateModal(false)}
          onCreated={task => setTasks(prev => [task, ...prev])}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          goals={goals}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

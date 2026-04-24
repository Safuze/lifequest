import { useState, useEffect } from 'react'
import { tasksApi } from '../api/tasks'
import type { Task, CreateTaskData } from '../api/tasks'

import { goalsApi } from '../api/goals'
import type { Goal } from '../api/goals'

import {
  Plus, List, LayoutGrid, Search, Pin, Star,
  Trash2, X, Clock, Flag
} from 'lucide-react'

const PRIORITY_CONFIG = {
  low:      { label: 'Низкий',    color: '#22c55e', bg: 'rgba(34,197,94,0.15)'    },
  medium:   { label: 'Средний',   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'   },
  high:     { label: 'Высокий',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)'    },
  critical: { label: 'Критический',color: '#a855f7',bg: 'rgba(168,85,247,0.15)'   },
}

const COLUMNS = [
  { id: 'todo',       label: 'К выполнению' },
  { id: 'inProgress', label: 'В процессе'   },
  { id: 'done',       label: 'Готово'        },
]

// Модальное окно создания задачи
interface CreateTaskModalProps {
  goals: Goal[]
  onClose: () => void
  onCreated: (task: Task) => void
}

function CreateTaskModal({ goals, onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<string>('medium')
  const [goalId, setGoalId] = useState<string>('')
  const [dueDate, setDueDate] = useState('')
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
      const data: CreateTaskData = {
        title,
        ...(description && { description }),
        priority,
        labels,
        ...(goalId && { goalId: parseInt(goalId) }),
        ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
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

  const inputStyle = {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    color: '#fff',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl p-6 z-10 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Новая задача</h2>
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
          {/* Название */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Название *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              style={inputStyle}
              placeholder="Что нужно сделать?"
              required
            />
          </div>

          {/* Описание */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Описание</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              style={{ ...inputStyle, minHeight: '80px' }}
              placeholder="Детали задачи..."
            />
          </div>

          {/* Приоритет */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Приоритет</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPriority(key)}
                  className="py-2 px-3 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: priority === key ? cfg.bg : '#0f172a',
                    border: `1px solid ${priority === key ? cfg.color : '#334155'}`,
                    color: priority === key ? cfg.color : '#94a3b8',
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Привязка к цели */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">
              Привязать к цели
              <span className="text-slate-500 ml-1">(необязательно)</span>
            </label>
            <select
              value={goalId}
              onChange={e => setGoalId(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              style={inputStyle}
            >
              <option value="">Без цели</option>
              {goals.filter(g => g.status === 'active').map(goal => (
                <option key={goal.id} value={goal.id}>{goal.title}</option>
              ))}
            </select>
          </div>

          {/* Срок выполнения */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Срок выполнения</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ ...inputStyle, color: dueDate ? '#fff' : '#64748b' }}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Метки */}
          <div>
            <label className="text-slate-400 text-sm mb-1.5 block">Метки</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())}
                className="flex-1 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                style={inputStyle}
                placeholder="Добавить метку..."
              />
              <button
                type="button"
                onClick={addLabel}
                className="px-3 py-2 rounded-lg text-white text-sm"
                style={{ backgroundColor: '#334155' }}
              >
                +
              </button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {labels.map(label => (
                  <span
                    key={label}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs"
                    style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
                  >
                    {label}
                    <button
                      type="button"
                      onClick={() => setLabels(prev => prev.filter(l => l !== label))}
                      className="hover:text-white"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-slate-400 font-medium"
              style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 rounded-lg text-white font-medium"
              style={{ backgroundColor: '#4f46e5', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Карточка задачи
interface TaskCardProps {
  task: Task
  onUpdate: (id: number, data: Partial<Task>) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: string) => void
}

function TaskCard({ task, onUpdate, onDelete, onStatusChange }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority]
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

  return (
    <div
      className="p-3 rounded-xl mb-2 group"
      style={{
        backgroundColor: '#0f172a',
        border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.4)' : '#1e293b'}`,
        opacity: task.status === 'done' ? 0.7 : 1,
      }}
    >
      {/* Заголовок */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-sm font-medium leading-snug"
          style={{
            color: task.status === 'done' ? '#64748b' : '#f1f5f9',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {task.isFocusToday && <span className="text-yellow-400 mr-1">⭐</span>}
          {task.isPinned && <span className="mr-1">📌</span>}
          {task.title}
        </span>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Метаданные */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Приоритет */}
          <span
            className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
            style={{ backgroundColor: priority.bg, color: priority.color }}
          >
            <Flag size={10} />
            {priority.label}
          </span>

          {/* Срок */}
          {task.dueDate && (
            <span
              className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{
                backgroundColor: isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.2)',
                color: isOverdue ? '#ef4444' : '#94a3b8',
              }}
            >
              <Clock size={10} />
              {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </span>
          )}

          {/* Метки */}
          {task.labels.slice(0, 2).map(label => (
            <span
              key={label}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Привязка к цели */}
        {task.goal && (
          <span className="text-xs text-slate-500 truncate max-w-[80px]" title={task.goal.title}>
            🎯 {task.goal.title}
          </span>
        )}
      </div>

      {/* Подзадачи */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid #1e293b' }}>
          <span className="text-xs text-slate-500">
            {task.subtasks.filter(s => s.status === 'done').length}/{task.subtasks.length} подзадач
          </span>
        </div>
      )}

      {/* Статус кнопки */}
      <div className="flex gap-1 mt-2">
        {COLUMNS.map(col => (
          <button
            key={col.id}
            onClick={() => onStatusChange(task.id, col.id)}
            className="flex-1 py-1 rounded text-xs transition-all"
            style={{
              backgroundColor: task.status === col.id ? '#4f46e5' : '#1e293b',
              color: task.status === col.id ? '#fff' : '#64748b',
            }}
          >
            {col.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterGoal, setFilterGoal] = useState('')


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

    useEffect(() => {
    const init = async () => {
        await Promise.all([loadTasks(), loadGoals()])
    }
    init()
    }, [])

  const handleUpdate = async (id: number, data: Partial<Task>) => {
    try {
      const result = await tasksApi.update(id, data)
      setTasks(prev => prev.map(t => t.id === id ? result.task : t))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задачу?')) return
    try {
      await tasksApi.delete(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleStatusChange = async (id: number, status: string) => {
    await handleUpdate(id, { status: status as Task['status'] })
  }

  // Фильтрация
  const filteredTasks = tasks.filter(task => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPriority && task.priority !== filterPriority) return false
    if (filterGoal && task.goalId !== parseInt(filterGoal)) return false
    return true
  })

  const getColumnTasks = (status: string) =>
    filteredTasks.filter(t => t.status === status)

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
          <p className="text-slate-400 text-sm mt-1">{tasks.length} задач всего</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#4f46e5' }}
        >
          <Plus size={18} />
          Новая задача
        </button>
      </div>

      {/* Панель фильтров */}
      <div
        className="flex flex-wrap gap-3 p-4 rounded-xl"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
      >
        {/* Поиск */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск задач..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
          />
        </div>

        {/* Фильтр по приоритету */}
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}
        >
          <option value="">Все приоритеты</option>
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        {/* Фильтр по цели */}
        <select
          value={filterGoal}
          onChange={e => setFilterGoal(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}
        >
          <option value="">Все цели</option>
          {goals.map(g => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>

        {/* Переключатель вида */}
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: '1px solid #334155' }}
        >
          <button
            onClick={() => setView('kanban')}
            className="px-3 py-2 transition-colors"
            style={{ backgroundColor: view === 'kanban' ? '#4f46e5' : '#0f172a', color: view === 'kanban' ? '#fff' : '#64748b' }}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('list')}
            className="px-3 py-2 transition-colors"
            style={{ backgroundColor: view === 'list' ? '#4f46e5' : '#0f172a', color: view === 'list' ? '#fff' : '#64748b' }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Канбан */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(column => {
            const columnTasks = getColumnTasks(column.id)
            return (
              <div
                key={column.id}
                className="rounded-2xl p-4"
                style={{ backgroundColor: '#1e293b', border: '1px solid #334155', minHeight: '400px' }}
              >
                {/* Заголовок колонки */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium text-sm">{column.label}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#334155', color: '#94a3b8' }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Задачи */}
                {columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-slate-600 text-sm">Нет задач</p>
                    {column.id === 'todo' && (
                      <button
                        onClick={() => setShowModal(true)}
                        className="mt-2 text-indigo-400 text-xs hover:text-indigo-300"
                      >
                        + Добавить задачу
                      </button>
                    )}
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Список */}
      {view === 'list' && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid #334155' }}
        >
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center" style={{ backgroundColor: '#1e293b' }}>
              <p className="text-slate-400">Нет задач. Создайте первую!</p>
            </div>
          ) : (
            filteredTasks.map((task, i) => {
              const priority = PRIORITY_CONFIG[task.priority]
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                  style={{
                    backgroundColor: i % 2 === 0 ? '#1e293b' : '#172033',
                    borderBottom: '1px solid #334155',
                  }}
                >
                  {/* Чекбокс */}
                  <button
                    onClick={() => handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{
                      borderColor: task.status === 'done' ? '#22c55e' : '#475569',
                      backgroundColor: task.status === 'done' ? '#22c55e' : 'transparent',
                    }}
                  >
                    {task.status === 'done' && <span className="text-white text-xs">✓</span>}
                  </button>

                  {/* Название */}
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: task.status === 'done' ? '#64748b' : '#f1f5f9',
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </span>

                  {/* Метаданные */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: priority.bg, color: priority.color }}
                    >
                      {priority.label}
                    </span>
                    {task.dueDate && (
                      <span
                        className="text-xs"
                        style={{ color: isOverdue ? '#ef4444' : '#64748b' }}
                      >
                        {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                    {task.goal && (
                      <span className="text-xs text-slate-500">🎯 {task.goal.title}</span>
                    )}
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {showModal && (
        <CreateTaskModal
          goals={goals}
          onClose={() => setShowModal(false)}
          onCreated={task => setTasks(prev => [task, ...prev])}
        />
      )}
    </div>
  )
}
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Timer, CheckSquare, Repeat, Target, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const focusTasks = [
  { id: 1, title: 'Написать раздел 3.1 диплома', goal: 'Диплом', priority: 'high' },
  { id: 2, title: 'Подготовить презентацию', goal: 'Работа', priority: 'medium' },
  { id: 3, title: 'Изучить React Query', goal: 'Учёба', priority: 'medium' },
]

const otherTasks = [
  { id: 4, title: 'Ответить на письма', done: false, priority: 'low' },
  { id: 5, title: 'Прочитать 30 минут', done: true, priority: 'medium' },
  { id: 6, title: 'Сделать коммит в GitHub', done: false, priority: 'medium' },
]

const todayHabits = [
  { id: 1, title: 'Утренняя медитация', streak: 12, done: false, type: 'discrete' },
  { id: 2, title: 'Чтение книг', streak: 5, done: true, type: 'discrete' },
  { id: 3, title: 'Не курить', streak: 30, done: false, type: 'anti' },
]

const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 10000, 15000]
const LEVEL_NAMES = ['', 'Новичок', 'Ученик', 'Практик', 'Эксперт', 'Мастер', 'Легенда']

function getXpProgress(xp: number, level: number) {
  const current = LEVEL_THRESHOLDS[level - 1] || 0
  const next = LEVEL_THRESHOLDS[level] || 15000
  return Math.min(Math.max(((xp - current) / (next - current)) * 100, 0), 100)
}

// Компонент пустого состояния
function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <span className="text-3xl mb-2">{icon}</span>
      <p className="text-slate-500 text-sm">{text}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState(otherTasks)
  const [habits, setHabits] = useState(todayHabits)

  const xpProgress = getXpProgress(user?.xp || 0, user?.level || 1)
  const completedTasks = tasks.filter(t => t.done).length
  const completedHabits = habits.filter(h => h.done).length

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const toggleHabit = (id: number) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, done: !h.done } : h))
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Приветствие */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Привет, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {LEVEL_NAMES[user?.level || 1]} · {user?.xp} XP · 🪙 {user?.gold} золота
            </p>
          </div>
          <div className="sm:w-64">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Уровень {user?.level}</span>
              <span>Уровень {(user?.level || 1) + 1}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%`, backgroundColor: '#4f46e5' }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1 text-center">
              {Math.round(xpProgress)}% до следующего уровня
            </p>
          </div>
        </div>
      </div>

      {/* Быстрая статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Задачи',
            value: `${completedTasks}/${tasks.length}`,
            sub: 'выполнено сегодня',
            icon: CheckSquare,
            color: '#4f46e5'
          },
          {
            label: 'Привычки',
            value: `${completedHabits}/${habits.length}`,
            sub: 'выполнено сегодня',
            icon: Repeat,
            color: '#22c55e'
          },
          {
            label: 'Фокус',
            value: '0 мин',
            sub: 'сегодня',
            icon: Timer,
            color: '#f59e0b'
          },
          {
            label: 'Цели',
            value: '3',
            sub: 'активных',
            icon: Target,
            color: '#ef4444'
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-4"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg mt-0.5"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <div className="text-white font-bold text-lg leading-none">{value}</div>
                <div className="text-slate-400 text-xs mt-0.5">{label}</div>
                <div className="text-slate-600 text-xs">{sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Основной контент */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Фокус сегодня */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">🎯 Фокус сегодня</h2>
            <span className="text-slate-400 text-xs">Приоритетные задачи</span>
          </div>

          {focusTasks.length === 0 ? (
            <EmptyState icon="🎯" text="Нет приоритетных задач. Добавьте задачу и назначьте её фокусом дня!" />
          ) : (
            <div className="space-y-2 mb-4">
              {focusTasks.map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: '#4f46e5' }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{task.title}</p>
                    <p className="text-slate-500 text-xs">{task.goal}</p>
                  </div>
                  <button
                    onClick={() => navigate('/pomodoro')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80 shrink-0"
                    style={{ backgroundColor: '#4f46e5' }}
                  >
                    <Play size={12} />
                    Старт
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/pomodoro')}
            className="w-full py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#4f46e5' }}
          >
            <Timer size={16} className="inline mr-2" />
            Открыть Pomodoro
          </button>
        </div>

        {/* Привычки сегодня */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">🔥 Привычки сегодня</h2>
            <button
              onClick={() => navigate('/habits')}
              className="text-indigo-400 text-xs hover:text-indigo-300"
            >
              Все →
            </button>
          </div>

          {habits.length === 0 ? (
            <EmptyState icon="🌱" text="Нет привычек. Создайте первую привычку!" />
          ) : (
            <div className="space-y-3">
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm truncate flex-1">{habit.title}</span>
                    <span className="text-orange-400 text-xs ml-2 shrink-0">
                      🔥 {habit.streak}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className="w-full py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: habit.done ? 'rgba(34,197,94,0.1)' : '#4f46e5',
                      color: habit.done ? '#22c55e' : '#fff',
                      border: habit.done ? '1px solid rgba(34,197,94,0.3)' : 'none',
                    }}
                  >
                    {habit.done ? '✓ Выполнено' : 'Отметить'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Остальные задачи на сегодня */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">📋 Задачи на сегодня</h2>
          <button
            onClick={() => navigate('/tasks')}
            className="text-indigo-400 text-xs hover:text-indigo-300"
          >
            Все задачи →
          </button>
        </div>

        {tasks.length === 0 ? (
          <EmptyState icon="✅" text="Все задачи выполнены! Отличная работа!" />
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer"
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                onClick={() => toggleTask(task.id)}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all"
                  style={{
                    borderColor: task.done ? '#22c55e' : '#475569',
                    backgroundColor: task.done ? '#22c55e' : 'transparent',
                  }}
                >
                  {task.done && <span className="text-white text-xs">✓</span>}
                </div>
                <span
                  className="flex-1 text-sm"
                  style={{
                    color: task.done ? '#64748b' : '#f1f5f9',
                    textDecoration: task.done ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      task.priority === 'high' ? 'rgba(239,68,68,0.15)' :
                      task.priority === 'medium' ? 'rgba(245,158,11,0.15)' :
                      'rgba(34,197,94,0.15)',
                    color:
                      task.priority === 'high' ? '#ef4444' :
                      task.priority === 'medium' ? '#f59e0b' : '#22c55e',
                  }}
                >
                  {task.priority === 'high' ? 'Высокий' :
                   task.priority === 'medium' ? 'Средний' : 'Низкий'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
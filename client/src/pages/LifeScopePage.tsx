import { useState, useEffect } from 'react'
import apiClient from '../api/client'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, CheckSquare, Flame, Lightbulb } from 'lucide-react'

interface WeekReport {
  weekStart: string
  weekEnd: string
  weekLabel: string
  totalPomodoroMin: number
  pomodoroByCategory: Record<string, number>
  tasksCompleted: number
  tasks: any[]
  habitStats: { id: number; title: string; currentStreak: number; completionRate: number }[]
  avgHabitCompletion: number
  weekXp: number
  weekGold: number
  prevXp: number
  prevGold: number
  xpDelta: number
  goldDelta: number
  recommendations: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  'учёба':    '#4f46e5',
  'работа':   '#f59e0b',
  'здоровье': '#22c55e',
  'хобби':    '#ec4899',
  'личное':   '#64748b',
  'другое':   '#475569',
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'учёба': '📚', 'работа': '💼', 'здоровье': '💪',
  'хобби': '🎨', 'личное': '👤', 'другое': '📌'
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} мин`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-slate-400 text-xs">= без изм.</span>
  const isPos = delta > 0
  return (
    <span className="flex items-center gap-0.5 text-xs"
      style={{ color: isPos ? '#22c55e' : '#ef4444' }}>
      {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isPos ? '+' : ''}{delta}
    </span>
  )
}

function PomodoroChart({ byCategory, totalMin }: {
  byCategory: Record<string, number>; totalMin: number
}) {
  if (totalMin === 0) return (
    <p className="text-slate-500 text-sm text-center py-4">Нет данных за эту неделю</p>
  )

  const entries = Object.entries(byCategory).sort(([, a], [, b]) => b - a)
  return (
    <div className="space-y-2">
      {entries.map(([cat, min]) => {
        const pct = Math.round((min / totalMin) * 100)
        const color = CATEGORY_COLORS[cat] || '#475569'
        return (
          <div key={cat}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">
                {CATEGORY_EMOJIS[cat] || '📌'} {cat}
              </span>
              <span className="text-slate-400">{formatMinutes(min)} · {pct}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function LifeScopePage() {
  const [currentReport, setCurrentReport] = useState<WeekReport | null>(null)
  const [archive, setArchive] = useState<WeekReport[]>([])
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current')
  const [archiveIndex, setArchiveIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [currentRes, archiveRes] = await Promise.all([
          apiClient.get('/lifescope/current'),
          apiClient.get('/lifescope/archive?weeks=8'),
        ])
        setCurrentReport(currentRes.data.report)
        setArchive(archiveRes.data.reports)
      } catch (error) {
        console.error('LifeScope load error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Формирование отчёта...</div>
      </div>
    )
  }

  const displayReport = activeTab === 'current' ? currentReport : archive[archiveIndex]

  const renderReport = (report: WeekReport) => (
    <div className="space-y-5">

      {/* Период */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">{report.weekLabel}</h2>
          {activeTab === 'current' && (
            <p className="text-slate-400 text-sm mt-0.5">Текущая неделя</p>
          )}
        </div>
      </div>

      {/* Топ-метрики */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: <Clock size={18} />,
            label: 'Минут в фокусе',
            value: formatMinutes(report.totalPomodoroMin),
            color: '#4f46e5', bg: 'rgba(79,70,229,0.15)'
          },
          {
            icon: <CheckSquare size={18} />,
            label: 'Задач завершено',
            value: report.tasksCompleted,
            color: '#22c55e', bg: 'rgba(34,197,94,0.15)'
          },
          {
            icon: <Flame size={18} />,
            label: 'Привычки',
            value: `${report.avgHabitCompletion}%`,
            color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'
          },
          {
            icon: <TrendingUp size={18} />,
            label: 'XP заработано',
            value: report.weekXp,
            color: '#ec4899', bg: 'rgba(236,72,153,0.15)'
          },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="p-4 rounded-2xl"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <div className="p-1.5 rounded-lg w-fit mb-2" style={{ backgroundColor: bg, color }}>
              {icon}
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Сравнение с прошлой неделей */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-white font-medium mb-3">📊 vs прошлая неделя</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-xs mb-1">XP</p>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{report.weekXp}</span>
              <DeltaBadge delta={report.xpDelta} />
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Золото 🪙</p>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{report.weekGold}</span>
              <DeltaBadge delta={report.goldDelta} />
            </div>
          </div>
        </div>
      </div>

      {/* Помодоро по категориям */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-white font-medium mb-3">⏱ Фокус по категориям</h3>
        <PomodoroChart byCategory={report.pomodoroByCategory} totalMin={report.totalPomodoroMin} />
      </div>

      {/* Привычки */}
      {report.habitStats.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <h3 className="text-white font-medium mb-3">
            🔥 Привычки
            <span className="text-slate-400 text-sm font-normal ml-2">
              ср. {report.avgHabitCompletion}%
            </span>
          </h3>
          <div className="space-y-2.5">
            {report.habitStats.map(habit => (
              <div key={habit.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 text-sm truncate">{habit.title}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                      {habit.completionRate}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${habit.completionRate}%`,
                        backgroundColor: habit.completionRate >= 80 ? '#22c55e' :
                          habit.completionRate >= 50 ? '#f59e0b' : '#ef4444'
                      }} />
                  </div>
                </div>
                <span className="text-xs text-orange-400 shrink-0 flex items-center gap-0.5">
                  <Flame size={11} />{habit.currentStreak}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Рекомендации */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(99,102,241,0.3)' }}>
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <Lightbulb size={16} className="text-yellow-400" /> Рекомендации
        </h3>
        <div className="space-y-2">
          {report.recommendations.map((rec, i) => (
            <div key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="text-indigo-400 shrink-0">→</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Завершённые задачи */}
      {report.tasks.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <h3 className="text-white font-medium mb-3">✅ Завершённые задачи</h3>
          <div className="space-y-1.5">
            {report.tasks.map((task: any) => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <span className="text-green-400 shrink-0">✓</span>
                <span className="text-slate-300 truncate">{task.title}</span>
                {task.priority === 'critical' && (
                  <span className="text-purple-400 text-xs shrink-0">критическая</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-white">LifeScope</h1>
        <p className="text-slate-400 text-sm mt-1">Еженедельный анализ прогресса</p>
      </div>

      {/* Табы */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        <button onClick={() => setActiveTab('current')}
          className="flex-1 py-2.5 text-sm font-medium transition-all"
          style={{
            backgroundColor: activeTab === 'current' ? '#4f46e5' : '#1e293b',
            color: activeTab === 'current' ? '#fff' : '#94a3b8',
          }}>
          📋 Текущая неделя
        </button>
        <button onClick={() => setActiveTab('archive')}
          className="flex-1 py-2.5 text-sm font-medium transition-all"
          style={{
            backgroundColor: activeTab === 'archive' ? '#4f46e5' : '#1e293b',
            color: activeTab === 'archive' ? '#fff' : '#94a3b8',
          }}>
          🗂 Архив
        </button>
      </div>

      {/* Навигация по архиву */}
      {activeTab === 'archive' && archive.length > 0 && (
        <div className="flex items-center justify-between rounded-xl p-3"
          style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <button onClick={() => setArchiveIndex(Math.min(archiveIndex + 1, archive.length - 1))}
            disabled={archiveIndex >= archive.length - 1}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: '#94a3b8' }}>
            <ChevronLeft size={18} />
          </button>
          <span className="text-white text-sm font-medium">
            {archive[archiveIndex]?.weekLabel || '—'}
          </span>
          <button onClick={() => setArchiveIndex(Math.max(archiveIndex - 1, 0))}
            disabled={archiveIndex <= 0}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ color: '#94a3b8' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Контент */}
      {displayReport ? renderReport(displayReport) : (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <p className="text-slate-400">
            {activeTab === 'archive'
              ? 'Нет данных в архиве. Вернитесь через неделю!'
              : 'Данных за эту неделю пока нет. Начните выполнять задачи и привычки!'}
          </p>
        </div>
      )}
    </div>
  )
}
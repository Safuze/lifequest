import { useState, useEffect } from 'react'
import apiClient from '../api/client'
import { Trophy, Clock, CheckSquare, Flame, TrendingUp, Star, Package } from 'lucide-react'
import { AchievementGrid } from '../components/AchievementGrid'
import { getAvatarBorderStyle, getAvatarBorderClass, getProfileBgStyle, getProfileBgData } from '../utils/avatar'
import { InventoryCard } from '../components/InventoryCard'
type Period = 'day' | 'week' | 'month'
import { LEVEL_NAMES, LEVEL_COLORS } from '../data/levelData'
import { PETS } from '../../../server/src/data/pets'

interface ProfileAchievement {
  id: number
  type: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  createdAt: string
}


const RARITY_COLORS: Record<string, string> = {
  common:    '#22c55e',
  rare:      '#4f46e5',
  epic:      '#a855f7',
  legendary: '#f59e0b',
}
function formatMinutes(min: number): string {
  if (min < 60) return `${min}м`
  return `${Math.floor(min / 60)}ч ${min % 60 > 0 ? `${min % 60}м` : ''}`
}

// Радарная диаграмма (SVG)
interface RadarProps {
  data: { focus: number; discipline: number; progress: number; productivity: number; gold: number }
}

function RadarChart({ data }: RadarProps) {
  const labels = [
    { key: 'focus',        label: 'Фокус',          emoji: '' },
    { key: 'discipline',   label: 'Дисциплина',     emoji: '' },
    { key: 'progress',     label: 'Прогресс',       emoji: '' },
    { key: 'productivity', label: 'Продуктивность', emoji: '' },
    { key: 'gold',         label: 'Добыча',         emoji: '  223' },
  ]

  const n = labels.length
  const cx = 100
  const cy = 100
  const r = 75

  // Вычисляем точки многоугольника
  const getPoint = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const dist = (value / 100) * r
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    }
  }

  const getLabelPoint = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const dist = r + 20
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  const dataPoints = labels.map((l, i) => getPoint(i, data[l.key as keyof typeof data]))
  const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  // Сетка (3 кольца)
  const gridLevels = [25, 50, 75, 100]

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 200 220" className="w-full max-w-xs">
        {/* Сетка */}
        {gridLevels.map(level => {
          const gridPoints = labels.map((_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')
          return (
            <polygon key={level} points={gridPoints}
              fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.7" />
          )
        })}

        {/* Оси */}
        {labels.map((_, i) => {
          const p = getPoint(i, 100)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#334155" strokeWidth="0.5" />
        })}

        {/* Данные */}
        <polygon points={polyPoints} fill="rgba(79,70,229,0.25)" stroke="#4f46e5" strokeWidth="2" />

        {/* Точки */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4f46e5" />
        ))}

        {/* Подписи */}
        {labels.map((l, i) => {
          const lp = getLabelPoint(i)
          return (
            <text key={i} x={lp.x} y={lp.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#94a3b8">
              {l.emoji} {l.label}
            </text>
          )
        })}

        {/* Значения в центре */}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="8" fill="#64748b">
          средний
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f1f5f9">
          {Math.round((data.focus + data.discipline + data.progress + data.productivity + data.gold) / 5)}%
        </text>
      </svg>
    </div>
  )
}

interface ProfileData {
  user: {
    id: number; name: string; email: string; xp: number; gold: number; avatarBorder: string; profileBg: string
    level: number; levelName: string; xpProgress: number; nextLevelXp: number; prevLevelXp: number; createdAt: string; 
    activePetId: string
  }
  stats: {
    totalPomodoroMin: number
    tasksCompleted: number
    habitsCompletion: number

    taskStreak: number
    maxHabitStreak: number
    maxBestHabitStreak: number

    earnedXp: number
    earnedGold: number
    goalsProgress: number
    
  }
  radar: { focus: number; discipline: number; progress: number; productivity: number; gold: number }
  achievements: ProfileAchievement[]
  inventory: { name: string; itemType: string; rarity: string }[]
  period: string
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [period, setPeriod] = useState<Period>('week')
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements' | 'inventory'>('stats')
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    loadProfile()
  }, [period])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.get(`/users/profile?period=${period}`)
      setData(res.data)
    } catch (error) {
      console.error('Profile load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка профиля...</div>
      </div>
    )
  }

  const { user, stats, radar, achievements, inventory } = data
  const activePet = PETS.find(p => p.id === user.activePetId)
  const levelColor = LEVEL_COLORS[user.level] || '#64748b'
  const bgData = getProfileBgData(user.profileBg)
  const profileBgStyle =
    bgData?.type !== 'video'
      ? getProfileBgStyle(user.profileBg)
      : { backgroundColor: '#0f172a' }
  const daysInApp = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000)
  const statCards = [
    { icon: <Clock size={16} />,       label: 'Время в фокусе',        value: formatMinutes(stats.totalPomodoroMin), color: '#4f46e5', bg: 'rgba(79,70,229,0.15)'  },
    { icon: <CheckSquare size={16} />, label: 'Задач выполнено',        value: stats.tasksCompleted,                 color: '#22c55e', bg: 'rgba(34,197,94,0.15)'   },
    { icon: <Flame size={16} />,       label: 'Стрик задач (дней)',     value: `${stats.taskStreak} дн.`,            color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
    { icon: <Trophy size={16} />,      label: 'Стрик привычек',         value: `${stats.maxHabitStreak} дн.`,        color: '#ec4899', bg: 'rgba(236,72,153,0.15)'  },
    { icon: <TrendingUp size={16} />,  label: 'Прогресс целей',         value: `${stats.goalsProgress}%`,           color: '#a855f7', bg: 'rgba(168,85,247,0.15)'  },
    { icon: <Star size={16} />,        label: 'Привычки выполнено',     value: `${stats.habitsCompletion}%`,         color: '#f97316', bg: 'rgba(249,115,22,0.15)'  },
    { icon: <Star size={16} />,        label: 'XP заработано',          value: `+${stats.earnedXp}`,                color: '#6366f1', bg: 'rgba(99,102,241,0.15)'  },
    { icon: <Star size={16} />,        label: 'Баллов заработано',      value: `+${stats.earnedGold}`,          color: '#eab308', bg: 'rgba(234,179,8,0.15)'   },
  ]
  

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={profileBgStyle}
    >
    {bgData?.type === 'video' && (
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={bgData.poster}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={bgData.value} type="video/mp4" />
      </video>
    )}
    <div className="relative z-10 max-w-2xl mx-auto space-y-5">

      {/* RPG-карточка профиля */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${levelColor}40`
        }}>
        {/* Фоновый градиент уровня */}
        <div className="absolute inset-0 opacity-5"
          style={{ background: `radial-gradient(circle at top right, ${levelColor}, transparent 70%)` }} />

        <div className="flex items-start gap-4 relative">
          {/* Аватар */}
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 ${getAvatarBorderClass(user.avatarBorder)}`}
            style={{
              backgroundColor: `${levelColor}20`,
              color: levelColor,
              ...getAvatarBorderStyle(user.avatarBorder, 'lg'),
            }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white font-bold text-xl">{user.name}
                {activePet && (
                  <img
                    src={activePet.image}
                    alt={activePet.name}
                    className="w-8 h-8 object-contain inline-block ml-1"
                  />
                )}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${levelColor}20`, color: levelColor }}>
                {user.levelName}
              </span>
              
            </div>
            <p className="text-slate-500 text-xs mt-0.5">ID: #{user.id} · Стаж пользования {daysInApp} дн.</p>

            {/* XP прогресс */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Ур. {user.level}</span>
                <span style={{ color: levelColor }}>{user.xp} / {user.nextLevelXp} XP</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${user.xpProgress}%`, backgroundColor: levelColor }} />
              </div>
            </div>

            {/* Ресурсы */}
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-indigo-400">{user.xp} XP</span>
              <span className="text-sm text-yellow-400">{user.gold} Баллов</span>
            </div>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        {([
          { id: 'stats',        label: '📊 Статистика' },
          { id: 'achievements', label: '🏆 Достижения' },
          { id: 'inventory',    label: '🐾 Коллекция'  },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? '#4f46e5' : 'rgba(30, 41, 59, 0.95)',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && (
        <>
          {/* Период */}
          <div className="flex rounded-xl overflow-hidden w-fit" style={{ border: '1px solid #334155' }}>
            {(['day', 'week', 'month'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: period === p ? '#4f46e5' : 'rgba(30, 41, 59, 0.95)',
                  color: period === p ? '#fff' : '#94a3b8',
                }}>
                {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
              </button>
            ))}
          </div>

          {/* Метрики */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ icon, label, value, color, bg }) => (
              <div key={label} className="p-4 rounded-2xl"
                style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155' }}>
                
                <div className="p-1.5 rounded-lg w-fit mb-2" style={{ backgroundColor: bg, color }}>
                  {icon}
                </div>

                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Радар */}
          <div className="rounded-2xl p-5" style={{backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155' }}>
            <h3 className="text-white font-medium mb-4">🕸 Радар характеристик</h3>
            <RadarChart data={radar} />
            <div className="grid grid-cols-5 gap-1 mt-3">
              {[
                { label: 'Фокус', value: radar.focus },
                { label: 'Дисципл.', value: radar.discipline },
                { label: 'Прогресс', value: radar.progress },
                { label: 'Продукт.', value: radar.productivity },
                { label: 'Добыча', value: radar.gold },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-white text-sm font-semibold">{value}</div>
                  <div className="text-slate-500 text-xs">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'achievements' && (
        <AchievementGrid earned={achievements} showLocked={true} />
      )}

      {/* Коллекции */}
      {activeTab === 'inventory' && (() => {
        const pets = inventory.filter((i: any) => i.itemType === 'pet')

        const pomodoroItems = inventory.filter((i: any) =>
          ['timer', 'background', 'sound'].includes(i.itemType)
        )

        const profileItems = inventory.filter((i: any) =>
          ['avatar_border', 'profile_bg'].includes(i.itemType)
        )

        const sections = [
          {
            key: 'profile',
            title: '👤 Оформление профиля',
            items: profileItems,
          },
          {
            key: 'pomodoro',
            title: '⏱ Оформление Pomodoro',
            items: pomodoroItems,
          },
        ].filter(section => section.items.length > 0)

        return (
          <div className="space-y-5">

            {/* Питомцы */}
            <div
              className="rounded-2xl p-4"
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
              }}
            >
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                🐾 Питомцы
                <span className="text-slate-500 text-sm font-normal">
                  ({pets.length})
                </span>
              </h3>

              {pets.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">🔒</p>
                  <p className="text-slate-400 text-sm">Нет питомцев</p>
                  <p className="text-slate-600 text-xs mt-1">
                    Купи первого в магазине
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {pets.map((item: any) => (
                    <InventoryCard key={item.name} item={item} />
                  ))}
                </div>
              )}
            </div>

            {/* Остальные коллекции */}
            {sections.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                }}
              >
                <p className="text-3xl mb-2">🎒</p>
                <p className="text-slate-400 text-sm">
                  Косметика не куплена
                </p>
              </div>
            ) : (
              sections.map(section => (
                <div
                  key={section.key}
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                  }}
                >
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    {section.title}
                    <span className="text-slate-500 text-sm font-normal">
                      ({section.items.length})
                    </span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {section.items.map((item: any) => (
                      <InventoryCard key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )
      })()}

      
    </div>
  </div>
  )
}
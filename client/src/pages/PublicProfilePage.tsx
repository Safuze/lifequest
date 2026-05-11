import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, UserPlus, Check, Clock, CheckSquare, Flame, Lock, Trophy } from 'lucide-react'
import { AchievementGrid } from '../components/AchievementGrid'
import { getAvatarBorderStyle, getAvatarBorderClass, getProfileBgStyle } from '../utils/avatar'
import { PETS_EMOJIS } from '../data/petsClient'
import { InventoryCard } from '../components/InventoryCard'
import { LEVEL_NAMES, LEVEL_COLORS, LEVEL_XP } from '../data/levelData'

// Радарная диаграмма (идентична ProfilePage)
function RadarChart({ data }: { data: { focus: number; discipline: number; progress: number; productivity: number; gold: number } }) {
  const labels = [
    { key: 'focus',        label: 'Фокус',          emoji: '' },
    { key: 'discipline',   label: 'Дисциплина',     emoji: '' },
    { key: 'progress',     label: 'Прогресс',       emoji: '' },
    { key: 'productivity', label: 'Продуктивность', emoji: '' },
    { key: 'gold',         label: 'Добыча',         emoji: '  223' },
  ]
  const n = labels.length
  const cx = 100, cy = 100, r = 75

  const getPoint = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const dist = (value / 100) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  const getLabelPoint = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return { x: cx + (r + 20) * Math.cos(angle), y: cy + (r + 20) * Math.sin(angle) }
  }

  const dataPoints = labels.map((l, i) => getPoint(i, data[l.key as keyof typeof data]))
  const polyPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ')
  const gridLevels = [25, 50, 75, 100]

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 200 220" className="w-full max-w-xs">
        {gridLevels.map(level => {
          const gp = labels.map((_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}` }).join(' ')
          return <polygon key={level} points={gp} fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.7" />
        })}
        {labels.map((_, i) => { const p = getPoint(i, 100); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#334155" strokeWidth="0.5" /> })}
        <polygon points={polyPoints} fill="rgba(79,70,229,0.25)" stroke="#4f46e5" strokeWidth="2" />
        {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#4f46e5" />)}
        {labels.map((l, i) => {
          const lp = getLabelPoint(i)
          return <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#94a3b8">{l.emoji} {l.label}</text>
        })}
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f1f5f9">
          {Math.round((data.focus + data.discipline + data.progress + data.productivity + data.gold) / 5)}%
        </text>
      </svg>
    </div>
  )
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}м`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [data, setData] = useState<any | null>(null)
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none')
  const [requestSent, setRequestSent] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    const load = async () => {
      try {
        const [profileRes, friendsRes] = await Promise.all([
          apiClient.get(`/users/${userId}/public`),
          apiClient.get('/users/friends'),
        ])
        setData(profileRes.data)

        const { friends, incoming } = friendsRes.data
        const uid = parseInt(userId)
        if (friends.some((f: any) => f.id === uid)) setFriendStatus('accepted')
        else if (incoming.some((r: any) => r.user.id === uid)) setFriendStatus('pending')
        else setFriendStatus('none')
      } catch (error) {
        console.error('Load public profile error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [userId])

  const handleAddFriend = async () => {
    if (!userId) return
    try {
      await apiClient.post('/users/friends/request', { friendId: parseInt(userId) })
      setRequestSent(true)
      setFriendStatus('pending')
    } catch (error: any) {
      console.error('Friend request error:', error.response?.data?.error)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">Загрузка...</div>
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-white mb-2">Пользователь не найден</p>
        <button onClick={() => navigate(-1)} className="text-indigo-400 text-sm">← Назад</button>
      </div>
    </div>
  )

  const { user, achievements, topHabits, totalPomodoroMin, totalSessions, tasksCompleted } = data
  const isOwnProfile = currentUser?.id === user.id
  const levelColor = LEVEL_COLORS[Math.min(user.level, LEVEL_COLORS.length - 1)]
  const levelName = LEVEL_NAMES[Math.min(user.level, LEVEL_NAMES.length - 1)]
  const profileBgStyle =
  user.profileBg && user.profileBg !== 'default'
    ? getProfileBgStyle(user.profileBg)
    : { backgroundColor: '#0f172a' }
  const prevXp = LEVEL_XP[user.level] || 0
  const nextXp = LEVEL_XP[user.level + 1] || prevXp + 10000
  const xpProgress = Math.min(Math.round(((user.xp - prevXp) / (nextXp - prevXp)) * 100), 100)
  const daysInApp = Math.floor((Date.now() - new Date(user.createdAt || Date.now()).getTime()) / 86400000)

  return (
    <div
      className="min-h-screen"
      style={profileBgStyle}
    >
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Назад
      </button>
    <div className="max-w-lg mx-auto space-y-5">
      

      {/* RPG-карточка */}
      <div className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${levelColor}40`
        }}>
        <div className="absolute inset-0 opacity-5"
          style={{ background: `radial-gradient(circle at top right, ${levelColor}, transparent 70%)` }} />

        <div className="flex items-start gap-4 relative">
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
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-white font-bold text-xl">{user.name}
                  {user.activePetId && (
                    <span className="text-2xl ml-1" title="Активный питомец">
                      {/* Найди emoji по activePetId */}
                      {PETS_EMOJIS[user.activePetId] || ''}
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${levelColor}20`, color: levelColor }}>
                    {levelName}
                  </span>
                  <span className="text-slate-500 text-xs">ID: #{user.id}</span>
                  {!user.isPrivate && (
                    <span className="text-slate-500 text-xs">{daysInApp} дн. в игре</span>
                  )}
                </div>
              </div>

              {/* Действия */}
              <div className="shrink-0 flex gap-2">
                {isOwnProfile ? (
                  <button onClick={() => navigate('/profile')}
                    className="px-3 py-1.5 rounded-xl text-white text-xs font-medium"
                    style={{ backgroundColor: '#4f46e5' }}>
                    Мой профиль
                  </button>
                ) : (
                  friendStatus === 'accepted' ? (
                    <span className="flex items-center gap-1 text-sm text-green-400 px-3 py-1.5 rounded-xl"
                      style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                      <Check size={14} /> Друзья
                    </span>
                  ) : (friendStatus === 'pending' || requestSent) ? (
                    <span className="text-sm text-slate-400 px-3 py-1.5 rounded-xl"
                      style={{ border: '1px solid #475569' }}>
                      Заявка отправлена
                    </span>
                  ) : (
                    <button onClick={handleAddFriend}
                      className="flex items-center gap-1 text-sm text-white px-3 py-1.5 rounded-xl font-medium"
                      style={{ backgroundColor: '#4f46e5' }}>
                      <UserPlus size={14} /> Добавить
                    </button>
                  )
                )}
              </div>
            </div>

            {/* XP */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Ур. {user.level}</span>
                <span style={{ color: levelColor }}>{user.xp.toLocaleString()} XP</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${xpProgress}%`, backgroundColor: levelColor }} />
              </div>
            </div>

            <div className="flex gap-4 mt-2">
              <span className="text-sm text-indigo-400">{user.xp.toLocaleString()} XP</span>
              {!user.isPrivate && <span className="text-sm text-yellow-400">{user.gold} 🪙</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Закрытый профиль */}
      {user.isPrivate && !isOwnProfile ? (
        <div className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155' }}>
          <Lock size={40} className="mx-auto mb-3 text-slate-600" />
          <h3 className="text-white font-semibold mb-1">Профиль закрыт</h3>
          <p className="text-slate-400 text-sm">Пользователь скрыл свою статистику</p>
        </div>
      ) : (
        <>
          {/* Статистика */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Clock size={16} />, label: 'В фокусе', value: formatMinutes(totalPomodoroMin || 0), color: '#4f46e5', bg: 'rgba(79,70,229,0.15)' },
              { icon: <CheckSquare size={16} />, label: 'Задач', value: tasksCompleted || 0, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
              { icon: <Trophy size={16} />, label: 'Сессий', value: totalSessions || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            ].map(({ icon, label, value, color, bg }) => (
              <div key={label} className="p-4 rounded-2xl text-center"
                style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155' }}>
                <div className="p-1.5 rounded-lg w-fit mx-auto mb-2" style={{ backgroundColor: bg, color }}>{icon}</div>
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          {/* Топ привычки */}
          {topHabits && topHabits.length > 0 && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155' }}>
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Flame size={16} className="text-orange-400" /> Лучшие привычки
              </h3>
              <div className="space-y-2">
                {topHabits.map((habit: any) => (
                  <div key={habit.title} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm truncate flex-1">{habit.title}</span>
                    <span className="text-orange-400 text-sm shrink-0 flex items-center gap-1 ml-2">
                      <Flame size={12} /> {habit.currentStreak} дн.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Радар */}
          {data.radar && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155' }}>
              <h3 className="text-white font-medium mb-3">🕸 Радар характеристик (7 дней)</h3>
              <RadarChart data={data.radar} />
              <div className="grid grid-cols-5 gap-1 mt-2">
                {[
                  { label: 'Фокус', value: data.radar.focus },
                  { label: 'Дисципл.', value: data.radar.discipline },
                  { label: 'Прогресс', value: data.radar.progress },
                  { label: 'Продукт.', value: data.radar.productivity },
                  { label: 'Добыча', value: data.radar.gold },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="text-white text-sm font-semibold">{value}</div>
                    <div className="text-slate-500 text-xs">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Инвентарь */}
          {data.inventory && data.inventory.length > 0 && (() => {
            const pets = data.inventory.filter((i: any) => i.itemType === 'pet')

            const pomodoroItems = data.inventory.filter((i: any) =>
              ['timer', 'background', 'sound'].includes(i.itemType)
            )

            const profileItems = data.inventory.filter((i: any) =>
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
              <div
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                }}
              >
                <h3 className="text-white font-medium mb-4">
                  🎒 Коллекция
                </h3>

                <div className="space-y-5">

                  {/* Питомцы */}
                  {pets.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        🐾 Питомцы
                        <span className="text-slate-500 text-sm font-normal">
                          ({pets.length})
                        </span>
                      </h4>

                      <div className="grid grid-cols-3 gap-3">
                        {pets.map((item: any) => (
                          <InventoryCard key={item.name} item={item} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Остальные секции */}
                  {sections.map(section => (
                    <div key={section.key}>
                      <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                        {section.title}
                        <span className="text-slate-500 text-sm font-normal">
                          ({section.items.length})
                        </span>
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        {section.items.map((item: any) => (
                          <InventoryCard key={item.name} item={item} />
                        ))}
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            )
          })()}

          {/* Достижения */}
          {achievements && achievements.length >= 0 && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(30, 41, 59, 0.95)', border: '1px solid #334155' }}>
              <h3 className="text-white font-medium mb-3">🏅 Достижения</h3>
              <AchievementGrid earned={achievements} showLocked={false} />
            </div>
          )}
        </>
      )}
    </div>
    </div>
  )
}
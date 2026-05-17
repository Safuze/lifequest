import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { Search, UserPlus, Check, X, Trophy, Users, Crown } from 'lucide-react'
import { getAvatarBorderStyle, getAvatarBorderClass } from '../utils/avatar'
import { LEVEL_NAMES, LEVEL_COLORS } from '../data/levelData'
import { PETS } from '../../../server/src/data/pets'

interface LeaderboardEntry {
  rank: number
  id: number
  name: string
  xp: number
  gold: number
  level: number
  levelName: string
  isCurrentUser: boolean
  avatarBorder?: string
  activePetId?: string
}

interface Friend {
  id: number
  name: string
  xp: number
  level: number
  friendshipId: number
}

interface IncomingRequest {
  id: number
  friendshipId: number
  user: { id: number; name: string; xp: number; level: number }
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>
  if (rank === 2) return <span className="text-2xl">🥈</span>
  if (rank === 3) return <span className="text-2xl">🥉</span>
  return (
    <span className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold"
      style={{ backgroundColor: '#1e293b', color: '#64748b' }}>
      {rank}
    </span>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<'global' | 'friends'>('global')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<IncomingRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<any | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const navigate = useNavigate()
  

  useEffect(() => {
    loadData()
  }, [mode])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [lbRes, friendsRes] = await Promise.all([
        apiClient.get(`/users/leaderboard?mode=${mode}`),
        apiClient.get('/users/friends'),
      ])
      setLeaderboard(lbRes.data.leaderboard)
      setCurrentUserRank(lbRes.data.currentUserRank)
      setFriends(friendsRes.data.friends)
      setIncoming(friendsRes.data.incoming)
    } catch (error) {
      console.error('Leaderboard load error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchId.trim()) return
    setSearchLoading(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const id = parseInt(searchId.trim())
      if (isNaN(id)) { setSearchError('Введите числовой ID'); return }
      const res = await apiClient.get(`/users/${id}/public`)
      setSearchResult(res.data.user)
    } catch {
      setSearchError('Пользователь не найден')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSendRequest = async (friendId: number) => {
    try {
      await apiClient.post('/users/friends/request', { friendId })
      setSearchResult((prev: any) => prev ? { ...prev, requestSent: true } : null)
    } catch (error: any) {
      console.error('Friend request error:', error.response?.data?.error)
    }
  }

  const handleFriendAction = async (friendshipId: number, action: 'accept' | 'reject') => {
    try {
      await apiClient.patch(`/users/friends/${friendshipId}`, { action })
      setIncoming(prev => prev.filter(r => r.friendshipId !== friendshipId))
      if (action === 'accept') loadData()
    } catch (error) {
      console.error('Friend action error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Лидерборд</h1>
        <p className="text-slate-400 text-sm mt-1">Соревнуйтесь с другими игроками</p>
      </div>

      {/* Поиск друга по ID */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-indigo-400" /> Найти пользователя по ID
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Введите ID пользователя..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
            />
          </div>
          <button onClick={handleSearch} disabled={searchLoading}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: '#4f46e5', opacity: searchLoading ? 0.7 : 1 }}>
            {searchLoading ? '...' : 'Найти'}
          </button>
        </div>

        {searchError && <p className="text-red-400 text-sm mt-2">{searchError}</p>}

        {searchResult && (
          <div className="mt-3 flex items-center justify-between p-3 rounded-xl"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                style={{ backgroundColor: `${LEVEL_COLORS[searchResult.level] || '#64748b'}20`, color: LEVEL_COLORS[searchResult.level] }}>
                {searchResult.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{searchResult.name}</p>
                <p className="text-slate-500 text-xs">
                  {LEVEL_NAMES[searchResult.level]} · {searchResult.xp} XP
                </p>
              </div>
            </div>
            {searchResult.id !== user?.id && (
              <button
                onClick={() => handleSendRequest(searchResult.id)}
                disabled={searchResult.requestSent}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: searchResult.requestSent ? 'rgba(34,197,94,0.2)' : '#4f46e5',
                  color: searchResult.requestSent ? '#22c55e' : '#fff',
                }}>
                {searchResult.requestSent ? <><Check size={14} /> Отправлено</> : <><UserPlus size={14} /> Добавить</>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Входящие заявки */}
      {incoming.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(99,102,241,0.3)' }}>
          <h3 className="text-white font-medium mb-3">📨 Заявки в друзья ({incoming.length})</h3>
          <div className="space-y-2">
            {incoming.map(req => (
              <div key={req.friendshipId} className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                    {req.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm">{req.user.name}</p>
                    <p className="text-slate-500 text-xs">{req.user.xp} XP</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleFriendAction(req.friendshipId, 'accept')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                    <Check size={16} />
                  </button>
                  <button onClick={() => handleFriendAction(req.friendshipId, 'reject')}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Переключатель режима */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        <button onClick={() => setMode('global')}
          className="flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: mode === 'global' ? '#4f46e5' : '#1e293b',
            color: mode === 'global' ? '#fff' : '#94a3b8',
          }}>
          <Trophy size={16} /> Глобальный
        </button>
        <button onClick={() => setMode('friends')}
          className="flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: mode === 'friends' ? '#4f46e5' : '#1e293b',
            color: mode === 'friends' ? '#fff' : '#94a3b8',
          }}>
          <Users size={16} /> Друзья {friends.length > 0 && `(${friends.length})`}
        </button>
      </div>

      {/* Позиция текущего пользователя */}
      {currentUserRank && (
        <div className="rounded-xl p-3 flex items-center justify-between"
          style={{ backgroundColor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <span className="text-indigo-300 text-sm">Ваша позиция в рейтинге</span>
          <span className="text-indigo-400 font-bold text-lg">#{currentUserRank}</span>
        </div>
      )}

      {/* Таблица лидеров */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        {leaderboard.length === 0 ? (
          <div className="p-12 text-center" style={{ backgroundColor: '#1e293b' }}>
            <Users size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400">
              {mode === 'friends' ? 'Нет друзей в рейтинге. Добавьте друзей по ID!' : 'Нет данных'}
            </p>
          </div>
        ) : (
          leaderboard.map((entry, i) => {
            const levelColor = LEVEL_COLORS[entry.level] || '#64748b'
            return (
              <div key={entry.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-slate-800/30"
                onClick={() => navigate(`/profile/${entry.id}`)}
                style={{
                  backgroundColor: entry.isCurrentUser
                    ? 'rgba(99,102,241,0.1)'
                    : i % 2 === 0 ? '#1e293b' : '#172033',
                  borderBottom: '1px solid #334155',
                  borderLeft: entry.isCurrentUser ? '3px solid #4f46e5' : '3px solid transparent',
                }}>

                {/* Ранг */}
                <div className="w-10 flex items-center justify-center shrink-0">
                  <RankBadge rank={entry.rank} />
                </div>

                {/* Аватар */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarBorderClass(entry.avatarBorder)}`}
                  style={{
                    backgroundColor: `${levelColor}20`,
                    color: levelColor,
                    ...getAvatarBorderStyle(entry.avatarBorder || 'default'),
                  }}>
                  {entry.name.charAt(0).toUpperCase()}
                </div>

                {/* Имя и уровень */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-white text-sm font-medium truncate">
                        {entry.name}
                      </span>

                      {(() => {
                        const activePet = PETS.find(p => p.id === entry.activePetId)

                        return activePet ? (
                          <img
                            src={activePet.image}
                            alt={activePet.name}
                            title={activePet.name}
                            className="w-6 h-6 object-contain shrink-0"
                          />
                        ) : null
                      })()}

                      {entry.isCurrentUser && (
                        <span className="text-indigo-400 text-xs shrink-0">
                          (Вы)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: levelColor }}>
                      {entry.levelName}
                    </span>
                    {entry.rank <= 3 && <Crown size={10} className="text-yellow-400" />}
                  </div>
                </div>
                {/* XP */}
                <div className="text-right shrink-0">
                  <div className="text-white text-sm font-bold">{entry.xp.toLocaleString()}</div>
                  <div className="text-slate-500 text-xs">XP</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Список друзей */}
      {mode === 'friends' && friends.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Users size={16} className="text-indigo-400" /> Мои друзья ({friends.length})
          </h3>
          <div className="space-y-2">
            {friends.map(friend => (
              <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${LEVEL_COLORS[friend.level] || '#64748b'}20`, color: LEVEL_COLORS[friend.level] }}>
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{friend.name}</p>
                  <p className="text-slate-500 text-xs">{LEVEL_NAMES[friend.level]} · {friend.xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
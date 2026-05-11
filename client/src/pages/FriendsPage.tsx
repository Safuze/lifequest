import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { Search, UserPlus, Check, X, Users, Trophy, UserMinus } from 'lucide-react'
import { LEVEL_NAMES, LEVEL_COLORS } from '../data/levelData'

interface Friend {
  id: number
  name: string
  xp: number
  level: number
  friendshipId: number
}

interface IncomingReq {
  friendshipId: number
  user: { id: number; name: string; xp: number; level: number }
}

export default function FriendsPage() {
  const navigate = useNavigate()
  const [friends, setFriends] = useState<Friend[]>([])
  const [incoming, setIncoming] = useState<IncomingReq[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<any | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')

  const loadFriends = useCallback(async () => {
    try {
      const res = await apiClient.get('/users/friends')
      setFriends(res.data.friends)
      setIncoming(res.data.incoming)
    } catch (error) {
      console.error('Load friends error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadFriends() }, [loadFriends])

  const handleSearch = async () => {
    if (!searchId.trim()) return
    setSearchLoading(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const id = parseInt(searchId.trim())
      if (isNaN(id)) { setSearchError('Введите числовой ID'); setSearchLoading(false); return }
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
      setSearchError(error.response?.data?.error || 'Ошибка отправки заявки')
    }
  }

  const handleFriendAction = async (friendshipId: number, action: 'accept' | 'reject') => {
    try {
      await apiClient.patch(`/users/friends/${friendshipId}`, { action })
      await loadFriends()
    } catch (error) {
      console.error('Friend action error:', error)
    }
  }

  const handleRemoveFriend = async (friendId: number) => {
    if (!confirm('Удалить из друзей?')) return
    try {
      await apiClient.delete(`/users/friends/${friendId}`)
      setFriends(prev => prev.filter(f => f.id !== friendId))
    } catch (error) {
      console.error('Remove friend error:', error)
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
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-white">Друзья</h1>
        <p className="text-slate-400 text-sm mt-1">
          {friends.length} друзей
          {incoming.length > 0 && ` · ${incoming.length} заявок`}
        </p>
      </div>

      {/* Поиск */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-indigo-400" /> Найти по ID
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              value={searchId}
              onChange={e => { setSearchId(e.target.value); setSearchError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Введите ID пользователя..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
            />
          </div>
          <button onClick={handleSearch} disabled={searchLoading}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity"
            style={{ backgroundColor: '#4f46e5', opacity: searchLoading ? 0.7 : 1 }}>
            {searchLoading ? '...' : 'Найти'}
          </button>
        </div>

        {searchError && <p className="text-red-400 text-sm mt-2">{searchError}</p>}

        {searchResult && (
          <div className="mt-3 flex items-center justify-between p-3 rounded-xl"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(`/profile/${searchResult.id}`)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                style={{
                  backgroundColor: `${LEVEL_COLORS[searchResult.level] || '#64748b'}20`,
                  color: LEVEL_COLORS[searchResult.level] || '#64748b',
                }}>
                {searchResult.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{searchResult.name}</p>
                <p className="text-slate-500 text-xs">
                  {LEVEL_NAMES[Math.min(searchResult.level, LEVEL_NAMES.length - 1)]} · {searchResult.xp} XP
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSendRequest(searchResult.id)}
              disabled={searchResult.requestSent || friends.some(f => f.id === searchResult.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: (searchResult.requestSent || friends.some((f: Friend) => f.id === searchResult.id))
                  ? 'rgba(34,197,94,0.2)' : '#4f46e5',
                color: (searchResult.requestSent || friends.some((f: Friend) => f.id === searchResult.id))
                  ? '#22c55e' : '#fff',
              }}>
              {friends.some((f: Friend) => f.id === searchResult.id)
                ? <><Check size={14} /> Уже друг</>
                : searchResult.requestSent
                  ? <><Check size={14} /> Отправлено</>
                  : <><UserPlus size={14} /> Добавить</>}
            </button>
          </div>
        )}
      </div>

      {/* Табы */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        <button onClick={() => setActiveTab('friends')}
          className="flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: activeTab === 'friends' ? '#4f46e5' : '#1e293b',
            color: activeTab === 'friends' ? '#fff' : '#94a3b8',
          }}>
          <Users size={16} /> Друзья ({friends.length})
        </button>
        <button onClick={() => setActiveTab('requests')}
          className="flex-1 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: activeTab === 'requests' ? '#4f46e5' : '#1e293b',
            color: activeTab === 'requests' ? '#fff' : '#94a3b8',
          }}>
          <UserPlus size={16} /> Заявки
          {incoming.length > 0 && (
            <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ backgroundColor: '#ef4444', color: '#fff' }}>
              {incoming.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'friends' && (
        <>
          {friends.length === 0 ? (
            <div className="rounded-2xl p-12 text-center"
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <Users size={48} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-white font-semibold mb-2">Нет друзей</h3>
              <p className="text-slate-400 text-sm">Найдите друзей по ID и соревнуйтесь в лидерборде</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends
                .sort((a, b) => b.xp - a.xp)
                .map((friend, index) => {
                  const lvlColor = LEVEL_COLORS[Math.min(friend.level, LEVEL_COLORS.length - 1)]
                  return (
                    <div key={friend.id}
                      className="flex items-center gap-3 p-4 rounded-2xl transition-colors"
                      style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>

                      {/* Ранг среди друзей */}
                      <div className="w-6 text-center shrink-0">
                        {index === 0 ? <span>🥇</span> : index === 1 ? <span>🥈</span> : index === 2 ? <span>🥉</span> : (
                          <span className="text-slate-500 text-sm font-medium">{index + 1}</span>
                        )}
                      </div>

                      {/* Аватарка — кликабельная */}
                      <button
                        onClick={() => navigate(`/profile/${friend.id}`)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all hover:scale-110"
                        style={{ backgroundColor: `${lvlColor}20`, color: lvlColor }}>
                        {friend.name.charAt(0).toUpperCase()}
                      </button>

                      {/* Инфо */}
                      <div className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/profile/${friend.id}`)}>
                        <p className="text-white text-sm font-medium">{friend.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: lvlColor }}>
                            {LEVEL_NAMES[Math.min(friend.level, LEVEL_NAMES.length - 1)]}
                          </span>
                          <span className="text-slate-500 text-xs">Ур. {friend.level}</span>
                        </div>
                      </div>

                      {/* XP */}
                      <div className="text-right shrink-0 mr-2">
                        <div className="text-white text-sm font-bold">{friend.xp.toLocaleString()}</div>
                        <div className="text-slate-500 text-xs">XP</div>
                      </div>

                      {/* Кнопка удалить */}
                      <button
                        onClick={async () => {
                          if (!confirm(`Удалить ${friend.name} из друзей?`)) return
                          try {
                            await apiClient.delete(`/users/friends/${friend.id}`)
                            setFriends(prev => prev.filter(f => f.id !== friend.id))
                          } catch { /* ignore */ }
                        }}
                        className="p-2 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
                        title="Удалить из друзей">
                        <UserMinus size={16} />
                      </button>
                    </div>
                  )
                })}
            </div>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <>
          {incoming.length === 0 ? (
            <div className="rounded-2xl p-12 text-center"
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <p className="text-slate-400">Нет входящих заявок</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incoming.map(req => {
                const lvlColor = LEVEL_COLORS[Math.min(req.user.level, LEVEL_COLORS.length - 1)]
                return (
                  <div key={req.friendshipId}
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{ backgroundColor: '#1e293b', border: '1px solid rgba(99,102,241,0.3)' }}>

                    <button
                      onClick={() => navigate(`/profile/${req.user.id}`)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all hover:scale-110"
                      style={{ backgroundColor: `${lvlColor}20`, color: lvlColor }}>
                      {req.user.name.charAt(0).toUpperCase()}
                    </button>

                    <div className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/profile/${req.user.id}`)}>
                      <p className="text-white text-sm font-medium">{req.user.name}</p>
                      <p className="text-slate-500 text-xs">
                        {LEVEL_NAMES[Math.min(req.user.level, LEVEL_NAMES.length - 1)]} · {req.user.xp} XP
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleFriendAction(req.friendshipId, 'accept')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: '#22c55e' }}>
                        <Check size={14} /> Принять
                      </button>
                      <button
                        onClick={() => handleFriendAction(req.friendshipId, 'reject')}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
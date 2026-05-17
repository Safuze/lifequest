import { useState, useEffect } from 'react'
import apiClient from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Clock, Target, Flame, CheckCircle, XCircle, Zap } from 'lucide-react'

interface Challenge {
  id: number; title: string; description: string
  type: string; targetValue: number; durationDays: number
  entryFee: number; rewardXp: number; rewardCredits: number
  isJoined: boolean
}

interface UserChallenge {
  id: number; status: string; progress: number
  startedAt: string; expiresAt: string; completedAt?: string
  challenge: Challenge
}

const TYPE_ICONS: Record<string, string> = {
  pomodoro_daily: '⏱',
  tasks_daily:    '✅',
  habit_streak:   '🔥',
  combined:       '⚡',
}

const STATUS_CONFIG = {
  active:    { label: 'Активно',   color: '#4f46e5', bg: 'rgba(79,70,229,0.15)'  },
  completed: { label: 'Выполнено', color: '#22c55e', bg: 'rgba(34,197,94,0.15)'  },
  failed:    { label: 'Провалено', color: '#ef4444', bg: 'rgba(239,68,68,0.15)'  },
}

function getRemainingDays(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
}

export default function ChallengesPage() {
  const { user, loadUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [myChallenges, setMyChallenges] = useState<UserChallenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joining, setJoining] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [allRes, myRes] = await Promise.all([
        apiClient.get('/challenges'),
        apiClient.get('/challenges/my'),
      ])
      setChallenges(allRes.data.challenges)
      setMyChallenges(myRes.data.challenges)
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }

  const handleJoin = async (challengeId: number) => {
    if (joining) return
    setJoining(challengeId)
    setError('')
    try {
      await apiClient.post(`/challenges/join/${challengeId}`)
      await loadData()
      loadUser()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка вступления')
    } finally {
      setJoining(null)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">Загрузка испытаний...</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy size={24} className="text-yellow-400" /> Испытания
          </h1>
          <p className="text-slate-400 text-sm mt-1">Принимай вызов и зарабатывай награды</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl text-sm"
          style={{ backgroundColor: '#1e293b', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-yellow-400 font-bold">{user?.gold || 0}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-red-400 text-sm"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {/* Табы */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        {([
          { id: 'all', label: '🏆 Все испытания' },
          { id: 'my',  label: `📋 Мои (${myChallenges.filter(c => c.status === 'active').length})` },
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

      {/* Все испытания */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {challenges.map(ch => {
            const canAfford = (user?.gold || 0) >= ch.entryFee
            const isJoining = joining === ch.id

            return (
              <div key={ch.id} className="rounded-2xl p-5"
                style={{
                  backgroundColor: '#1e293b',
                  border: ch.isJoined
                    ? '1px solid rgba(79,70,229,0.5)'
                    : '1px solid #334155',
                }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{TYPE_ICONS[ch.type] || '🎯'}</div>
                    <div>
                      <h3 className="text-white font-semibold">{ch.title}</h3>
                      <p className="text-slate-400 text-sm mt-0.5">{ch.description}</p>
                    </div>
                  </div>
                  {ch.isJoined && (
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(79,70,229,0.2)', color: '#818cf8' }}>
                      Участвую
                    </span>
                  )}
                </div>

                {/* Параметры */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-2.5 rounded-xl text-center"
                    style={{ backgroundColor: '#0f172a' }}>
                    <Clock size={14} className="mx-auto text-slate-400 mb-1" />
                    <div className="text-white text-sm font-bold">{ch.durationDays} дн.</div>
                    <div className="text-slate-500 text-xs">Длительность</div>
                  </div>
                  <div className="p-2.5 rounded-xl text-center"
                    style={{ backgroundColor: '#0f172a' }}>
                    <Zap size={14} className="mx-auto text-indigo-400 mb-1" />
                    <div className="text-indigo-400 text-sm font-bold">+{ch.rewardXp} XP</div>
                    <div className="text-slate-500 text-xs">Награда</div>
                  </div>
                  <div className="p-2.5 rounded-xl text-center"
                    style={{ backgroundColor: '#0f172a' }}>
                    <Target size={14} className="mx-auto text-yellow-400 mb-1" />
                    <div className="text-yellow-400 text-sm font-bold">+{ch.rewardCredits}</div>
                    <div className="text-slate-500 text-xs">Баллов</div>
                  </div>
                </div>

                {/* Кнопка */}
                {!ch.isJoined && (
                  <button
                    onClick={() => handleJoin(ch.id)}
                    disabled={!canAfford || isJoining}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: canAfford ? '#4f46e5' : 'rgba(71,85,105,0.4)',
                      color: canAfford ? '#fff' : '#64748b',
                      cursor: canAfford ? 'pointer' : 'not-allowed',
                    }}>
                    {isJoining
                      ? 'Вступление...'
                      : canAfford
                        ? `Вступить за ${ch.entryFee} кр.`
                        : `Нужно ${ch.entryFee} кр.`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Мои испытания */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          {myChallenges.length === 0 ? (
            <div className="rounded-2xl p-12 text-center"
              style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
              <Trophy size={48} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-white font-semibold mb-2">Нет активных испытаний</h3>
              <p className="text-slate-400 text-sm">Вступи в испытание и зарабатывай награды</p>
            </div>
          ) : (
            myChallenges.map(uc => {
              const st = STATUS_CONFIG[uc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
              const remaining = getRemainingDays(uc.expiresAt)

              return (
                <div key={uc.id} className="rounded-2xl p-5"
                  style={{ backgroundColor: '#1e293b', border: `1px solid ${st.color}40` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{TYPE_ICONS[uc.challenge.type] || '🎯'}</div>
                      <div>
                        <h3 className="text-white font-semibold">{uc.challenge.title}</h3>
                        <p className="text-slate-400 text-xs mt-0.5">{uc.challenge.description}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>

                  {/* Прогресс-бар */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">Прогресс</span>
                      <span style={{ color: st.color }} className="font-bold">{Math.round(uc.progress)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${uc.progress}%`, backgroundColor: st.color }} />
                    </div>
                  </div>

                  {/* Метаданные */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {uc.status === 'active' && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {remaining} дн. осталось
                      </span>
                    )}
                    {uc.status === 'completed' && (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle size={11} /> Выполнено{uc.completedAt ? ` ${new Date(uc.completedAt).toLocaleDateString('ru-RU')}` : ''}
                      </span>
                    )}
                    {uc.status === 'failed' && (
                      <span className="flex items-center gap-1 text-red-400">
                        <XCircle size={11} /> Провалено
                      </span>
                    )}
                    {uc.status !== 'failed' && (
                      <span className="flex items-center gap-2">
                        <span className="text-indigo-400">+{uc.challenge.rewardXp} XP</span>
                        <span className="text-yellow-400">+{uc.challenge.rewardCredits} кр.</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
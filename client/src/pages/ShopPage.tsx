import { useState, useEffect } from 'react'
import apiClient from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { ShoppingBag, Check, Zap } from 'lucide-react'
const RARITY_COLORS: Record<string, string> = {
  common: '#22c55e', rare: '#4f46e5', epic: '#a855f7', legendary: '#f59e0b'
}
const RARITY_LABELS: Record<string, string> = {
  common: 'Обычное', rare: 'Редкое', epic: 'Эпическое', legendary: 'Легендарное'
}

interface CatalogItem {
  id: string; category: string; name: string; description: string
  icon: string; price: number; rarity: string; preview?: string
  owned: boolean; equipped: boolean; 
  level?: number; maxLevel?: number; bonusPercent?: number
}

interface QolData {
  gold: number
  habitSlot: {
    current: number; max: number; level: number
    nextPrice: number | null; isMaxed: boolean
  }
  taskSlot: {
    current: number; dailyCurrent: number
    max: number; dailyMax: number
    level: number; nextPrice: number | null; isMaxed: boolean
  }
}

export default function ShopPage() {
  const { user, loadUser } = useAuth()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [activeTab, setActiveTab] = useState<'avatar_border' | 'profile_bg' | 'booster_temp' | 'perk_permanent' | 'qol_upgrade' | 'pets'>('avatar_border')
  const [isLoading, setIsLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [equipping, setEquipping] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [activeBoosters, setActiveBoosters] = useState<any[]>([])
  const [activePerks, setActivePerks] = useState<any[]>([])
  const [qolData, setQolData] = useState<QolData | null>(null)
  const [buyingQol, setBuyingQol] = useState<string | null>(null)
  const [qolError, setQolError] = useState('')
  const [petCatalog, setPetCatalog] = useState<any[]>([])
  const [activatingPet, setActivatingPet] = useState<string | null>(null)
  const [buyingPet, setBuyingPet] = useState<string | null>(null)
  useEffect(() => {
    loadCatalog()

    const interval = setInterval(() => {
      loadCatalog()
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  const loadCatalog = async () => {
    try {
      const [catalogRes, boostersRes, qolRes, petsRes] = await Promise.all([
        apiClient.get('/shop/catalog'),
        apiClient.get('/boosters/active'),
        apiClient.get('/shop/qol'),
        apiClient.get('/shop/pets'),
      ])
      setCatalog(catalogRes.data.catalog)
      setActiveBoosters(boostersRes.data.boosters)
      setActivePerks(boostersRes.data.perks)
      setQolData(qolRes.data)
      setPetCatalog(petsRes.data.catalog)
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
    
  }

  const handleBuyPet = async (petId: string) => {
    if (buyingPet) return
    setBuyingPet(petId)
    setError('')
    try {
      await apiClient.post('/shop/pets/buy', { petId })
      await loadCatalog()
      loadUser()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка покупки')
    } finally { setBuyingPet(null) }
  }

  const handleActivatePet = async (petId: string, isActive: boolean) => {
    if (activatingPet) return
    setActivatingPet(petId)
    try {
      await apiClient.post('/shop/pets/activate', { petId: isActive ? null : petId })
      await loadCatalog()
      loadUser()
    } catch { /* ignore */ }
    finally { setActivatingPet(null) }
  }

  const handleBuyQol = async (type: 'habit' | 'task') => {
    if (buyingQol) return
    setBuyingQol(type)
    setQolError('')
    try {
      await apiClient.post(`/shop/qol/buy-${type}-slot`)
      await loadCatalog()
      loadUser()
    } catch (err: any) {
      setQolError(err.response?.data?.error || 'Ошибка покупки')
    } finally {
      setBuyingQol(null)
    }
  }

  const handleBuy = async (item: CatalogItem) => {
    if (buying) return
    setBuying(item.id)
    setError('')
    try {
      await apiClient.post('/shop/buy', { itemId: item.id })
      await loadCatalog()
      loadUser()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка покупки')
    } finally {
      setBuying(null)
    }
  }

  const handleEquip = async (item: CatalogItem) => {
    if (equipping) return
    setEquipping(item.id)
    try {
      if (item.equipped) {
        await apiClient.post('/shop/unequip', { category: item.category })
      } else {
        await apiClient.post('/shop/equip', { itemId: item.id })
      }
      await loadCatalog()
      loadUser()
    } catch { /* ignore */ }
    finally { setEquipping(null) }
    
  }

  const filtered = catalog.filter(i => i.category === activeTab)

  const getPreviewStyle = (item: any): React.CSSProperties => {
    if (item.category !== 'profile_bg' || !item.background) {
      if (!item.preview) return {}

      if (item.preview === 'rainbow') {
        return {
          background:
            'linear-gradient(45deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff)'
        }
      }

      if (item.preview.startsWith('#')) {
        return {
          backgroundColor: item.preview
        }
      }

      return {
        background: item.preview
      }
    }

    const bg = item.background

    if (bg.type === 'gradient') {
      return {
        background: bg.value
      }
    }

    if (bg.type === 'image') {
      return {
        backgroundImage: `url(${bg.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }

    if (bg.type === 'video') {
      return {
        backgroundImage: `url(${bg.poster || ''})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }

    return {}
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">Загрузка магазина...</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag size={24} className="text-indigo-400" /> Магазин
          </h1>
          <p className="text-slate-400 text-sm mt-1">Кастомизация профиля за золото</p>
        </div>
        <div className="px-4 py-2 rounded-xl flex items-center gap-2"
          style={{ backgroundColor: '#1e293b', border: '1px solid rgba(245,158,11,0.3)' }}>
          <span className="text-yellow-400 font-bold text-lg">{Number(user?.gold || 0).toFixed(1)}</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-red-400 text-sm"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}

      {(activeBoosters.length > 0 || activePerks.length > 0) && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#1e293b', border: '1px solid rgba(99,102,241,0.3)' }}>
          <h3 className="text-white font-medium mb-3 text-sm flex items-center gap-2">
            <Zap size={16} className="text-indigo-400" /> Активные бонусы
          </h3>
          <div className="space-y-2">
            {activeBoosters.map(b => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: '#0f172a' }}>
                <div className="flex items-center gap-2">
                  <span>{b.type === 'xp_boost' ? '⚡' : b.type === 'gold_boost' ? '💰' : '🚀'}</span>
                  <span className="text-white text-sm">
                    {b.type === 'xp_boost' ? 'XP' : b.type === 'gold_boost' ? 'Баллы' : 'Комбо'} x{b.multiplier}
                  </span>
                </div>
                <span className="text-slate-400 text-xs">
                  {b.remainingMinutes > 60
                    ? `${Math.floor(b.remainingMinutes / 60)}ч ${b.remainingMinutes % 60}м`
                    : `${b.remainingMinutes}м`}
                </span>
              </div>
            ))}
            {activePerks.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg"
                style={{ backgroundColor: '#0f172a' }}>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm">
                    {p.type === 'xp_bonus' ? 'XP' : 'Баллы'} • {' '}Lv.{p.level} • +{p.bonusPercent}%
                  </span>
                  {p.level >= 5 && (
                    <span className="text-yellow-400 text-xs font-bold">
                      MAX
                    </span>
                  )}
                </div>
                <span className="text-green-400 text-xs">∞</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Табы */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        {([
          { id: 'avatar_border', label: '🖼 Обводка аватара' },
          { id: 'profile_bg',    label: '🎨 Фон профиля' },
          { id: 'booster_temp',    label: '⚡ Бустеры'  },
          { id: 'perk_permanent',  label: '📈 Перки'    },
          { id: 'qol_upgrade', label: '🧩 Улучшения' },
          { id: 'pets', label: '🐾 Питомцы' },
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

      {/* Сетка предметов */}
      {/* QoL улучшения */}
      {activeTab === 'qol_upgrade' && qolData ? (
        <div className="space-y-4">

          {qolError && (
            <div
              className="p-3 rounded-xl text-red-400 text-sm"
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              {qolError}
            </div>
          )}

          {/* Слоты привычек */}
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Слоты привычек
                </h3>

                <p className="text-slate-400 text-sm mt-0.5">
                  Увеличивает максимальное количество привычек
                </p>
              </div>

              {qolData.habitSlot.isMaxed && (
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: 'rgba(245,158,11,0.2)',
                    color: '#f59e0b',
                  }}
                >
                  МАКС
                </span>
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-400">Текущий лимит</span>

                <span className="text-white font-bold">
                  {qolData.habitSlot.current}
                  <span className="text-slate-500 font-normal">
                    {' '}
                    / {qolData.habitSlot.max}
                  </span>
                </span>
              </div>

              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(qolData.habitSlot.current / qolData.habitSlot.max) * 100}%`,
                    backgroundColor: qolData.habitSlot.isMaxed
                      ? '#f59e0b'
                      : '#4f46e5',
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => handleBuyQol('habit')}
              disabled={
                qolData.habitSlot.isMaxed ||
                buyingQol === 'habit' ||
                qolData.gold < (qolData.habitSlot.nextPrice || 0)
              }
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: qolData.habitSlot.isMaxed
                  ? 'rgba(71,85,105,0.3)'
                  : qolData.gold >= (qolData.habitSlot.nextPrice || 0)
                  ? '#4f46e5'
                  : 'rgba(71,85,105,0.5)',

                color:
                  qolData.habitSlot.isMaxed ||
                  qolData.gold < (qolData.habitSlot.nextPrice || 0)
                    ? '#64748b'
                    : '#fff',
              }}
            >
              {qolData.habitSlot.isMaxed
                ? '✓ Максимум достигнут'
                : buyingQol === 'habit'
                ? 'Покупка...'
                : `+1 слот привычек — ${qolData.habitSlot.nextPrice} Баллов`}
            </button>
          </div>

          {/* Слоты задач */}
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Слоты задач
                </h3>

                <p className="text-slate-400 text-sm mt-0.5">
                  Увеличивает общий и дневной лимит задач
                </p>
              </div>

              {qolData.taskSlot.isMaxed && (
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: 'rgba(245,158,11,0.2)',
                    color: '#f59e0b',
                  }}
                >
                  МАКС
                </span>
              )}
            </div>

            <div className="space-y-3 mb-4">

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Всего задач</span>

                  <span className="text-white font-bold">
                    {qolData.taskSlot.current}
                    <span className="text-slate-500 font-normal">
                      {' '}
                      / {qolData.taskSlot.max}
                    </span>
                  </span>
                </div>

                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(qolData.taskSlot.current / qolData.taskSlot.max) * 100}%`,
                      backgroundColor: '#22c55e',
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">В день</span>

                  <span className="text-white font-bold">
                    {qolData.taskSlot.dailyCurrent}
                    <span className="text-slate-500 font-normal">
                      {' '}
                      / {qolData.taskSlot.dailyMax}
                    </span>
                  </span>
                </div>

                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(qolData.taskSlot.dailyCurrent / qolData.taskSlot.dailyMax) * 100}%`,
                      backgroundColor: '#f59e0b',
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleBuyQol('task')}
              disabled={
                qolData.taskSlot.isMaxed ||
                buyingQol === 'task' ||
                qolData.gold < (qolData.taskSlot.nextPrice || 0)
              }
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: qolData.taskSlot.isMaxed
                  ? 'rgba(71,85,105,0.3)'
                  : qolData.gold >= (qolData.taskSlot.nextPrice || 0)
                  ? '#22c55e'
                  : 'rgba(71,85,105,0.5)',

                color:
                  qolData.taskSlot.isMaxed ||
                  qolData.gold < (qolData.taskSlot.nextPrice || 0)
                    ? '#64748b'
                    : '#0f172a',
              }}
            >
              {qolData.taskSlot.isMaxed
                ? '✓ Максимум достигнут'
                : buyingQol === 'task'
                ? 'Покупка...'
                : `+1 слот задач — ${qolData.taskSlot.nextPrice} Баллов`}
            </button>
          </div>
        </div>
      ) : activeTab === 'pets' ? (
            <div className="space-y-4">
            {/* Статистика коллекции */}
            <div className="grid grid-cols-4 gap-3">
              {(['common', 'rare', 'epic', 'legendary'] as const).map(rarity => {
                const total  = petCatalog.filter(p => p.rarity === rarity).length
                const owned  = petCatalog.filter(p => p.rarity === rarity && p.owned).length
                const color  = { common: '#22c55e', rare: '#4f46e5', epic: '#a855f7', legendary: '#f59e0b' }[rarity]
                const labels = { common: 'Обычные', rare: 'Редкие', epic: 'Эпические', legendary: 'Легенд.' }
                return (
                  <div key={rarity} className="p-3 rounded-xl text-center"
                    style={{ backgroundColor: '#1e293b', border: `1px solid ${color}30` }}>
                    <div className="text-lg font-bold" style={{ color }}>{owned}/{total}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{labels[rarity]}</div>
                  </div>
                )
              })}
            </div>

            {/* Сетка питомцев */}
            <div className="grid grid-cols-2 gap-4">
              {petCatalog.map(pet => {
                const color  = { common: '#22c55e', rare: '#4f46e5', epic: '#a855f7', legendary: '#f59e0b' }[pet.rarity as string] || '#4f46e5'
                const labels = { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' }
                const canAfford = (user?.gold || 0) >= pet.price
                const isBuying  = buyingPet === pet.id
                const isActivating = activatingPet === pet.id

                return (
                  <div key={pet.id}
                    className="rounded-2xl p-4 flex flex-col gap-3 transition-all"
                    style={{
                      backgroundColor: '#1e293b',
                      border: pet.active
                        ? `2px solid ${color}`
                        : pet.owned
                          ? `1px solid ${color}40`
                          : '1px solid #334155',
                      boxShadow: pet.active ? `0 0 20px ${color}40, 0 0 40px ${color}20` : 'none',
                      opacity: pet.owned ? 1 : 0.6,
                      transition: 'all 0.3s ease',
                    }}>

                    {/* Эмодзи питомца */}
                    <div className="relative">
                      <div
                        className="flex items-center justify-center py-3 rounded-xl"
                        style={{
                          backgroundColor: `${color}10`,
                          filter: pet.owned ? 'none' : 'grayscale(100%)',
                        }}
                      >
                        <img
                          src={pet.image}
                          alt={pet.name}
                          className="w-20 h-20 object-contain"
                          draggable={false}
                        />
                      </div>
                      {/* Активный бейдж */}
                      {pet.active && (
                        <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: color, color: '#000' }}>
                          ★
                        </div>
                      )}

                      {/* Замок для некупленных */}
                      {!pet.owned && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                          <span className="text-2xl">🔒</span>
                        </div>
                      )}
                    </div>

                    {/* Инфо */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-white text-sm font-bold">{pet.name}</h3>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${color}20`, color }}>
                          {(labels as any)[pet.rarity]}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs leading-relaxed">{pet.description}</p>
                    </div>

                    {/* Кнопка */}
                    {pet.owned ? (
                      <button
                        onClick={() => handleActivatePet(pet.id, pet.active)}
                        disabled={isActivating}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          backgroundColor: pet.active ? 'rgba(239,68,68,0.15)' : `${color}20`,
                          color: pet.active ? '#ef4444' : color,
                          border: `1px solid ${pet.active ? 'rgba(239,68,68,0.4)' : color + '50'}`,
                        }}>
                        {isActivating ? '...' : pet.active ? '✕ Снять' : '✓ Сделать активным'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyPet(pet.id)}
                        disabled={!canAfford || isBuying}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          backgroundColor: canAfford ? '#f59e0b' : 'rgba(71,85,105,0.3)',
                          color: canAfford ? '#0f172a' : '#64748b',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          opacity: isBuying ? 0.7 : 1,
                        }}>
                        {isBuying ? 'Покупка...' : `${pet.price.toLocaleString()} Баллов`}
                      </button>
                    )}
                  </div>
            )
          })}
        </div>
      </div>
      ) : (
        /* Обычный магазин */
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(item => {
            const color = RARITY_COLORS[item.rarity] || '#4f46e5'
            const canAfford = (user?.gold || 0) >= item.price
            const isBuying = buying === item.id
            const isEquipping = equipping === item.id
            const isBooster = item.category === 'booster_temp'
            const isPerk = item.category === 'perk_permanent'
            return (
            <div key={item.id} className="rounded-2xl p-4 flex flex-col gap-3 transition-all hover:-translate-y-1"
              style={{
                backgroundColor: '#1e293b',
                border: item.equipped
                  ? `2px solid ${color}`
                  : `1px solid ${item.owned ? color + '40' : '#334155'}`,
                boxShadow: item.equipped ? `0 0 16px ${color}30` : 'none',
              }}>
              {/* Превью */}
              <div className="relative">
                {activeTab === 'avatar_border' ? (
                  // Превью обводки — аватар-заглушка
                  <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center font-bold text-xl relative"
                    style={{
                      backgroundColor: 'rgba(99,102,241,0.2)',
                      color: '#a5b4fc',
                      ...(item.preview !== 'rainbow' ? {
                        border: `3px solid ${item.preview || '#334155'}`,
                        boxShadow: item.preview ? `0 0 12px ${item.preview}60` : 'none',
                      } : {
                        background: 'linear-gradient(white, white) padding-box, linear-gradient(45deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff) border-box',
                        border: '3px solid transparent',
                      })
                    }}>
                    A
                  </div>
                ) : (
                  // Превью фона
                  <div className="w-full h-16 rounded-xl relative overflow-hidden"
                    style={getPreviewStyle(item)}>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">
                      {item.icon}
                    </div>
                  </div>
                )}

                {/* Бейдж экипировано */}
                {item.equipped && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: color }}>
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </div>

              {/* Инфо */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h3 className="text-white text-sm font-semibold">{item.icon} {item.name}</h3>
                  <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: `${color}20`, color }}>
                    {RARITY_LABELS[item.rarity]}
                  </span>
                </div>
                <p className="text-slate-500 text-xs">{item.description}</p>
                {item.category === 'perk_permanent' && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Уровень {item.level || 0}/{item.maxLevel || 5}
                      </span>

                      <span className="text-indigo-400 font-medium">
                        +{item.bonusPercent || 0}%
                      </span>
                    </div>

                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: '#0f172a' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${((item.level || 0) / (item.maxLevel || 5)) * 100}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Действие */}
              {isBooster ? (
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBuying}
                  className="w-full py-2 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: canAfford
                      ? '#f59e0b'
                      : 'rgba(71,85,105,0.5)',
                    color: canAfford ? '#0f172a' : '#64748b',
                  }}
                >
                  {isBuying
                    ? 'Активация...'
                    : canAfford
                    ? `${item.price}`
                    : `${item.price} Баллов`}
                </button>
              ) : isPerk ? (
                <button
                  onClick={() => handleBuy(item)}
                  disabled={
                    isBuying ||
                    !canAfford ||
                    (item.level || 0) >= (item.maxLevel || 5)
                  }
                  className="w-full py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor:
                      (item.level || 0) >= (item.maxLevel || 5)
                        ? 'rgba(34,197,94,0.15)'
                        : canAfford
                        ? '#6366f1'
                        : 'rgba(71,85,105,0.5)',

                    color:
                      (item.level || 0) >= (item.maxLevel || 5)
                        ? '#22c55e'
                        : canAfford
                        ? '#fff'
                        : '#64748b',
                  }}
                >
                  {(item.level || 0) >= (item.maxLevel || 5)
                    ? 'Максимум'
                    : isBuying
                    ? 'Улучшение...'
                    : item.level
                    ? `⬆ Улучшить (${item.level} → ${item.level + 1})`
                    : `${item.price} Баллов`}
                </button>
              ) : item.owned ? (

                <button
                  onClick={() => handleEquip(item)}
                  disabled={isEquipping}
                  className="w-full py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: item.equipped ? 'rgba(239,68,68,0.15)' : `${color}20`,
                    color: item.equipped ? '#ef4444' : color,
                    border: `1px solid ${item.equipped ? 'rgba(239,68,68,0.3)' : color + '40'}`,
                  }}>
                  {isEquipping ? '...' : item.equipped ? '✕ Снять' : '✓ Надеть'}
                </button>
              ) : (
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBuying}
                  className="w-full py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: canAfford ? '#f59e0b' : 'rgba(71,85,105,0.5)',
                    color: canAfford ? '#0f172a' : '#64748b',
                    opacity: isBuying ? 0.7 : 1,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                  }}>
                  {isBuying ? 'Покупка...' : canAfford
                    ? `${item.price} Баллов` 
                    : `${item.price} Баллов` }
                </button>
              )}
            </div>
          )})}
        </div>
        )}
    </div>
  )
}
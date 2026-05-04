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
  owned: boolean; equipped: boolean
}

export default function ShopPage() {
  const { user, loadUser } = useAuth()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [activeTab, setActiveTab] = useState<'avatar_border' | 'profile_bg'>('avatar_border')
  const [isLoading, setIsLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [equipping, setEquipping] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { loadCatalog() }, [])

  const loadCatalog = async () => {
    try {
      const res = await apiClient.get('/shop/catalog')
      setCatalog(res.data.catalog)
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
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

  const getPreviewStyle = (item: CatalogItem): React.CSSProperties => {
    if (!item.preview) return {}
    if (item.preview === 'rainbow') return { background: 'linear-gradient(45deg, #ff0000, #ff7700, #ffff00, #00ff00, #0000ff, #8b00ff)' }
    if (item.preview.startsWith('#')) return { backgroundColor: item.preview }
    return { background: item.preview }
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
          <span className="text-yellow-400 font-bold text-lg">{user?.gold || 0}</span>
          <span className="text-yellow-400">🪙</span>
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
          { id: 'avatar_border', label: '🖼 Обводка аватара' },
          { id: 'profile_bg',    label: '🎨 Фон профиля' },
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
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(item => {
          const color = RARITY_COLORS[item.rarity] || '#4f46e5'
          const canAfford = (user?.gold || 0) >= item.price
          const isBuying = buying === item.id
          const isEquipping = equipping === item.id

          return (
            <div key={item.id} className="rounded-2xl p-4 flex flex-col gap-3"
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
              </div>

              {/* Действие */}
              {item.owned ? (
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
                    ? `🪙 ${item.price}`
                    : `Нужно ${item.price} 🪙`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
import { useState, useEffect, useCallback } from 'react'

interface AchievementItem {
  type: string
  title: string
  description: string
  icon: string
  rarity: string
}

interface LevelUpItem {
  level: number
  levelName: string
}

type ModalItem =
  | { kind: 'achievement'; data: AchievementItem }
  | { kind: 'levelup'; data: LevelUpItem }

const RARITY_COLORS: Record<string, string> = {
  common:    '#22c55e',
  rare:      '#4f46e5',
  epic:      '#a855f7',
  legendary: '#f59e0b',
}

const RARITY_LABELS: Record<string, string> = {
  common:    'Обычное',
  rare:      'Редкое',
  epic:      'Эпическое',
  legendary: 'Легендарное',
}

const LEVEL_COLORS = ['#64748b', '#22c55e', '#4f46e5', '#f59e0b', '#ef4444', '#a855f7']

interface RewardModalProps {
  queue: ModalItem[]
  onNext: () => void
}

function AchievementModal({ item, onClose }: { item: AchievementItem; onClose: () => void }) {
  const color = RARITY_COLORS[item.rarity] || '#4f46e5'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-3xl p-8 z-10 text-center overflow-hidden"
        style={{
          backgroundColor: '#0f172a',
          border: `2px solid ${color}`,
          boxShadow: `0 0 60px ${color}40, 0 0 120px ${color}20`,
          animation: 'modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
        {/* Фоновый эффект */}
        <div className="absolute inset-0 opacity-5"
          style={{ background: `radial-gradient(circle at 50% 30%, ${color}, transparent 70%)` }} />

        {/* Звёздный ореол */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs"
          style={{ color, opacity: 0.6 }}>
          ✦ ✦ ✦
        </div>

        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color }}>
            Достижение разблокировано!
          </p>

          {/* Иконка */}
          <div className="text-7xl mb-4" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}>
            {item.icon}
          </div>

          {/* Ранг */}
          <span className="inline-block text-xs px-3 py-1 rounded-full font-medium mb-3"
            style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
            {RARITY_LABELS[item.rarity] || item.rarity}
          </span>

          {/* Название */}
          <h2 className="text-white font-bold text-2xl mb-2">{item.title}</h2>
          <p className="text-slate-400 text-sm mb-6">{item.description}</p>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: color }}>
            Отлично! 🎉
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalPop {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function LevelUpModal({ item, onClose }: { item: LevelUpItem; onClose: () => void }) {
  const color = LEVEL_COLORS[Math.min(item.level, LEVEL_COLORS.length - 1)]

  const LEVEL_ICONS = ['🌱', '📗', '📘', '📙', '📕', '🌟']
  const icon = LEVEL_ICONS[Math.min(item.level, LEVEL_ICONS.length - 1)]

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-3xl p-8 z-10 text-center overflow-hidden"
        style={{
          backgroundColor: '#0f172a',
          border: `2px solid ${color}`,
          boxShadow: `0 0 60px ${color}50, 0 0 120px ${color}25`,
          animation: 'modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
        <div className="absolute inset-0 opacity-5"
          style={{ background: `radial-gradient(circle at 50% 30%, ${color}, transparent 70%)` }} />

        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-sm"
          style={{ color, opacity: 0.7 }}>
          ★ ★ ★
        </div>

        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color }}>
            Новый уровень!
          </p>

          <div className="text-7xl mb-3" style={{ filter: `drop-shadow(0 0 20px ${color}80)` }}>
            {icon}
          </div>

          <div className="mb-2">
            <span className="text-slate-400 text-sm">Уровень </span>
            <span className="font-bold text-4xl" style={{ color }}>{item.level}</span>
          </div>

          <h2 className="text-white font-bold text-2xl mb-6">{item.levelName}</h2>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: color }}>
            Вперёд! 🚀
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalPop {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// Глобальный менеджер очереди — вставляется в Layout один раз
export function RewardModalManager() {
  const [queue, setQueue] = useState<ModalItem[]>([])

  const handleEvent = useCallback((e: Event) => {
    const { achievements, levelUp } = (e as CustomEvent).detail || {}
    const items: ModalItem[] = []

    if (levelUp) {
      items.push({ kind: 'levelup', data: levelUp })
    }
    if (achievements?.length) {
      achievements.forEach((a: AchievementItem) => {
        items.push({ kind: 'achievement', data: a })
      })
    }

    if (items.length > 0) {
      setQueue(prev => [...prev, ...items])
    }
  }, [])

  useEffect(() => {
    window.addEventListener('rewards', handleEvent as EventListener)
    return () => window.removeEventListener('rewards', handleEvent as EventListener)
  }, [handleEvent])

  const handleNext = useCallback(() => {
    setQueue(prev => prev.slice(1))
  }, [])

  if (queue.length === 0) return null

  const current = queue[0]

  if (current.kind === 'achievement') {
    return <AchievementModal item={current.data} onClose={handleNext} />
  }
  return <LevelUpModal item={current.data} onClose={handleNext} />
}
import { useState, useEffect } from 'react'

interface Achievement {
  type: string
  title: string
  description: string
  icon: string
  rarity: string
}

const RARITY_COLORS: Record<string, string> = {
  common:    '#22c55e',
  rare:      '#4f46e5',
  epic:      '#a855f7',
  legendary: '#f59e0b',
}

interface AchievementToastProps {
  achievements: Achievement[]
  onDismiss: () => void
}

export default function AchievementToast({ achievements, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(true)
  const ach = achievements[0]
  if (!ach || !visible) return null

  const color = RARITY_COLORS[ach.rarity] || '#4f46e5'

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl"
      style={{
        backgroundColor: '#1e293b',
        border: `1px solid ${color}60`,
        boxShadow: `0 0 30px ${color}30`,
        animation: 'slideUp 0.4s ease-out',
        minWidth: '280px',
        maxWidth: '380px',
      }}>
      <div className="text-3xl shrink-0">{ach.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white font-semibold text-sm">Достижение разблокировано!</p>
          <span className="text-xs px-1.5 py-0.5 rounded capitalize font-medium"
            style={{ backgroundColor: `${color}20`, color }}>
            {ach.rarity === 'common' ? 'Обычное'
              : ach.rarity === 'rare' ? 'Редкое'
              : ach.rarity === 'epic' ? 'Эпическое'
              : 'Легендарное'}
          </span>
        </div>
        <p style={{ color }} className="font-bold text-base">{ach.title}</p>
        <p className="text-slate-400 text-xs mt-0.5">{ach.description}</p>
      </div>
      <button onClick={() => { setVisible(false); onDismiss() }} className="text-slate-500 hover:text-white shrink-0">
        ✕
      </button>

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100px); opacity: 0; }
          to   { transform: translate(-50%, 0);     opacity: 1; }
        }
      `}</style>
    </div>
  )
}
import type { PreviewData } from '../data/inventoryMeta'

interface Props {
  preview: PreviewData
  size?: 'sm' | 'md'
}

export function InventoryPreview({ preview, size = 'md' }: Props) {
  const h = size === 'sm' ? 'h-10' : 'h-14'

  if (preview.kind === 'avatar_border') {
    const borderStyle: React.CSSProperties = preview.isRainbow
      ? {
          background: 'linear-gradient(white,white) padding-box, linear-gradient(45deg,#ff0000,#ff7700,#ffff00,#00ff00,#0000ff,#8b00ff) border-box',
          border: '3px solid transparent',
        }
      : {
          border: `3px solid ${preview.color}`,
          boxShadow: `0 0 10px ${preview.color}60`,
        }

    return (
      <div className={`${h} flex items-center justify-center`}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc', ...borderStyle }}>
          A
        </div>
      </div>
    )
  }

  if (preview.kind === 'profile_bg') {
    return (
      <div
        className={`w-full ${h} rounded-lg`}
        style={{ background: preview.gradient }} />
    )
  }

  if (preview.kind === 'pomodoro_bg') {
    return (
      <div
        className={`w-full ${h} rounded-lg flex items-center justify-center relative overflow-hidden`}
        style={{ background: preview.gradient }}>
        <span className="text-white text-xs font-medium opacity-70 z-10">⏱</span>
      </div>
    )
  }

  if (preview.kind === 'timer_style') {
    return (
      <div className={`${h} flex items-center justify-center`}>
        <div className="relative w-10 h-10">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle cx="20" cy="20" r="16" fill="none" stroke="#4f46e5" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 16 * 0.6} ${2 * Math.PI * 16 * 0.4}`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-base">
            {preview.emoji}
          </span>
        </div>
      </div>
    )
  }

  if (preview.kind === 'sound') {
    return (
      <div className={`${h} flex items-center justify-center`}>
        <span className="text-3xl">{preview.icon}</span>
      </div>
    )
  }

  if (preview.kind === 'pet') {
    return (
      <div className={`${h} flex items-center justify-center`}>
        <span className="text-3xl">{preview.emoji}</span>
      </div>
    )
  }

  return null
}
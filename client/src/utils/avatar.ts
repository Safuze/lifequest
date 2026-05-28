import { SHOP_ITEMS } from '../data/shopItems'

export type AvatarBorder = string // id из SHOP_ITEMS

// Возвращает CSS border для аватара
export function getAvatarBorderStyle(borderId: string, size: 'sm' | 'md' | 'lg' = 'md'): React.CSSProperties {
  const widths = { sm: 2, md: 3, lg: 4 }
  const w = widths[size]

  if (!borderId || borderId === 'none') return {}

  const borders: Record<string, React.CSSProperties> = {
    border_silver: { border: `${w}px solid #94a3b8`, boxShadow: '0 0 8px rgba(148,163,184,0.4)' },
    border_gold:   { border: `${w}px solid #f59e0b`, boxShadow: '0 0 10px rgba(245,158,11,0.5)' },
    border_purple: { border: `${w}px solid #a855f7`, boxShadow: '0 0 12px rgba(168,85,247,0.5)' },
    border_fire:   { border: `${w}px solid #ef4444`, boxShadow: '0 0 12px rgba(239,68,68,0.5)' },
    border_ice:    { border: `${w}px solid #06b6d4`, boxShadow: '0 0 12px rgba(6,182,212,0.5)' },
    border_rainbow: {
      // Радужная обводка через outline + box-shadow
      outline: `${w}px solid transparent`,
      boxShadow: `0 0 0 ${w}px transparent`,
      background: 'transparent',
    },
  }

  if (borderId === 'border_rainbow') {
    // Для радужной используем псевдоэлемент через className
    return {}
  }

  return borders[borderId] || {}
}

// CSS класс для радужной обводки
export function getAvatarBorderClass(borderId: string): string {
  if (borderId === 'border_rainbow') return 'rainbow-border'
  return ''
}

export function getProfileBgData(bgId: string) {
  if (!bgId || bgId === 'default') return null

  const item = SHOP_ITEMS.find(
    (i: any) => i.category === 'background' && i.id === bgId
  )

  return item?.background || null
}

export function getProfileBgStyle(bgId: string): React.CSSProperties {
  const bg = getProfileBgData(bgId)

  if (!bg) {
    return {
      backgroundColor: '#0f172a',
    }
  }

  if (bg.type === 'gradient') {
    return {
      background: bg.value,
    }
  }

  if (bg.type === 'image') {
    return {
      backgroundImage: `url(${bg.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }
  }

  return {
    backgroundColor: '#0f172a',
  }
}

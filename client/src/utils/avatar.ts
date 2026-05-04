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
      // Используем CSS переменную для градиента через border-image
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

// Стиль фона профиля
export function getProfileBgStyle(bgId: string): React.CSSProperties {
  const bgs: Record<string, React.CSSProperties> = {
    default:     { backgroundColor: '#0f172a' },
    bg_midnight: { background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
    bg_forest:   { background: 'linear-gradient(135deg, #1a2f1a, #2d4a2d, #0f172a)' },
    bg_sunset:   { background: 'linear-gradient(135deg, #f093fb, #f5576c, #4facfe)' },
    bg_ocean:    { background: 'linear-gradient(135deg, #43b89c, #0c1a2e, #1a5276)' },
    bg_aurora:   { background: 'linear-gradient(135deg, #a8edea, #fed6e3, #d299c2)' },
    bg_galaxy:   { background: 'linear-gradient(135deg, #0a0a1a, #1a0a2e, #2d1b69, #0a0a1a)' },
  }
  return bgs[bgId] || bgs.default
}
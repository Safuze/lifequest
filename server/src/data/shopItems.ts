export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type ItemCategory = 'avatar_border' | 'profile_bg' | 'booster_temp' | 'perk_permanent'

export interface ShopItem {
  id: string
  category: ItemCategory
  name: string
  description: string
  icon: string
  price: number
  rarity: ItemRarity
  preview?: string // css-класс или значение для превью
  // Конфиги для бустеров/перков
  boosterConfig?: {
    type: 'xp_boost' | 'gold_boost' | 'combo_boost'
    multiplier: number
    durationMinutes: number
    stackable: boolean
  }
  perkConfig?: {
    type: 'xp_bonus' | 'gold_bonus'
    bonusPercent: number
  }
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Обводки аватара ──
  {
    id: 'border_silver',
    category: 'avatar_border',
    name: 'Серебряная',
    description: 'Элегантная серебряная обводка',
    icon: '⚪',
    price: 100,
    rarity: 'common',
    preview: '#94a3b8',
  },
  {
    id: 'border_gold',
    category: 'avatar_border',
    name: 'Золотая',
    description: 'Блестящая золотая обводка',
    icon: '🟡',
    price: 300,
    rarity: 'rare',
    preview: '#f59e0b',
  },
  {
    id: 'border_purple',
    category: 'avatar_border',
    name: 'Фиолетовая',
    description: 'Мистическая фиолетовая обводка',
    icon: '🟣',
    price: 600,
    rarity: 'epic',
    preview: '#a855f7',
  },
  {
    id: 'border_rainbow',
    category: 'avatar_border',
    name: 'Радужная',
    description: 'Переливающаяся радужная обводка',
    icon: '🌈',
    price: 1500,
    rarity: 'legendary',
    preview: 'rainbow',
  },
  {
    id: 'border_fire',
    category: 'avatar_border',
    name: 'Огненная',
    description: 'Пылающая огненная обводка',
    icon: '🔥',
    price: 800,
    rarity: 'epic',
    preview: '#ef4444',
  },
  {
    id: 'border_ice',
    category: 'avatar_border',
    name: 'Ледяная',
    description: 'Кристальная ледяная обводка',
    icon: '❄️',
    price: 800,
    rarity: 'epic',
    preview: '#06b6d4',
  },

  // ── Фоны профиля ──
  {
    id: 'bg_midnight',
    category: 'profile_bg',
    name: 'Полночь',
    description: 'Тёмно-синий звёздный фон',
    icon: '🌌',
    price: 200,
    rarity: 'common',
    preview: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
  },
  {
    id: 'bg_forest',
    category: 'profile_bg',
    name: 'Лес',
    description: 'Спокойный зелёный фон',
    icon: '🌲',
    price: 200,
    rarity: 'common',
    preview: 'linear-gradient(135deg, #1a2f1a, #2d4a2d, #0f172a)',
  },
  {
    id: 'bg_sunset',
    category: 'profile_bg',
    name: 'Закат',
    description: 'Тёплый закатный фон',
    icon: '🌅',
    price: 400,
    rarity: 'rare',
    preview: 'linear-gradient(135deg, #f093fb, #f5576c, #4facfe)',
  },
  {
    id: 'bg_ocean',
    category: 'profile_bg',
    name: 'Океан',
    description: 'Глубокий океанский фон',
    icon: '🌊',
    price: 400,
    rarity: 'rare',
    preview: 'linear-gradient(135deg, #43b89c, #0c1a2e, #1a5276)',
  },
  {
    id: 'bg_aurora',
    category: 'profile_bg',
    name: 'Аврора',
    description: 'Переливающееся северное сияние',
    icon: '🌠',
    price: 1000,
    rarity: 'epic',
    preview: 'linear-gradient(135deg, #a8edea, #fed6e3, #d299c2)',
  },
  {
    id: 'bg_galaxy',
    category: 'profile_bg',
    name: 'Галактика',
    description: 'Величественный космический фон',
    icon: '🌌',
    price: 2000,
    rarity: 'legendary',
    preview: 'linear-gradient(135deg, #0a0a1a, #1a0a2e, #2d1b69, #0a0a1a)',
  },

  // ── Временные бустеры ──
  {
    id: 'boost_xp_30',
    category: 'booster_temp',
    name: 'XP x2 на 30 минут',
    description: 'Удваивает все получаемые XP на 30 минут',
    icon: '⚡',
    price: 125,
    rarity: 'common',
    preview: '#6366f1',
    boosterConfig: { type: 'xp_boost', multiplier: 2.0, durationMinutes: 30, stackable: false },
  },
  {
    id: 'boost_gold_30',
    category: 'booster_temp',
    name: 'Золото x2 на 30 минут',
    description: 'Удваивает всё получаемое золото на 30 минут',
    icon: '💰',
    price: 150,
    rarity: 'common',
    preview: '#f59e0b',
    boosterConfig: { type: 'gold_boost', multiplier: 2.0, durationMinutes: 30, stackable: false },
  },
  {
    id: 'boost_combo_60',
    category: 'booster_temp',
    name: 'Комбо x2 на 60 минут',
    description: 'Удваивает XP и золото на 60 минут',
    icon: '🚀',
    price: 450,
    rarity: 'rare',
    preview: '#22c55e',
    boosterConfig: { type: 'combo_boost', multiplier: 2.0, durationMinutes: 60, stackable: false },
  },
  {
    id: 'boost_xp_180',
    category: 'booster_temp',
    name: 'XP x3 на 3 часа',
    description: 'Утраивает все XP на 3 часа. Редкий эффект!',
    icon: '🌟',
    price: 900,
    rarity: 'epic',
    preview: '#a855f7',
    boosterConfig: { type: 'xp_boost', multiplier: 3.0, durationMinutes: 180, stackable: false },
  },

  // ── Постоянные перки ──
  {
    id: 'perk_xp',
    category: 'perk_permanent',
    name: 'Мастер XP',
    description: 'Увеличивает весь получаемый XP',
    icon: '📈',
    price: 500,
    rarity: 'rare',
    preview: '#6366f1',
    perkConfig: {
      type: 'xp_bonus',
      bonusPercent: 10,
    },
  },
  {
    id: 'perk_gold',
    category: 'perk_permanent',
    name: 'Мастер золота',
    description: 'Увеличивает всё получаемое золото',
    icon: '💎',
    price: 500,
    rarity: 'rare',
    preview: '#f59e0b',
    perkConfig: {
      type: 'gold_bonus',
      bonusPercent: 10,
    },
  },

]

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find(item => item.id === id)
}
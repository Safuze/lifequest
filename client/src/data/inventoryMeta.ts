// Метаданные для всех предметов инвентаря
// Объединяет: shopItems (обводки, фоны профиля), помодоро-предметы (стили таймера, фоны, звуки)

export type InventoryItemType =
  | 'avatar_border'
  | 'profile_bg'
  | 'timer'      // стиль таймера помодоро
  | 'background' // фон помодоро
  | 'sound'      // звук помодоро
  | 'pet'

export interface InventoryMeta {
  id: string
  name: string
  typeLabel: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  preview: PreviewData
}

export type PreviewData =
  | { kind: 'avatar_border'; color: string; isRainbow?: boolean }
  | { kind: 'profile_bg';    gradient: string }
  | { kind: 'timer_style';   emoji: string; label: string }
  | { kind: 'pomodoro_bg';   gradient: string; label: string }
  | { kind: 'sound';         icon: string; label: string }
  | { kind: 'pet';           emoji: string }

const TYPE_LABELS: Record<InventoryItemType, string> = {
  avatar_border: 'Обводка аватара',
  profile_bg:    'Фон профиля',
  timer:         'Стиль таймера',
  background:    'Фон помодоро',
  sound:         'Звук помодоро',
  pet:           'Питомец',
}

// Полный каталог всех покупаемых предметов с метаданными
const INVENTORY_CATALOG: InventoryMeta[] = [
  // ── Обводки аватара ──
  {
    id: 'border_silver',
    name: 'Серебряная',
    typeLabel: TYPE_LABELS.avatar_border,
    rarity: 'common',
    preview: { kind: 'avatar_border', color: '#94a3b8' },
  },
  {
    id: 'border_gold',
    name: 'Золотая',
    typeLabel: TYPE_LABELS.avatar_border,
    rarity: 'rare',
    preview: { kind: 'avatar_border', color: '#f59e0b' },
  },
  {
    id: 'border_purple',
    name: 'Фиолетовая',
    typeLabel: TYPE_LABELS.avatar_border,
    rarity: 'epic',
    preview: { kind: 'avatar_border', color: '#a855f7' },
  },
  {
    id: 'border_fire',
    name: 'Огненная',
    typeLabel: TYPE_LABELS.avatar_border,
    rarity: 'epic',
    preview: { kind: 'avatar_border', color: '#ef4444' },
  },
  {
    id: 'border_ice',
    name: 'Ледяная',
    typeLabel: TYPE_LABELS.avatar_border,
    rarity: 'epic',
    preview: { kind: 'avatar_border', color: '#06b6d4' },
  },
  {
    id: 'border_rainbow',
    name: 'Радужная',
    typeLabel: TYPE_LABELS.avatar_border,
    rarity: 'legendary',
    preview: { kind: 'avatar_border', color: '', isRainbow: true },
  },

  // ── Фоны профиля ──
  {
    id: 'bg_midnight',
    name: 'Полночь',
    typeLabel: TYPE_LABELS.profile_bg,
    rarity: 'common',
    preview: { kind: 'profile_bg', gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  },
  {
    id: 'bg_forest',
    name: 'Лес',
    typeLabel: TYPE_LABELS.profile_bg,
    rarity: 'common',
    preview: { kind: 'profile_bg', gradient: 'linear-gradient(135deg, #1a2f1a, #2d4a2d, #0f172a)' },
  },
  {
    id: 'bg_sunset',
    name: 'Закат',
    typeLabel: TYPE_LABELS.profile_bg,
    rarity: 'rare',
    preview: { kind: 'profile_bg', gradient: 'linear-gradient(135deg, #f093fb, #f5576c, #4facfe)' },
  },
  {
    id: 'bg_ocean',
    name: 'Океан',
    typeLabel: TYPE_LABELS.profile_bg,
    rarity: 'rare',
    preview: { kind: 'profile_bg', gradient: 'linear-gradient(135deg, #43b89c, #0c1a2e, #1a5276)' },
  },
  {
    id: 'bg_aurora',
    name: 'Аврора',
    typeLabel: TYPE_LABELS.profile_bg,
    rarity: 'epic',
    preview: { kind: 'profile_bg', gradient: 'linear-gradient(135deg, #a8edea, #fed6e3, #d299c2)' },
  },
  {
    id: 'bg_galaxy',
    name: 'Галактика',
    typeLabel: TYPE_LABELS.profile_bg,
    rarity: 'legendary',
    preview: { kind: 'profile_bg', gradient: 'linear-gradient(135deg, #0a0a1a, #1a0a2e, #2d1b69, #0a0a1a)' },
  },

  // ── Стили таймера (помодоро) ──
  {
    id: 'snail',
    name: 'Улитка',
    typeLabel: TYPE_LABELS.timer,
    rarity: 'common',
    preview: { kind: 'timer_style', emoji: '🐌', label: 'Улитка 🐌' },
  },
  {
    id: 'horse',
    name: 'Лошадь',
    typeLabel: TYPE_LABELS.timer,
    rarity: 'rare',
    preview: { kind: 'timer_style', emoji: '🐎', label: 'Лошадь 🐎' },
  },
  {
    id: 'cheetah',
    name: 'Гепард',
    typeLabel: TYPE_LABELS.timer,
    rarity: 'epic',
    preview: { kind: 'timer_style', emoji: '🐆', label: 'Гепард 🐆' },
  },
  {
    id: 'hourglass',
    name: 'Песочные часы',
    typeLabel: TYPE_LABELS.timer,
    rarity: 'legendary',
    preview: { kind: 'timer_style', emoji: '⏳', label: 'Песочные часы' },
  },

  // ── Фоны помодоро ──
  {
    id: 'forest',
    name: 'Лес',
    typeLabel: TYPE_LABELS.background,
    rarity: 'common',
    preview: { kind: 'pomodoro_bg', gradient: 'linear-gradient(135deg, #1a2f1a 0%, #0f172a 100%)', label: 'Лес' },
  },
  {
    id: 'ocean',
    name: 'Океан',
    typeLabel: TYPE_LABELS.background,
    rarity: 'rare',
    preview: { kind: 'pomodoro_bg', gradient: 'linear-gradient(135deg, #0c1a2e 0%, #0f172a 100%)', label: 'Океан' },
  },
  {
    id: 'sunset',
    name: 'Закат',
    typeLabel: TYPE_LABELS.background,
    rarity: 'epic',
    preview: { kind: 'pomodoro_bg', gradient: 'linear-gradient(135deg, #2d1b1b 0%, #0f172a 100%)', label: 'Закат' },
  },
  {
    id: 'space',
    name: 'Космос',
    typeLabel: TYPE_LABELS.background,
    rarity: 'legendary',
    preview: { kind: 'pomodoro_bg', gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)', label: 'Космос' },
  },

  // ── Звуки помодоро ──
  {
    id: 'white',
    name: 'Белый шум',
    typeLabel: TYPE_LABELS.sound,
    rarity: 'common',
    preview: { kind: 'sound', icon: '📻', label: 'Белый шум' },
  },
  {
    id: 'lofi',
    name: 'Lo-fi',
    typeLabel: TYPE_LABELS.sound,
    rarity: 'common',
    preview: { kind: 'sound', icon: '🎵', label: 'Lo-fi' },
  },
  {
    id: 'nature',
    name: 'Природа',
    typeLabel: TYPE_LABELS.sound,
    rarity: 'rare',
    preview: { kind: 'sound', icon: '🌿', label: 'Природа' },
  },
  {
    id: 'waves',
    name: 'Волны',
    typeLabel: TYPE_LABELS.sound,
    rarity: 'rare',
    preview: { kind: 'sound', icon: '🌊', label: 'Волны' },
  },
  {
    id: 'rain',
    name: 'Дождь',
    typeLabel: TYPE_LABELS.sound,
    rarity: 'epic',
    preview: { kind: 'sound', icon: '🌧️', label: 'Дождь' },
  },
  {
    id: 'fire',
    name: 'Огонь',
    typeLabel: TYPE_LABELS.sound,
    rarity: 'epic',
    preview: { kind: 'sound', icon: '🔥', label: 'Огонь' },
  },
  {
    id: 'night',
    name: 'Ночь',
    typeLabel: TYPE_LABELS.sound,
    rarity: 'legendary',
    preview: { kind: 'sound', icon: 'ы', label: 'Ночь' },
  },
]

export function getInventoryMeta(itemId: string): InventoryMeta | null {
  return INVENTORY_CATALOG.find(m => m.id === itemId) || null
}

export const RARITY_COLORS: Record<string, string> = {
  common:    '#22c55e',
  rare:      '#4f46e5',
  epic:      '#a855f7',
  legendary: '#f59e0b',
}

export const RARITY_LABELS: Record<string, string> = {
  common:    'Обычная',
  rare:      'Редкая',
  epic:      'Эпическая',
  legendary: 'Легендарная',
}
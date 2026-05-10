export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Pet {
  id: string
  name: string
  emoji: string
  rarity: PetRarity
  price: number
  description: string
}

export const PETS: Pet[] = [
  // Common
  { id: 'pet_frog',    name: 'Лягушонок',   emoji: '🐸', rarity: 'common',    price: 150,  description: 'Весёлый зелёный друг. Всегда рад тебя видеть!' },
  { id: 'pet_chicken', name: 'Цыплёнок',    emoji: '🐥', rarity: 'common',    price: 200,  description: 'Маленький, но гордый. Поддерживает тебя!' },
  { id: 'pet_hamster', name: 'Хомячок',     emoji: '🐹', rarity: 'common',    price: 250,  description: 'Запасается целями, как семечками.' },
  { id: 'pet_rabbit',  name: 'Кролик',      emoji: '🐰', rarity: 'common',    price: 250,  description: 'Быстрый как твои задачи!' },
  // Rare
  { id: 'pet_fox',     name: 'Лисица',      emoji: '🦊', rarity: 'rare',      price: 600,  description: 'Хитрая и умная. Знает все твои секреты.' },
  { id: 'pet_wolf',    name: 'Волк',         emoji: '🐺', rarity: 'rare',      price: 700,  description: 'Одиночка, но надёжный напарник.' },
  { id: 'pet_owl',     name: 'Сова',         emoji: '🦉', rarity: 'rare',      price: 800,  description: 'Мудрая птица. Помогает не терять фокус.' },
  { id: 'pet_panda',   name: 'Панда',        emoji: '🐼', rarity: 'rare',      price: 750,  description: 'Редкий и спокойный. Мастер дзена.' },
  // Epic
  { id: 'pet_phoenix', name: 'Феникс',      emoji: '🦅', rarity: 'epic',      price: 1500, description: 'Возрождается из пепла, как твой стрик.' },
  { id: 'pet_tiger',   name: 'Тигр',         emoji: '🐯', rarity: 'epic',      price: 1800, description: 'Свирепый и целеустремлённый. Не отвлекается.' },
  { id: 'pet_whale',   name: 'Кит',          emoji: '🐳', rarity: 'epic',      price: 2000, description: 'Величественный и спокойный. Плывёт к цели.' },
  // Legendary
  { id: 'pet_dragon',  name: 'Дракон',      emoji: '🐉', rarity: 'legendary', price: 5000, description: 'Легендарный страж твоей продуктивности.' },
  { id: 'pet_unicorn', name: 'Единорог',    emoji: '🦄', rarity: 'legendary', price: 4000, description: 'Мифическое существо. Символ достижений.' },
]

export const RARITY_COLORS: Record<PetRarity, string> = {
  common:    '#22c55e',
  rare:      '#4f46e5',
  epic:      '#a855f7',
  legendary: '#f59e0b',
}

export const RARITY_LABELS: Record<PetRarity, string> = {
  common:    'Обычный',
  rare:      'Редкий',
  epic:      'Эпический',
  legendary: 'Легендарный',
}

export function getPet(id: string): Pet | undefined {
  return PETS.find(p => p.id === id)
}
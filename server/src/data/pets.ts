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
  { id: 'pet_frog',    name: 'Лягушонок',   emoji: '🐸', rarity: 'common',    price: 100,  description: 'Весёлый зелёный друг. Всегда рад тебя видеть!' },
  { id: 'pet_hamster', name: 'Хомячок',     emoji: '🐹', rarity: 'common',    price: 150,  description: 'Запасается целями, как семечками.' },
  { id: 'pet_rabbit',  name: 'Кролик',      emoji: '🐰', rarity: 'common',    price: 200,  description: 'Быстрый как твои задачи!' },
  { id: 'pet_fox',     name: 'Лисица',      emoji: '🦊', rarity: 'common',      price: 300,  description: 'Хитрая и умная. Знает все твои секреты.' },

  // Rare
  { id: 'pet_wolf',    name: 'Волк',         emoji: '🐺', rarity: 'rare',      price: 400,  description: 'Одиночка, но надёжный напарник.' },
  { id: 'pet_owl',     name: 'Сова',         emoji: '🦉', rarity: 'rare',      price: 600,  description: 'Мудрая птица. Помогает не терять фокус.' },
  { id: 'pet_panda',   name: 'Панда',        emoji: '🐼', rarity: 'rare',      price: 800,  description: 'Редкий и спокойный. Мастер дзена.' },
  { id: 'pet_tiger',   name: 'Тигр',         emoji: '🐯', rarity: 'rare',      price: 1000, description: 'Свирепый и целеустремлённый. Не отвлекается.' },

  // Epic
  { id: 'pet_phoenix', name: 'Феникс',      emoji: '🦅', rarity: 'epic',      price: 1500, description: 'Возрождается из пепла, как твой стрик.' },
  { id: 'pet_whale',   name: 'Кит',          emoji: '🐳', rarity: 'epic',      price: 2000, description: 'Величественный и спокойный. Плывёт к цели.' },
  { id: 'pet_unicorn', name: 'Единорог',    emoji: '🦄', rarity: 'epic', price: 2500, description: 'Мифическое существо. Символ достижений.' },

  // Legendary
  { id: 'pet_dragon',  name: 'Дракон',      emoji: '🐉', rarity: 'legendary', price: 5000, description: 'Легендарный страж твоей продуктивности.' },
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
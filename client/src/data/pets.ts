export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Pet {
  id: string
  name: string
  image: string
  rarity: PetRarity
  price: number
  description: string
}

export const PETS: Pet[] = [
  // Common
  { id: 'pet_frog',    name: 'Лягушонок',   image: '/pets/frog.png', rarity: 'common',    price: 100,  description: 'Маленький и любопытный спутник' },
  { id: 'pet_hamster', name: 'Хомячок',     image: '/pets/hamster.png', rarity: 'common',    price: 150,  description: 'Запасливый и энергичный' },
  { id: 'pet_cat',  name: 'Кот',      image: '/pets/cat.png', rarity: 'common',    price: 200,  description: 'Независимый любитель уюта' },
  { id: 'pet_dog',  name: 'Пес',      image: '/pets/dog.png', rarity: 'common',    price: 200,  description: 'Верный друг на каждый день' },
  
  // Rare
  { id: 'pet_fox',     name: 'Лисица',      image: '/pets/fox.png', rarity: 'rare',      price: 300,  description: 'Хитрая и ловкая' },
  { id: 'pet_wolf',    name: 'Волк',         image: '/pets/wolf.png', rarity: 'rare',      price: 400,  description: 'Сильный и уверенный одиночка' },
  { id: 'pet_owl',     name: 'Сова',         image: '/pets/owl.png', rarity: 'rare',      price: 600,  description: 'Мудрый хранитель ночи. Помогает не терять фокус' },
  { id: 'pet_panda',   name: 'Панда',        image: '/pets/panda.png', rarity: 'rare',      price: 800,  description: 'Спокойный любитель отдыха и мастер дзена' },

  // Epic
  { id: 'pet_tiger',   name: 'Тигр',         image: '/pets/tiger.png', rarity: 'epic',      price: 1000, description: 'Свирепый и целеустремлённый. Не отвлекается' },
  { id: 'pet_phoenix', name: 'Феникс',      image: '/pets/phoenix.png', rarity: 'epic',      price: 1500, description: 'Возрождается из пепла, чтобы трудится' },
  { id: 'pet_unicorn', name: 'Единорог',    image: '/pets/unicorn.png', rarity: 'epic', price: 2500, description: 'Мифическое создание с чистой душой и символ достижений' },

  // Legendary
  { id: 'pet_dragon',  name: 'Дракон',      image: '/pets/dragon.png', rarity: 'legendary', price: 5000, description: 'Могущественный повелитель огня и легендарный страж продуктивности' },
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
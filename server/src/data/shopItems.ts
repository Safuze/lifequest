import type { TimerStyle } from '../../../shared/types/pomodoro'
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type ItemCategory = 'avatar_border' | 'background' | 'booster_temp' | 'perk_permanent' | 'pet' | 'pomodoro_sound' | 'pomodoro_timer'

type ProfileBackground =
  | {
      type: 'gradient'
      value: string
    }
  | {
      type: 'image'
      value: string
    }
  | {
      type: 'video'
      value: string
      poster?: string
    } 

    

export interface ShopItem {
  id: string
  category: ItemCategory
  name: string
  description: string
  price: number
  rarity: ItemRarity
  preview?: string // css-класс или значение для превью
  background?: ProfileBackground
  soundConfig?: {
    soundId: string
    src: string | null
    icon: string
  }

  timerStyleConfig?: {
    style: TimerStyle
    icon: string
  }
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
    price: 100,
    rarity: 'common',
    preview: '#94a3b8',
  },
  {
    id: 'border_gold',
    category: 'avatar_border',
    name: 'Золотая',
    description: 'Блестящая золотая обводка',
    price: 300,
    rarity: 'rare',
    preview: '#f59e0b',
  },
  {
    id: 'border_fire',
    category: 'avatar_border',
    name: 'Огненная',
    description: 'Пылающая огненная обводка',
    price: 500,
    rarity: 'rare',
    preview: '#ef4444',
  },
  {
    id: 'border_purple',
    category: 'avatar_border',
    name: 'Неоновая',
    description: 'Мистическая неоновая обводка',
    price: 800,
    rarity: 'epic',
    preview: '#a855f7',
  },
  {
    id: 'border_ice',
    category: 'avatar_border',
    name: 'Ледяная',
    description: 'Кристальная ледяная обводка',
    price: 1100,
    rarity: 'epic',
    preview: '#06b6d4',
  },
  {
    id: 'border_rainbow',
    category: 'avatar_border',
    name: 'Радужная',
    description: 'Переливающаяся радужная обводка',
    price: 1500,
    rarity: 'legendary',
    preview: 'rainbow',
  },

  // Фоны
  {
    id: 'bg_forest',
    category: 'background',
    name: 'Тёплый камин',
    description: 'Яркий фон огненных цветов',
    price: 150,
    rarity: 'common',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #2b0f0a 0%, #5c1f12 25%, #a33a12 50%, #d96c1a 75%, #ffd36b 100%)'
    }
  },
  {
    id: 'bg_aurora',
    category: 'background',
    name: 'Аврора',
    description: 'Переливающееся северное сияние',
    price: 200,
    rarity: 'common',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #a8edea, #fed6e3, #d299c2)'
    }
  },
  {
    id: 'bg_nature',
    category: 'background',
    name: 'Природа',
    description: 'Ярко зеленный фон',
    price: 250,
    rarity: 'common',
    background: {
      type: 'image',
      value: '/sounds/nature.jpg'
    }
  },
  {
    id: 'bg_midnight',
    category: 'background',
    name: 'Полночь',
    description: 'Тёмно-синий облачный фон',
    price: 300,
    rarity: 'common',
    background: {
      type: 'image',
      value: '/sounds/night.jpg'
    }
  },
  {
    id: 'bg_minecraft',
    category: 'background',
    name: 'Майнкрафт',
    description: 'Пиксельный живой фон в стиле Minecraft',
    price: 400,
    rarity: 'rare',
   
    background: {
      type: 'video',
      value: '/video/minecraft.mp4',
      poster: '/backgrounds/minecraft.png'
    }
  },
  {
    id: 'bg_eclipse',
    category: 'background',
    name: 'Затмение',
    description: 'Живой фон яркого светящегося затмения',
    price: 600,
    rarity: 'rare',
   
    background: {
      type: 'video',
      value: '/backgrounds/eclipse.mp4',
      poster: '/backgrounds/eclipse.png'
    }
  },
  {
    id: 'bg_house-in-the-mountains',
    category: 'background',
    name: 'Исландский пейзаж',
    description: 'Домик в горах на живом фоне',
    price: 800,
    rarity: 'rare',
   
    background: {
      type: 'video',
      value: '/backgrounds/house-in-the-mountains.mp4',
      poster: '/backgrounds/house-in-the-mountains.png'
    }
  },
  {
    id: 'bg_japan',
    category: 'background',
    name: 'Япония',
    description: 'Живой фон в японском стиле',
    price: 1000,
    rarity: 'epic',
   
    background: {
      type: 'video',
      value: '/backgrounds/japan.mp4',
      poster: '/backgrounds/japan.png'
    }
  },
  {
    id: 'bg_galaxy',
    category: 'background',
    name: 'Глубокий космос',
    description: 'Космический живой фон',
    price: 1300,
    rarity: 'epic',
    background: {
      type: 'video',
      value: '/backgrounds/space.mp4',
      poster: '/backgrounds/space.png'
    }
  },
  {
    id: 'bg_black_hole',
    category: 'background',
    name: 'Черная дыра',
    description: 'Живой фон черной дыры в открытом космосе',
    price: 1600,
    rarity: 'epic',
    background: {
      type: 'video',
      value: '/backgrounds/black-hole.mp4',
      poster: '/backgrounds/black-hole.png'
    }
  },
  {
    id: 'bg_ocean',
    category: 'background',
    name: 'Океан',
    description: 'Глубокий океанский живой фон',
    price: 2000,
    rarity: 'legendary',
   
    background: {
      type: 'video',
      value: '/backgrounds/ocean.mp4',
      poster: '/backgrounds/ocean.png'
    }
  },
  {
    id: 'bg_luminousBloom',
    category: 'background',
    name: 'Зачарованное дерево',
    description: 'Светящееся цветение на живом синем фоне',
    price: 2500,
    rarity: 'legendary',
   
    background: {
      type: 'video',
      value: '/backgrounds/luminousBloom.mp4',
      poster: '/backgrounds/luminousBloom.png'
    }
  },

  // Помодоро звук
  {
    id: 'sound_white',
    category: 'pomodoro_sound',
    name: 'Белый шум',
    description: 'Белый шум',
    price: 100,
    rarity: 'common',
    preview: "/sounds/white.jpg",
    soundConfig: {
      soundId: 'white',
      src: '/sounds/white.mp3',
      icon: '📻'
    }
  },
  {
    id: 'sound_lofi',
    category: 'pomodoro_sound',
    name: 'Lo-fi',
    description: 'Успокаивающая музыка',
    price: 150,
    rarity: 'common',
    preview: "/sounds/lofi.jpg",
    soundConfig: {
      soundId: 'lofi',
      src: '/sounds/lofi.mp3',
      icon: '🎵'
    }
  },
  {
    id: 'sound_nature',
    category: 'pomodoro_sound',
    name: 'Природа',
    description: 'Успокаивающие пение птиц на природе',
    price: 200,
    rarity: 'common',
    preview: "/sounds/nature.jpg",
    soundConfig: {
      soundId: 'nature',
      src: '/sounds/nature.mp3',
      icon: '🌿'
    }
  },
  {
    id: 'sound_waves',
    category: 'pomodoro_sound',
    name: 'Волны',
    description: 'Успокаивающие звуки моря и волны',
    price: 250,
    rarity: 'common',
    preview: "/sounds/waves.jpg",
    soundConfig: {
      soundId: 'waves',
      src: '/sounds/waves.mp3',
      icon: '🌊'
    }
  },
  {
    id: 'sound_night',
    category: 'pomodoro_sound',
    name: 'Ночь',
    description: 'Успокаивающие звуки ночью',
    price: 300,
    rarity: 'rare',
    preview: "/sounds/night.jpg",
    soundConfig: {
      soundId: 'night',
      src: '/sounds/night.mp3',
      icon: '🌙'
    }
  },
  {
    id: 'sound_rain',
    category: 'pomodoro_sound',
    name: 'Дождь',
    description: 'Успокаивающий дождь',
    price: 400,
    rarity: 'rare',
    preview: "/sounds/rain.jpg",
    soundConfig: {
      soundId: 'rain',
      src: '/sounds/rain.mp3',
      icon: '🌧️'
    }
  },
{
    id: 'sound_fire',
    category: 'pomodoro_sound',
    name: 'Огонь',
    description: 'Успокаивающие звуки костра',
    price: 500,
    rarity: 'rare',
    preview: "/sounds/fire.jpg",
    soundConfig: {
      soundId: 'fire',
      src: '/sounds/fire.mp3',
      icon: '🔥'
    }
  },

  // Стиль таймера
  {
    id: 'timer_snail',
    category: 'pomodoro_timer',
    name: 'Улитка',
    description: 'Анимированный таймер',
    price: 100,
    rarity: 'common',
    preview: "/timers/snail.jpg",
    timerStyleConfig: {
      style: 'snail',
      icon: '🐌'
    }
  },
  {
    id: 'timer_horse',
    category: 'pomodoro_timer',
    name: 'Лошадь',
    description: 'Анимированный таймер',
    price: 200,
    rarity: 'common',
    preview: "/timers/horse.jpg",
    timerStyleConfig: {
      style: 'horse',
      icon: '🐎'
    }
  },
  {
    id: 'timer_cheetah',
    category: 'pomodoro_timer',
    name: 'Гепард',
    description: 'Анимированный таймер',
    price: 300,
    rarity: 'rare',
    preview: "/timers/cheetah.jpg",
    timerStyleConfig: {
      style: 'cheetah',
      icon: '🐆'
    }
  },
  {
    id: 'timer_clock',
    category: 'pomodoro_timer',
    name: 'Механические часы',
    description: 'Анимированный таймер',
    price: 500,
    rarity: 'rare',
    preview: "/timers/clock.png",
    timerStyleConfig: {
      style: 'clock',
      icon: '🕗'
    }
  },
  {
    id: 'timer_hourglass',
    category: 'pomodoro_timer',
    name: 'Песочные часы',
    description: 'Анимированный таймер',
    price: 800,
    rarity: 'epic',
    preview: "/timers/hourglass.jpg",
    timerStyleConfig: {
      style: 'hourglass',
      icon: '⏳'
    }
  },

  // ── Временные бустеры ──
  {
    id: 'boost_xp_30',
    category: 'booster_temp',
    name: 'XP x2 на 30 минут',
    description: 'Удваивает все получаемые XP на 30 минут',
    price: 125,
    rarity: 'common',
    preview: '#6366f1',
    boosterConfig: { type: 'xp_boost', multiplier: 2.0, durationMinutes: 30, stackable: false },
  },
  {
    id: 'boost_gold_30',
    category: 'booster_temp',
    name: 'Баллы x2 на 30 минут',
    description: 'Удваивает всё получаемые баллы на 30 минут',
    price: 150,
    rarity: 'common',
    preview: '#f59e0b',
    boosterConfig: { type: 'gold_boost', multiplier: 2.0, durationMinutes: 30, stackable: false },
  },
  {
    id: 'boost_combo_60',
    category: 'booster_temp',
    name: 'Комбо x2 на 60 минут',
    description: 'Удваивает XP и баллы на 60 минут',
    price: 450,
    rarity: 'rare',
    preview: '#22c55e',
    boosterConfig: { type: 'combo_boost', multiplier: 2.0, durationMinutes: 60, stackable: false },
  },
  {
    id: 'boost_xp_180',
    category: 'booster_temp',
    name: 'XP x3 на 3 часа',
    description: 'Утраивает все XP на 3 часа',
    price: 900,
    rarity: 'epic',
    preview: '#a855f7',
    boosterConfig: { type: 'xp_boost', multiplier: 3.0, durationMinutes: 180, stackable: false },
  },

  // ── Постоянные перки ──
  {
    id: 'perk_xp',
    category: 'perk_permanent',
    name: 'Добыча XP',
    description: 'Увеличивает весь получаемый XP',
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
    name: 'Добыча баллов',
    description: 'Увеличивает все получаемые баллы',
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
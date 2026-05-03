import { prisma } from '../prisma'

interface AchievementDef {
  type: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

const ACHIEVEMENTS: AchievementDef[] = [
  // Задачи
  { type: 'tasks_10',    title: 'Решатель',        description: 'Выполнено 10 задач',         icon: '✅', rarity: 'common'    },
  { type: 'tasks_50',    title: 'Продуктивист',     description: 'Выполнено 50 задач',         icon: '⚡', rarity: 'rare'      },
  { type: 'tasks_200',   title: 'Машина задач',     description: 'Выполнено 200 задач',        icon: '🤖', rarity: 'epic'      },

  // Фокус (помодоро)
  { type: 'focus_5h',    title: 'Сосредоточенный',  description: '5 часов в фокусе',           icon: '🎯', rarity: 'common'    },
  { type: 'focus_25h',   title: 'Весь в работе',    description: '25 часов в фокусе',          icon: '🔥', rarity: 'rare'      },
  { type: 'focus_100h',  title: 'Монах фокуса',     description: '100 часов в фокусе',         icon: '🧘', rarity: 'epic'      },
  { type: 'sessions_10', title: 'Первые сессии',    description: '10 помодоро-сессий',          icon: '⏱',  rarity: 'common'    },
  { type: 'sessions_50', title: 'Таймерщик',        description: '50 помодоро-сессий',          icon: '⏰', rarity: 'rare'      },

  // Привычки — стрик
  { type: 'streak_7',    title: 'Первая неделя',    description: '7 дней стрика',              icon: '📅', rarity: 'common'    },
  { type: 'streak_30',   title: 'Месяц силы',       description: '30 дней стрика',             icon: '🗓️', rarity: 'rare'      },
  { type: 'streak_90',   title: 'Квартал',          description: '90 дней стрика',             icon: '💪', rarity: 'epic'      },
  { type: 'streak_365',  title: 'Целый год',        description: '365 дней стрика',            icon: '👑', rarity: 'legendary' },

  // Социальное
  { type: 'friend_1',    title: 'Знакомый',         description: 'Первый друг',                icon: '🤝', rarity: 'common'    },
  { type: 'friend_5',    title: 'Компания',         description: '5 друзей',                   icon: '👥', rarity: 'rare'      },

  // Золото
  { type: 'gold_500',    title: 'Богатей',          description: 'Накоплено 500 монет',        icon: '🪙', rarity: 'rare'      },
  { type: 'gold_2000',   title: 'Казначей',         description: 'Накоплено 2000 монет',       icon: '💰', rarity: 'epic'      },

  // Уровни
  { type: 'level_2',     title: 'Ученик',           description: 'Достигнут уровень Ученик',   icon: '📗', rarity: 'common'    },
  { type: 'level_3',     title: 'Практик',          description: 'Достигнут уровень Практик',  icon: '📘', rarity: 'rare'      },
  { type: 'level_4',     title: 'Эксперт',          description: 'Достигнут уровень Эксперт',  icon: '📙', rarity: 'epic'      },
  { type: 'level_5',     title: 'Мастер',           description: 'Достигнут уровень Мастер',   icon: '📕', rarity: 'epic'      },
  { type: 'level_6',     title: 'Легенда',          description: 'Достигнут уровень Легенда',  icon: '🌟', rarity: 'legendary' },

  // Цели
  { type: 'goal_first',  title: 'Целеустремлённый', description: 'Первая завершённая цель',    icon: '🎯', rarity: 'common'    },
  { type: 'goal_5',      title: 'Многоцелевой',     description: '5 завершённых целей',        icon: '🏹', rarity: 'rare'      },
]

// Главная функция — проверяет и выдаёт достижения пользователю
export async function checkAndAwardAchievements(
  userId: number,
  context: {
    tasksCompleted?: number
    totalPomodoroMin?: number
    sessionsCompleted?: number
    maxStreak?: number
    friendsCount?: number
    currentGold?: number
    currentLevel?: number
    goalsCompleted?: number
  }
): Promise<AchievementDef[]> {
  const newAchievements: AchievementDef[] = []

  const checks: { type: string; condition: boolean }[] = [
    // Задачи
    { type: 'tasks_10',    condition: (context.tasksCompleted ?? 0) >= 10 },
    { type: 'tasks_50',    condition: (context.tasksCompleted ?? 0) >= 50 },
    { type: 'tasks_200',   condition: (context.tasksCompleted ?? 0) >= 200 },

    // Фокус
    { type: 'focus_5h',    condition: (context.totalPomodoroMin ?? 0) >= 300 },
    { type: 'focus_25h',   condition: (context.totalPomodoroMin ?? 0) >= 1500 },
    { type: 'focus_100h',  condition: (context.totalPomodoroMin ?? 0) >= 6000 },
    { type: 'sessions_10', condition: (context.sessionsCompleted ?? 0) >= 10 },
    { type: 'sessions_50', condition: (context.sessionsCompleted ?? 0) >= 50 },

    // Стрик
    { type: 'streak_7',    condition: (context.maxStreak ?? 0) >= 7 },
    { type: 'streak_30',   condition: (context.maxStreak ?? 0) >= 30 },
    { type: 'streak_90',   condition: (context.maxStreak ?? 0) >= 90 },
    { type: 'streak_365',  condition: (context.maxStreak ?? 0) >= 365 },

    // Друзья
    { type: 'friend_1',    condition: (context.friendsCount ?? 0) >= 1 },
    { type: 'friend_5',    condition: (context.friendsCount ?? 0) >= 5 },

    // Золото
    { type: 'gold_500',    condition: (context.currentGold ?? 0) >= 500 },
    { type: 'gold_2000',   condition: (context.currentGold ?? 0) >= 2000 },

    // Уровни
    { type: 'level_2',     condition: (context.currentLevel ?? 0) >= 1 },
    { type: 'level_3',     condition: (context.currentLevel ?? 0) >= 2 },
    { type: 'level_4',     condition: (context.currentLevel ?? 0) >= 3 },
    { type: 'level_5',     condition: (context.currentLevel ?? 0) >= 4 },
    { type: 'level_6',     condition: (context.currentLevel ?? 0) >= 5 },

    // Цели
    { type: 'goal_first',  condition: (context.goalsCompleted ?? 0) >= 1 },
    { type: 'goal_5',      condition: (context.goalsCompleted ?? 0) >= 5 },
  ]

  for (const check of checks) {
    if (!check.condition) continue

    const def = ACHIEVEMENTS.find(a => a.type === check.type)
    if (!def) continue

    // Проверяем не выдано ли уже
    const exists = await prisma.achievement.findUnique({
      where: { userId_type: { userId, type: check.type } }
    })
    if (exists) continue

    // Выдаём
    await prisma.achievement.create({
      data: { userId, type: check.type, title: def.title, description: def.description, icon: def.icon, rarity: def.rarity }
    })
    newAchievements.push(def)
  }

  return newAchievements
}

// Вспомогательная функция — собирает контекст из БД и проверяет достижения
export async function checkAchievementsForUser(userId: number): Promise<AchievementDef[]> {
  const [
    tasksCompleted,
    pomodoroStats,
    habits,
    friendships,
    user,
    goalsCompleted,
  ] = await Promise.all([
    prisma.task.count({ where: { userId, status: 'done' } }),
    prisma.pomodoroSession.aggregate({
      where: { userId, status: 'completed' },
      _sum: { actualDuration: true },
      _count: true,
    }),
    prisma.habit.findMany({ where: { userId }, select: { currentStreak: true } }),
    prisma.friendship.count({ where: { OR: [{ senderId: userId, status: 'accepted' }, { receiverId: userId, status: 'accepted' }] } }),
    prisma.user.findUnique({ where: { id: userId }, select: { gold: true, level: true } }),
    prisma.goal.count({ where: { userId, status: 'completed' } }),
  ])

  const maxStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0)

  return checkAndAwardAchievements(userId, {
    tasksCompleted,
    totalPomodoroMin: pomodoroStats._sum.actualDuration || 0,
    sessionsCompleted: pomodoroStats._count,
    maxStreak,
    friendsCount: friendships,
    currentGold: user?.gold || 0,
    currentLevel: user?.level || 0,
    goalsCompleted,
  })
}
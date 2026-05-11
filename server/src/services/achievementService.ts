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
  { type: 'tasks_1000',  title: 'Легенда задач',     description: 'Выполнено 1000 задач',        icon: '🏆', rarity: 'legendary'},


  // Фокус (помодоро)
  { type: 'focus_5h',    title: 'Сосредоточенный',  description: '5 часов в фокусе',           icon: '🎯', rarity: 'common'    },
  { type: 'focus_25h',   title: 'Весь в работе',    description: '25 часов в фокусе',          icon: '🔥', rarity: 'rare'      },
  { type: 'focus_100h',  title: 'Монах фокуса',     description: '100 часов в фокусе',         icon: '🧘', rarity: 'epic'      },
  { type: 'focus_500h',  title: 'Хранитель времени', description: '500 часов в фокусе',          icon: '⌛', rarity: 'legendary'},
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
  { type: 'friend_25',   title: 'Популярный',       description: '25 друзей',                  icon: '🌟', rarity: 'epic',     },
  { type: 'friend_100',  title: 'Легенда сети',     description: '100 друзей',                 icon: '🌐', rarity: 'legendary' },

  // Золото
  { type: 'gold_500',    title: 'Богатей',          description: 'Накоплено 500 кредитов за всё время',        icon: '🪙', rarity: 'rare'      },
  { type: 'gold_2000',   title: 'Казначей',         description: 'Накоплено 2000 кредитов за всё время',       icon: '💰', rarity: 'epic'      },
  { type: 'gold_10000',  title: 'Меценат',           description: 'Накоплено 10000 кредитов за всё время', icon: '💎', rarity: 'epic',      },
  { type: 'gold_25000',  title: 'Ротшильд',          description: 'Накоплено 25000 кредитов за всё время', icon: '🏦', rarity: 'legendary', },

  // Уровни
  { type: 'level_2',     title: 'Бронза II',           description: 'Достигнут уровень Бронза II',   icon: '🔶🔶', rarity: 'common'    },
  { type: 'level_3',     title: 'Серебро I',          description: 'Достигнут уровень Серебро I',  icon: '⚪', rarity: 'common'      },
  { type: 'level_4',     title: 'Серебро II',          description: 'Достигнут уровень Серебро II',  icon: '⚪⚪', rarity: 'common'      },
  { type: 'level_5',     title: 'Золото I',           description: 'Достигнут уровень Золото I',   icon: '🟡', rarity: 'rare'      },
  { type: 'level_6',     title: 'Золото II',          description: 'Достигнут уровень Золото II',  icon: '🟡🟡', rarity: 'rare' },
  { type: 'level_7',     title: 'Платина I',           description: 'Достигнут уровень Платина I',   icon: '🪨', rarity: 'rare'    },
  { type: 'level_8',     title: 'Платина II',          description: 'Достигнут уровень Платина II',  icon: '🪨🪨', rarity: 'epic'      },
  { type: 'level_9',     title: 'Алмаз I',          description: 'Достигнут уровень Алмаз I',  icon: '💎', rarity: 'epic'      },
  { type: 'level_10',     title: 'Алмаз II',           description: 'Достигнут уровень Алмаз II',   icon: '💎💎', rarity: 'epic'      },
  { type: 'level_11',     title: 'Грандмастер',          description: 'Достигнут уровень Грандмастер',  icon: '⚜️', rarity: 'legendary' },

  // Цели
  { type: 'goal_first',  title: 'Целеустремлённый', description: 'Первая завершённая цель',    icon: '🎯', rarity: 'common'    },
  { type: 'goal_5',      title: 'Многоцелевой',     description: '5 завершённых целей',        icon: '🏹', rarity: 'rare'      },
  { type: 'goal_20',  title: 'Стратег', description: '20 завершённых целей',    icon: '🎯', rarity: 'epic'    },
  { type: 'goal_50',      title: 'Архитектор жизни',     description: '50 завершённых целей',        icon: '🏹', rarity: 'legendary'      },
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
    totalGoldEarned?: number 
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
    { type: 'tasks_1000',  condition: (context.tasksCompleted ?? 0) >= 1000 },

    // Фокус
    { type: 'focus_5h',    condition: (context.totalPomodoroMin ?? 0) >= 300 },
    { type: 'focus_25h',   condition: (context.totalPomodoroMin ?? 0) >= 1500 },
    { type: 'focus_100h',  condition: (context.totalPomodoroMin ?? 0) >= 6000 },
    { type: 'focus_500h',  condition: (context.totalPomodoroMin ?? 0) >= 30000 },

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
    { type: 'friend_25',   condition: (context.friendsCount ?? 0) >= 25  },
    { type: 'friend_100',  condition: (context.friendsCount ?? 0) >= 100 },

    // Золото
    { type: 'gold_500',    condition: (context.totalGoldEarned ?? 0) >= 500 },
    { type: 'gold_2000',   condition: (context.totalGoldEarned ?? 0) >= 2000 },
    { type: 'gold_10000',  condition: (context.totalGoldEarned ?? 0) >= 10000 },
    { type: 'gold_25000',  condition: (context.totalGoldEarned ?? 0) >= 25000 },

    // Уровни
    { type: 'level_2',     condition: (context.currentLevel ?? 0) >= 1 },
    { type: 'level_3',     condition: (context.currentLevel ?? 0) >= 2 },
    { type: 'level_4',     condition: (context.currentLevel ?? 0) >= 3 },
    { type: 'level_5',     condition: (context.currentLevel ?? 0) >= 4 },
    { type: 'level_6',     condition: (context.currentLevel ?? 0) >= 5 },
    { type: 'level_7',     condition: (context.currentLevel ?? 0) >= 6 },
    { type: 'level_8',     condition: (context.currentLevel ?? 0) >= 7 },
    { type: 'level_9',     condition: (context.currentLevel ?? 0) >= 8 },
    { type: 'level_10',     condition: (context.currentLevel ?? 0) >= 9 },
    { type: 'level_11',     condition: (context.currentLevel ?? 0) >= 10 },

    // Цели
    { type: 'goal_first',  condition: (context.goalsCompleted ?? 0) >= 1 },
    { type: 'goal_5',      condition: (context.goalsCompleted ?? 0) >= 5 },
    { type: 'goal_20',     condition: (context.goalsCompleted ?? 0) >= 20 },
    { type: 'goal_50',     condition: (context.goalsCompleted ?? 0) >= 50 },
  ]

  for (const check of checks) {
    if (!check.condition) continue

    const def = ACHIEVEMENTS.find(a => a.type === check.type)
    if (!def) continue

    const exists = await prisma.achievement.findFirst({
      where: { userId, type: check.type }
    })
    if (exists) continue

    // Выдаём
    await prisma.achievement.create({
      data: {
        userId,
        type: check.type,
        title: def.title,
        description: def.description,
        icon: def.icon,
        rarity: def.rarity,
      }
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
    totalGoldEarned,
  ] = await Promise.all([
    prisma.task.count({ where: { userId, status: 'done' } }),
    prisma.pomodoroSession.aggregate({
      where: { userId, status: 'completed' },
      _sum: { actualDuration: true },
      _count: true,
    }),
    prisma.habit.findMany({ where: { userId }, select: { currentStreak: true, bestStreak: true } }),
    prisma.friendship.count({
      where: {
        OR: [
          { senderId: userId, status: 'accepted' },
          { receiverId: userId, status: 'accepted' }
        ]
      }
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { gold: true, level: true } }),
    prisma.goal.count({ where: { userId, status: 'completed' } }),
    // Суммарное заработанное золото из транзакций (не текущий баланс)
    prisma.rewardTransaction.aggregate({
      where: {
        userId,
        rewardType: 'gold',
        amount: {
          gt: 0,
          lt: 100000, // защита от кривых транзакций
        }
      },
      _sum: { amount: true }
    }),
  ])
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak, h.bestStreak), 0)

  return checkAndAwardAchievements(userId, {
    tasksCompleted,
    totalPomodoroMin: pomodoroStats._sum.actualDuration || 0,
    sessionsCompleted: pomodoroStats._count,
    maxStreak,
    friendsCount: friendships,
    totalGoldEarned: totalGoldEarned._sum.amount || 0,
    currentLevel: user?.level || 0,
    goalsCompleted,
  })
}
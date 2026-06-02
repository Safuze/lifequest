import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'
import { subDays } from 'date-fns'
import { checkAchievementsForUser } from '../services/achievementService'
import { getLevelFromXp, getLevelName } from '../services/levelService'
import { applyBoosters } from '../services/boosterService'
import { updateUserChallenges } from '../services/challengeService'
import { startOfLocalDay, endOfLocalDay, localDateKey, startOfLocalWeek } from '../utils/date'
export const createHabitSchema = z.object({
  title: z.string().min(1).max(100),
  type: z.enum(['positive', 'anti']),
  trackingType: z.enum(['discrete', 'continuous']),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  timesPerDay: z.number().min(1).max(20).default(1),
  timesPerWeek: z.number().min(2).max(7).optional(),
  startDate: z.string().optional(), // для непрерывных — дата начала
})

const HABIT_TEMPLATES = [
  { title: 'Почистить зубы',      type: 'positive', trackingType: 'discrete',   timesPerDay: 2, category: 'здоровье' },
  { title: 'Заправить постель',   type: 'positive', trackingType: 'discrete',   timesPerDay: 1, category: 'личное'   },
  { title: '10 000 шагов',        type: 'positive', trackingType: 'discrete',   timesPerDay: 1, category: 'здоровье' },
  { title: 'Выпить 8 стаканов воды', type: 'positive', trackingType: 'discrete', timesPerDay: 8, category: 'здоровье' },
  { title: 'Читать 30 минут',     type: 'positive', trackingType: 'discrete',   timesPerDay: 1, category: 'хобби'    },
  { title: 'Медитация',           type: 'positive', trackingType: 'discrete',   timesPerDay: 1, category: 'здоровье' },
  { title: 'Зарядка',             type: 'positive', trackingType: 'discrete',   timesPerDay: 1, category: 'здоровье' },
  { title: 'Не есть сладкое',     type: 'anti',     trackingType: 'continuous', timesPerDay: 1, category: 'здоровье' },
  { title: 'Не курить',           type: 'anti',     trackingType: 'continuous', timesPerDay: 1, category: 'здоровье' },
  { title: 'Не листать соцсети', type: 'anti',     trackingType: 'continuous', timesPerDay: 1, category: 'личное'   },
  { title: 'Ранний подъём',       type: 'positive', trackingType: 'discrete',   timesPerDay: 1, category: 'личное'   },
  { title: 'Вести дневник',       type: 'positive', trackingType: 'discrete',   timesPerDay: 1, category: 'личное'   },
  { title: 'Не пить алкоголь',    type: 'anti',     trackingType: 'continuous', timesPerDay: 1, category: 'здоровье' },
]

export const getTemplates = async (req: AuthRequest, res: Response) => {
  res.json({ templates: HABIT_TEMPLATES })
}

export const getHabits = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date()
    const dayStart = startOfLocalDay(today)
    const dayEnd = endOfLocalDay(today)

    const habits = await prisma.habit.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' },
      include: {
        logs: {
          where: { date: { gte: dayStart, lte: dayEnd } },
          orderBy: { repetition: 'asc' }
        }
      }
    })
    const habitsWithMeta = await Promise.all(habits.map(async (habit) => {
      // Для непрерывных и привычек с нулевым стриком — не показываем восстановление
      if (habit.trackingType !== 'discrete' || habit.currentStreak === 0) {
        return {
          ...habit,
          canRestoreStreak: false,
        }
      }

      const now = new Date()
      
      // Начало и конец сегодня
      const todayStart = startOfLocalDay(now)
      const todayEnd = endOfLocalDay(now)

      // Начало и конец вчера
      const yesterdayStart = startOfLocalDay(new Date(todayStart.getTime() - 86400000))
      const yesterdayEnd = endOfLocalDay(new Date(todayStart.getTime() - 86400000))

      // Начало и конец позавчера
      const twoDaysAgoStart = startOfLocalDay(new Date(todayStart.getTime() - 2 * 86400000))

      const twoDaysAgoEnd = endOfLocalDay(new Date(todayStart.getTime() - 2 * 86400000))

      const [todayLogs, yesterdayLogs, twoDaysAgoLogs] = await Promise.all([
        prisma.habitLog.findMany({
          where: { habitId: habit.id, date: { gte: todayStart, lte: todayEnd } }
        }),
        prisma.habitLog.findMany({
          where: { habitId: habit.id, date: { gte: yesterdayStart, lte: yesterdayEnd } }
        }),
        prisma.habitLog.findMany({
          where: { habitId: habit.id, date: { gte: twoDaysAgoStart, lte: twoDaysAgoEnd } }
        }),
      ])
      const weekStart = startOfLocalWeek()
      const weekEnd = endOfLocalDay(new Date())

      const weekLogs = await prisma.habitLog.count({
        where: {
          habitId: habit.id,
          date: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
      })

      const isTodayCompleted = habit.frequency === 'weekly' ? weekLogs > 0 : todayLogs.length >= habit.timesPerDay
      const isYesterdayCompleted = habit.frequency === 'weekly' ? yesterdayLogs.length > 0 : yesterdayLogs.length >= habit.timesPerDay
      const wasTwoDaysAgoCompleted = habit.frequency === 'weekly' ? twoDaysAgoLogs.length > 0 : twoDaysAgoLogs.length >= habit.timesPerDay

      let currentStreak = habit.currentStreak
      

      // Логика
      const alreadyRestoredToday = habit.streakRestoredAt
        ? new Date(habit.streakRestoredAt) >= todayStart
        : false
      const canRestore =  currentStreak > 0 && !isTodayCompleted && !isYesterdayCompleted && wasTwoDaysAgoCompleted && !alreadyRestoredToday
      // Если пользователь пропустил день и не восстановил стрик вовремя — обнуляем
      const shouldResetStreak = currentStreak > 0 && !isTodayCompleted && !isYesterdayCompleted && !wasTwoDaysAgoCompleted
      if (shouldResetStreak) {
        await prisma.habit.update({
          where: { id: habit.id },
          data: {
            currentStreak: 0,
            streakRestoredAt: null,
          }
        })

        currentStreak = 0
      }
      
      
      return {
        ...habit, currentStreak, canRestoreStreak: canRestore, weeklyProgress:
          habit.frequency === 'weekly' ? weekLogs : undefined,
          weeklyTarget: habit.frequency === 'weekly' ? habit.timesPerWeek: undefined,
      }
    }))

    res.json({ habits: habitsWithMeta })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const createHabit = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { habitSlots: true }
    })
    const maxSlots = user?.habitSlots ?? 10

    const existing = await prisma.habit.count({ where: { userId: req.userId! } })
    if (existing >= maxSlots) {
      res.status(400).json({
        error: `Достигнут лимит привычек (${maxSlots}). Купите дополнительный слот в магазине.`
      })
      return
    }
    const data = createHabitSchema.parse(req.body)
    if (data.frequency === 'weekly' &&(!data.timesPerWeek || data.timesPerWeek < 2)) {
      res.status(400).json({
        error: 'Недельная привычка должна выполняться минимум 2 раза в неделю',
      })
      return
    }
    // Для непрерывных — startDate из запроса или сейчас
    let startDate: Date | null = null
    if (data.trackingType === 'continuous') {
      startDate = data.startDate ? new Date(data.startDate) : new Date()
    }

    const habit = await prisma.habit.create({
      data: {
        userId: req.userId!,
        title: data.title,
        type: data.type,
        trackingType: data.trackingType,
        frequency: data.frequency || 'daily',
        timesPerDay: data.timesPerDay || 1,
        timesPerWeek: data.timesPerWeek,
        startDate,
        isDayTrackingEnabled: data.trackingType === 'continuous',
      },
      include: { logs: true }
    })
    res.status(201).json({ habit })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const deleteHabit = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.id as string, 10)
    const existing = await prisma.habit.findFirst({
      where: { id: habitId, userId: req.userId! }
    })
    if (!existing) { res.status(404).json({ error: 'Не найдена' }); return }
    await prisma.habit.delete({ where: { id: habitId } })
    res.json({ message: 'Удалено' })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}



export const logHabit = async (req: AuthRequest, res: Response) => {
  try {
    
    const habitId = parseInt(req.params.id as string, 10)
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: req.userId! }
    })
    if (!habit) { res.status(404).json({ error: 'Не найдена' }); return }

    if (habit.trackingType === 'continuous') {
      res.status(400).json({ error: 'Непрерывная привычка не требует отметки' })
      return
    }

    const today = startOfLocalDay()
    const todayEnd = endOfLocalDay()

    const todayLogs = await prisma.habitLog.count({
      where: { habitId, date: { gte: today, lte: todayEnd } }
    })

    if (habit.frequency === 'weekly') {
      const existingTodayLog =
        await prisma.habitLog.findFirst({
          where: {
            habitId,
            date: {
              gte: today,
              lte: todayEnd,
            },
          },
        })

      if (existingTodayLog) {
        res.status(400).json({
          error:
            'Weekly привычку можно отмечать только 1 раз в день',
        })
        return
      }
    }

    const limit = habit.frequency === 'weekly' ? 1 : habit.timesPerDay

    if (todayLogs >= limit) {
      res.status(400).json({
        error: 'Достигнут лимит отметок на сегодня',
      })
      return
    }

    const nextRep = habit.frequency === 'weekly' ? 1 : todayLogs + 1
    
    await prisma.habitLog.create({
      data: { habitId, date: startOfLocalDay(), repetition: nextRep }
    })

    const isCompleted = nextRep >= habit.timesPerDay
    let weekCompleted = false
    let xpEarned = 0
    let goldEarned = 0
    let newAchievements: any[] = []
    let newStreak = habit.currentStreak
    let levelUp: { level: number; levelName: string } | null = null
    if (isCompleted) {
      const userBefore = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { level: true }
      })

      if (habit.frequency === 'weekly') {
        const weekStart = startOfLocalWeek()

        const alreadyLoggedThisWeek = await prisma.habitLog.findFirst({
          where: {
            habitId,
            date: { gte: weekStart }
          }
        })

        if (habit.frequency === 'weekly' && alreadyLoggedThisWeek && nextRep > 1) {
          res.status(400).json({
            error: 'Weekly привычка уже засчитана на эту неделю'
          })
          return
        }
        const weekEnd = endOfLocalDay(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))
        const weeklyLogs = await prisma.habitLog.count({
          where: {
            habitId,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        })
        const alreadyCompletedThisWeek = habit.lastCompletedWeek && startOfLocalWeek(new Date(habit.lastCompletedWeek)).getTime() === weekStart.getTime()
        weekCompleted = weeklyLogs >= (habit.timesPerWeek || 1)
        if (alreadyCompletedThisWeek) {
          weekCompleted = false
        }
        if (weekCompleted && !alreadyCompletedThisWeek) {
          newStreak = habit.currentStreak + 1

          await prisma.habit.update({
            where: { id: habitId },
            data: {
              currentStreak: newStreak,
              bestStreak: Math.max(newStreak, habit.bestStreak),
              completedWeeks: { increment: 1 },
              bestWeeks: Math.max(habit.bestWeeks, habit.completedWeeks + 1),
              lastCompletedWeek: weekStart, 
            },
          })
        } else {
          newStreak = habit.currentStreak
        }
      }
    
    if (habit.frequency !== 'weekly') {
      const yesterdayStart = startOfLocalDay(subDays(new Date(), 1))
      const yesterdayEnd = endOfLocalDay(subDays(new Date(), 1))

      const yesterdayLog = await prisma.habitLog.findFirst({
        where: {
          habitId,
          date: {
            gte: yesterdayStart,
            lte: yesterdayEnd,
          },
        },
      })

      const todayStart = startOfLocalDay()
      const todayEnd = endOfLocalDay()

      const restoredToday = habit.streakRestoredAt ? new Date(habit.streakRestoredAt) >= todayStart && new Date(habit.streakRestoredAt) <= todayEnd : false

      const hadValidYesterday =
        !!yesterdayLog || restoredToday

      if (!hadValidYesterday) {
        newStreak = 1
      } else {
        newStreak = habit.currentStreak + 1
      }
    }



      const baseXp = habit.frequency === 'weekly' ? (weekCompleted ? 100 : 0) : 25
      const baseGold = habit.frequency === 'weekly' ? (weekCompleted ? 20 : 0) : 5
      const streakBonus = habit.frequency === 'weekly' ? 0 : newStreak >= 30 ? 10 : newStreak >= 7 ? 5 : 0

      const rawXp = baseXp + streakBonus
      if (habit.frequency === 'weekly' && !weekCompleted) {
        res.json({
          success: true,
          repetitionsDone: nextRep,
          repetitionsTotal: habit.timesPerWeek,
          isFullyCompleted: false,
          currentStreak: newStreak,
          xpEarned: 0,
          goldEarned: 0,
          achievements: [],
          levelUp: null,
        })

        return
      }

      const boostedRewards = await applyBoosters({
        userId: req.userId!,
        baseXp: rawXp,
        baseGold,
      })

      xpEarned = boostedRewards.xp
      goldEarned = boostedRewards.gold

      await prisma.$transaction(async (tx) => {
        if (habit.frequency !== 'weekly') {
          await tx.habit.update({
            where: { id: habitId },
            data: {
              currentStreak: newStreak,
              bestStreak: Math.max(
                newStreak,
                habit.bestStreak
              ),
            },
          })
        }
        const updatedUser = await tx.user.update({
          where: { id: req.userId! },
          data: { xp: { increment: xpEarned }, gold: { increment: goldEarned } }
        })

        const newLevel = getLevelFromXp(updatedUser.xp)

        if (newLevel !== updatedUser.level) {
          await tx.user.update({ where: { id: req.userId! }, data: { level: newLevel } })
        }

        await tx.rewardTransaction.createMany({
          data: [
            { userId: req.userId!, sourceType: 'habit', sourceId: habitId, rewardType: 'xp', amount: xpEarned },
            { userId: req.userId!, sourceType: 'habit', sourceId: habitId, rewardType: 'gold', amount: goldEarned },
          ]
        })

        // Достижения за стрик
      })
      const userAfter = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { level: true }
      })

      levelUp = userBefore?.level !== undefined && userAfter?.level !== undefined && userAfter.level > userBefore.level ? {
        level: userAfter.level, levelName: getLevelName(userAfter.level)
      }: null
      const extraAchievements = await checkAchievementsForUser(req.userId!)
      newAchievements.push(...extraAchievements) 
      }

    res.json({
      success: true,
      repetitionsDone: nextRep,
      repetitionsTotal: habit.frequency === 'weekly' ? (habit.timesPerWeek || 2) : habit.timesPerDay,
      isFullyCompleted: habit.frequency === 'weekly' ? weekCompleted : isCompleted,
      currentStreak: newStreak,
      xpEarned,
      goldEarned: Number(goldEarned.toFixed(1)),
      achievements: newAchievements,
      levelUp,
    })

    void updateUserChallenges(req.userId!).catch(error => {
      console.error('updateUserChallenges error:', error)
    })  
    
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}                         


// Нарушение непрерывной привычки — удаляет её
export const breakContinuousHabit = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.id as string, 10)
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: req.userId! }
    })
    if (!habit) { res.status(404).json({ error: 'Не найдена' }); return }
    if (habit.trackingType !== 'continuous') {
      res.status(400).json({ error: 'Только для непрерывных привычек' })
      return
    }

    // Удаляем привычку — стрик прерван безвозвратно
    await prisma.habit.delete({ where: { id: habitId } })
    res.json({ success: true, deleted: true })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const restoreStreak = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.id as string, 10)
    const COST = 50.0

    const [habit, user] = await Promise.all([
      prisma.habit.findFirst({ where: { id: habitId, userId: req.userId! } }),
      prisma.user.findUnique({ where: { id: req.userId! } })
    ])

    if (!habit) { res.status(404).json({ error: 'Не найдена' }); return }
    if (!user || user.gold < COST) {
      res.status(400).json({ error: `Нужно ${COST} баллов` })
      return
    }

    // Проверяем что стрик не восстанавливался сегодня
    if (habit.streakRestoredAt) {
      const restoredDay = startOfLocalDay(new Date(habit.streakRestoredAt))
      const today = startOfLocalDay()
      if (restoredDay.getTime() === today.getTime()) {
        res.status(400).json({ error: 'Стрик уже восстанавливался сегодня' })
        return
      }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId! },
        data: { gold: { decrement: COST } }
      }),
      prisma.habit.update({
        where: { id: habitId },
        data: {
          streakRestoredAt: new Date()
        }
      })
    ])

    res.json({ success: true, goldSpent: Number(COST.toFixed(1)) })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const getHeatmap = async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string || '30')
    const today = startOfLocalDay()
    const since = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

    // Все привычки пользователя
    const habits = await prisma.habit.findMany({
      where: {
        userId: req.userId!,
        trackingType: 'discrete'
      },

      select: {
        id: true,
        timesPerDay: true,
        createdAt: true
      }
    })

    const habitIds = habits.map(h => h.id)

    // Все логи за период
    const logs = await prisma.habitLog.findMany({
      where: { habitId: { in: habitIds }, date: { gte: since } },
      select: { habitId: true, date: true }
    })

    // Группируем по дате
    const logsByDateAndHabit: Record<string, Record<number, number>> = {}

    for (const log of logs) {
      const dateStr = localDateKey(log.date)

      if (!logsByDateAndHabit[dateStr]) {
        logsByDateAndHabit[dateStr] = {}
      }

      logsByDateAndHabit[dateStr][log.habitId] =
        (logsByDateAndHabit[dateStr][log.habitId] || 0) + 1
    }

    // Строим массив дней
    const heatmap: { date: string; completedCount: number; totalCount: number; percent: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = localDateKey(d)
      const activeHabits = habits.filter(h => startOfLocalDay(h.createdAt) <= d)
      const totalHabits = activeHabits.length
      let completed = 0
      for (const habit of activeHabits) {
        const count = logsByDateAndHabit[dateStr]?.[habit.id] || 0
        if (count >= habit.timesPerDay) {
          completed++
        }
      }
      const percent = totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0
      heatmap.push({ date: dateStr, completedCount: completed, totalCount: totalHabits, percent })
    }

    res.json({ heatmap })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
}
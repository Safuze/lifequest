import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'
import { startOfDay, endOfDay, startOfWeek, subDays } from 'date-fns'
import { checkAchievementsForUser } from '../services/achievementService'
import { getLevelFromXp, getLevelName } from '../services/levelService'
import { applyBoosters } from '../services/boosterService'

export const createHabitSchema = z.object({
  title: z.string().min(1).max(100),
  type: z.enum(['positive', 'anti']),
  trackingType: z.enum(['discrete', 'continuous']),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  timesPerDay: z.number().min(1).max(20).default(1),
  timesPerWeek: z.number().min(1).max(7).optional(),
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
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)

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
        return { ...habit, canRestoreStreak: false }
      }

      const now = new Date()
      
      // Начало и конец сегодня
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(now)
      todayEnd.setHours(23, 59, 59, 999)

      // Начало и конец вчера
      const yesterdayStart = new Date(todayStart)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      const yesterdayEnd = new Date(yesterdayStart)
      yesterdayEnd.setHours(23, 59, 59, 999)

      // Начало и конец позавчера
      const twoDaysAgoStart = new Date(yesterdayStart)
      twoDaysAgoStart.setDate(twoDaysAgoStart.getDate() - 1)
      const twoDaysAgoEnd = new Date(twoDaysAgoStart)
      twoDaysAgoEnd.setHours(23, 59, 59, 999)

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
      const isTodayCompleted = todayLogs.length >= habit.timesPerDay
      const isYesterdayCompleted = yesterdayLogs.length >= habit.timesPerDay
      const wasTwoDaysAgoCompleted = twoDaysAgoLogs.length >= habit.timesPerDay

      let currentStreak = habit.currentStreak
      

      // Логика:
      // - Сегодня уже отмечено → восстановление не нужно
      // - Вчера не было отметки И позавчера была → можно восстановить
      // - Вчера была отметка → стрик не прерван, восстановление не нужно
      // - Стрик уже восстанавливался сегодня → не показываем
      const alreadyRestoredToday = habit.streakRestoredAt
        ? new Date(habit.streakRestoredAt) >= todayStart
        : false

      const canRestore =
        currentStreak > 0 &&
        !isTodayCompleted &&
        !isYesterdayCompleted &&
        wasTwoDaysAgoCompleted &&
        !alreadyRestoredToday

      // Если пользователь пропустил день и не восстановил стрик вовремя — обнуляем
      const shouldResetStreak =
        currentStreak > 0 &&
        !isTodayCompleted &&
        !isYesterdayCompleted &&
        !wasTwoDaysAgoCompleted

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
      
      console.log({
        habitId: habit.id,
        isTodayCompleted,
        isYesterdayCompleted,
        wasTwoDaysAgoCompleted,
        currentStreak,
        alreadyRestoredToday
      })
      return { ...habit, currentStreak, canRestoreStreak: canRestore }
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
    const data = req.body

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

    const today = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const todayLogs = await prisma.habitLog.count({
      where: { habitId, date: { gte: today, lte: todayEnd } }
    })

    if (todayLogs >= habit.timesPerDay) {
      res.status(400).json({ error: 'Достигнут лимит отметок на сегодня' })
      return
    }

    const nextRep = todayLogs + 1
    console.log('CREATING HABIT LOG', {
      habitId: habit.id,
      now: new Date().toISOString()
    })
    
    await prisma.habitLog.create({
      data: { habitId, date: new Date(), repetition: nextRep }
    })

    const isCompleted = nextRep >= habit.timesPerDay
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
      const yesterdayStart = startOfDay(subDays(new Date(), 1))
      const yesterdayEnd = endOfDay(subDays(new Date(), 1))

      const yesterdayLog = await prisma.habitLog.findFirst({
        where: { habitId, date: { gte: yesterdayStart, lte: yesterdayEnd } }
      })

      // Проверяем было ли восстановление вчера (тогда стрик не прерван)
      const restoredYesterday = habit.streakRestoredAt
        ? new Date(habit.streakRestoredAt) >= yesterdayStart && new Date(habit.streakRestoredAt) <= yesterdayEnd
        : false

      const hadValidYesterday =
        !!yesterdayLog || restoredYesterday

      if (!hadValidYesterday) {
        newStreak = 1
      } else {
        newStreak = habit.currentStreak + 1
      }

      const baseXp = 15
      const streakBonus = newStreak >= 30 ? 10 : newStreak >= 7 ? 5 : 0

      const rawXp = baseXp + streakBonus
      const baseGold = 2

      const boostedRewards = await applyBoosters({
        userId: req.userId!,
        baseXp: rawXp,
        baseGold,
      })

      xpEarned = boostedRewards.xp
      goldEarned = boostedRewards.gold

      await prisma.$transaction(async (tx) => {
        await tx.habit.update({
          where: { id: habitId },
          data: {
            currentStreak: newStreak,
            bestStreak: Math.max(newStreak, habit.bestStreak),
          }
        })
        const updatedUser = await tx.user.update({
          where: { id: req.userId! },
          data: { xp: { increment: xpEarned }, gold: { increment: goldEarned } }
        })

        const LEVEL_XP = [0, 1000, 3000, 6000, 10000, 15000]
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
        const milestones = [
          { days: 7,   type: 'streak_7',   title: '7 дней подряд!',            icon: '📅', rarity: 'common'    },
          { days: 30,  type: 'streak_30',  title: 'Месяц без остановки!',       icon: '🗓️', rarity: 'rare'      },
          { days: 90,  type: 'streak_90',  title: 'Квартал дисциплины!',        icon: '💪', rarity: 'epic'      },
          { days: 365, type: 'streak_365', title: 'Год привычки — Легенда!',    icon: '👑', rarity: 'legendary' },
        ]
        for (const m of milestones) {
          if (newStreak >= m.days) {
            const key = `${m.type}_habit_${habitId}`
            const ex = await tx.achievement.findFirst({ where: { userId: req.userId!, type: key } })
            if (!ex) {
              const a = await tx.achievement.create({
                data: {
                  userId: req.userId!,
                  type: key,
                  title: m.title,
                  description: `${m.days} дней стрика по привычке`,
                  icon: m.icon,
                  rarity: m.rarity,
                }
              })
              newAchievements.push(a)
            }
          }
        }
      })
      const userAfter = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { level: true }
      })

      levelUp =
        userBefore?.level !== undefined &&
        userAfter?.level !== undefined &&
        userAfter.level > userBefore.level
          ? {
              level: userAfter.level,
              levelName: getLevelName(userAfter.level)
            }
          : null
      const extraAchievements = await checkAchievementsForUser(req.userId!)
      newAchievements.push(...extraAchievements)
    }
    

    res.json({
      success: true,
      repetitionsDone: nextRep,
      repetitionsTotal: habit.timesPerDay,
      isFullyCompleted: isCompleted,
      currentStreak: newStreak,
      xpEarned,
      goldEarned: Number(goldEarned.toFixed(1)),
      achievements: newAchievements,
      levelUp,
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
      res.status(400).json({ error: `Нужно ${COST} 🪙` })
      return
    }

    // Проверяем что стрик не восстанавливался сегодня
    if (habit.streakRestoredAt) {
      const restoredDay = new Date(habit.streakRestoredAt)
      restoredDay.setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
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
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    since.setHours(0, 0, 0, 0)

    // Все привычки пользователя
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId!, trackingType: 'discrete' },
      select: { id: true }
    })
    const totalHabits = habits.length
    if (totalHabits === 0) { res.json({ heatmap: [] }); return }

    const habitIds = habits.map(h => h.id)

    // Все логи за период
    const logs = await prisma.habitLog.findMany({
      where: { habitId: { in: habitIds }, date: { gte: since } },
      select: { habitId: true, date: true }
    })

    // Группируем по дате
    const byDate: Record<string, Set<number>> = {}
    for (const log of logs) {
      const dateStr = log.date.toISOString().split('T')[0]
      if (!byDate[dateStr]) byDate[dateStr] = new Set()
      byDate[dateStr].add(log.habitId)
    }

    // Строим массив дней
    const heatmap: { date: string; completedCount: number; totalCount: number; percent: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0]
      const completed = byDate[dateStr]?.size ?? 0
      const percent = totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0
      heatmap.push({ date: dateStr, completedCount: completed, totalCount: totalHabits, percent })
    }

    res.json({ heatmap })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
}
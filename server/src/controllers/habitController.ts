// src/controllers/habitController.ts
import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns'

export const createHabitSchema = z.object({
  title: z.string().min(1).max(100),
  type: z.enum(['positive', 'anti']),
  trackingType: z.enum(['discrete', 'continuous']),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  timesPerDay: z.number().min(1).max(20).default(1),
  timesPerWeek: z.number().min(1).max(7).optional(),
  startDate: z.string().optional(),
})

export const updateHabitSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  timesPerDay: z.number().min(1).max(20).optional(),
  timesPerWeek: z.number().min(1).max(7).optional(),
})

// Шаблоны привычек
const HABIT_TEMPLATES = [
  { title: 'Почистить зубы', type: 'positive', trackingType: 'discrete', timesPerDay: 2, category: 'здоровье' },
  { title: 'Заправить постель', type: 'positive', trackingType: 'discrete', timesPerDay: 1, category: 'личное' },
  { title: '10 000 шагов', type: 'positive', trackingType: 'discrete', timesPerDay: 1, category: 'здоровье' },
  { title: 'Выпить 8 стаканов воды', type: 'positive', trackingType: 'discrete', timesPerDay: 8, category: 'здоровье' },
  { title: 'Читать 30 минут', type: 'positive', trackingType: 'discrete', timesPerDay: 1, category: 'хобби' },
  { title: 'Медитация', type: 'positive', trackingType: 'discrete', timesPerDay: 1, category: 'здоровье' },
  { title: 'Зарядка', type: 'positive', trackingType: 'discrete', timesPerDay: 1, category: 'здоровье' },
  { title: 'Не есть сладкое', type: 'anti', trackingType: 'continuous', timesPerDay: 1, category: 'здоровье' },
  { title: 'Не курить', type: 'anti', trackingType: 'continuous', timesPerDay: 1, category: 'здоровье' },
  { title: 'Не листать соцсети', type: 'anti', trackingType: 'continuous', timesPerDay: 1, category: 'личное' },
  { title: 'Ранний подъём', type: 'positive', trackingType: 'discrete', timesPerDay: 1, category: 'личное' },
  { title: 'Вести дневник', type: 'positive', trackingType: 'discrete', timesPerDay: 1, category: 'личное' },
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

    res.json({ habits })
  } catch (error) {
    console.error('getHabits error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const createHabit = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body
    const habit = await prisma.habit.create({
      data: {
        userId: req.userId!,
        title: data.title,
        type: data.type,
        trackingType: data.trackingType,
        frequency: data.frequency || 'daily',
        timesPerDay: data.timesPerDay || 1,
        timesPerWeek: data.timesPerWeek,
        startDate: data.type === 'anti' ? new Date() : null,
      },
      include: { logs: true }
    })
    res.status(201).json({ habit })
  } catch (error) {
    console.error('createHabit error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const deleteHabit = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.id as string, 10)
    const existing = await prisma.habit.findFirst({
      where: { id: habitId, userId: req.userId! }
    })
    if (!existing) { res.status(404).json({ error: 'Привычка не найдена' }); return }
    await prisma.habit.delete({ where: { id: habitId } })
    res.json({ message: 'Привычка удалена' })
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
    if (!habit) { res.status(404).json({ error: 'Привычка не найдена' }); return }

    const today = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    // Считаем сколько отметок уже есть сегодня
    const todayLogs = await prisma.habitLog.count({
      where: { habitId, date: { gte: today, lte: todayEnd } }
    })

    if (todayLogs >= habit.timesPerDay) {
      res.status(400).json({ error: 'Достигнут лимит отметок на сегодня' })
      return
    }

    const nextRepetition = todayLogs + 1
    await prisma.habitLog.create({
      data: {
        habitId,
        date: new Date(),
        repetition: nextRepetition,
      }
    })

    const isFullyCompleted = nextRepetition >= habit.timesPerDay

    let xpEarned = 0
    let goldEarned = 0
    let newAchievements: any[] = []
    let newStreak = habit.currentStreak

    if (isFullyCompleted) {
      // Обновляем стрик
      const yesterday = startOfDay(subDays(new Date(), 1))
      const yesterdayEnd = endOfDay(subDays(new Date(), 1))

      const yesterdayLog = await prisma.habitLog.findFirst({
        where: { habitId, date: { gte: yesterday, lte: yesterdayEnd } }
      })

      if (yesterdayLog || habit.currentStreak === 0) {
        newStreak = habit.currentStreak + 1
      } else {
        // Проверяем 50% правило
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        const weekLogs = await prisma.habitLog.count({
          where: { habitId, date: { gte: weekStart } }
        })
        const expectedDays = Math.min(7, Math.ceil((new Date().getTime() - weekStart.getTime()) / 86400000))
        const rate = expectedDays > 0 ? weekLogs / expectedDays : 0

        if (rate >= 0.5) {
          newStreak = habit.currentStreak + 1
        } else {
          newStreak = 1
        }
      }

      // Начисляем XP с учётом стрика
      const baseXp = habit.type === 'anti' ? 25 : 15
      const streakBonus = newStreak >= 30 ? 10 : newStreak >= 7 ? 5 : 0
      xpEarned = baseXp + streakBonus
      goldEarned = 2

      await prisma.$transaction(async (tx) => {
        await tx.habit.update({
          where: { id: habitId },
          data: {
            currentStreak: newStreak,
            bestStreak: Math.max(newStreak, habit.bestStreak),
          }
        })

        await tx.user.update({
          where: { id: req.userId! },
          data: { xp: { increment: xpEarned }, gold: { increment: goldEarned } }
        })

        // Достижения по стрику
        const STREAK_MILESTONES = [
          { days: 7,   type: 'streak_7',   title: '7 дней подряд!' },
          { days: 30,  type: 'streak_30',  title: 'Месяц без остановки!' },
          { days: 100, type: 'streak_100', title: '100 дней привычки!' },
          { days: 365, type: 'streak_365', title: 'Год привычки — Легенда!' },
        ]

        for (const milestone of STREAK_MILESTONES) {
          if (newStreak >= milestone.days) {
            const existing = await tx.achievement.findFirst({
              where: { userId: req.userId!, type: `${milestone.type}_habit_${habitId}` }
            })
            if (!existing) {
              const ach = await tx.achievement.create({
                data: {
                  userId: req.userId!,
                  type: `${milestone.type}_habit_${habitId}`,
                  title: milestone.title,
                }
              })
              newAchievements.push(ach)
            }
          }
        }
      })
    }

    res.json({
      success: true,
      repetitionsDone: nextRepetition,
      repetitionsTotal: habit.timesPerDay,
      isFullyCompleted,
      currentStreak: newStreak,
      xpEarned,
      goldEarned,
      achievements: newAchievements,
    })
  } catch (error) {
    console.error('logHabit error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const restoreStreak = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.id as string, 10)
    const RESTORE_COST = 50

    const [habit, user] = await Promise.all([
      prisma.habit.findFirst({ where: { id: habitId, userId: req.userId! } }),
      prisma.user.findUnique({ where: { id: req.userId! } })
    ])

    if (!habit) { res.status(404).json({ error: 'Привычка не найдена' }); return }
    if (!user || user.gold < RESTORE_COST) {
      res.status(400).json({ error: `Недостаточно золота. Нужно ${RESTORE_COST} 🪙` })
      return
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId! },
        data: { gold: { decrement: RESTORE_COST } }
      }),
      prisma.habit.update({
        where: { id: habitId },
        data: { currentStreak: habit.currentStreak + 1 }
      })
    ])

    res.json({ success: true, goldSpent: RESTORE_COST })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const getHeatmap = async (req: AuthRequest, res: Response) => {
  try {
    const habitId = parseInt(req.params.id as string, 10)
    const habit = await prisma.habit.findFirst({
      where: { id: habitId, userId: req.userId! }
    })
    if (!habit) { res.status(404).json({ error: 'Привычка не найдена' }); return }

    const since = subDays(new Date(), 365)
    const logs = await prisma.habitLog.findMany({
      where: { habitId, date: { gte: since } },
      select: { date: true, repetition: true }
    })

    // Группируем по датам
    const heatmap: Record<string, number> = {}
    logs.forEach(log => {
      const dateStr = log.date.toISOString().split('T')[0]
      heatmap[dateStr] = (heatmap[dateStr] || 0) + 1
    })

    res.json({ heatmap })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
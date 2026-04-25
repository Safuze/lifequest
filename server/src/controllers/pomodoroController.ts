import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'

export const settingsSchema = z.object({
  workDuration:     z.number().min(1).max(120).optional(),
  shortBreak:       z.number().min(1).max(60).optional(),
  longBreak:        z.number().min(1).max(120).optional(),
  cyclesBeforeLong: z.number().min(1).max(10).optional(),
})

export const createSessionSchema = z.object({
  taskId:          z.number().positive(),
  goalId:          z.number().positive().optional(),
  plannedDuration: z.number().positive(),
})

export const completeSessionSchema = z.object({
  actualDuration: z.number().min(0),
})

// Вычисление XP и золота
function calculateReward(actualDuration: number, isFocusTask: boolean, cycleCompleted: boolean) {
  const BASE_XP_PER_MIN = 2
  const BASE_GOLD_PER_MIN = 0.4

  let xp = Math.floor(actualDuration * BASE_XP_PER_MIN)
  let gold = Math.floor(actualDuration * BASE_GOLD_PER_MIN)

  if (isFocusTask) { xp = Math.floor(xp * 1.5); gold = Math.floor(gold * 1.5) }
  if (cycleCompleted) { xp += 100; gold += 20 }

  return { xp, gold }
}

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.pomodoroSettings.findUnique({
      where: { userId: req.userId! }
    })
    if (!settings) {
      settings = await prisma.pomodoroSettings.create({
        data: { userId: req.userId! }
      })
    }
    res.json({ settings })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.pomodoroSettings.upsert({
      where: { userId: req.userId! },
      update: req.body,
      create: { userId: req.userId!, ...req.body }
    })
    res.json({ settings })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const startSession = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, goalId, plannedDuration } = req.body

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId! }
    })
    if (!task) {
      res.status(404).json({ error: 'Задача не найдена' })
      return
    }

    // Завершаем активные сессии если есть
    await prisma.pomodoroSession.updateMany({
      where: { userId: req.userId!, status: 'active' },
      data: { status: 'cancelled' }
    })

    const session = await prisma.pomodoroSession.create({
      data: {
        userId: req.userId!,
        taskId,
        goalId: goalId || task.goalId || null,
        plannedDuration,
        status: 'active',
        startedAt: new Date(),
      }
    })

    res.status(201).json({ session })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const completeSession = async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id as string, 10)
    const { actualDuration } = req.body

    const session = await prisma.pomodoroSession.findFirst({
      where: { id: sessionId, userId: req.userId! }
    })
    if (!session) {
      res.status(404).json({ error: 'Сессия не найдена' })
      return
    }

    const task = await prisma.task.findUnique({ where: { id: session.taskId } })

    // Считаем цикл: сколько завершённых сессий за последние N часов
    const settings = await prisma.pomodoroSettings.findUnique({
      where: { userId: req.userId! }
    })
    const cyclesBeforeLong = settings?.cyclesBeforeLong || 4

    const recentSessions = await prisma.pomodoroSession.count({
      where: {
        userId: req.userId!,
        status: 'completed',
        completedAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) }
      }
    })
    const cycleCompleted = (recentSessions + 1) % cyclesBeforeLong === 0

    const { xp, gold } = calculateReward(
      actualDuration,
      task?.isFocusToday || false,
      cycleCompleted
    )

    // Транзакция
    const result = await prisma.$transaction(async (tx) => {
      const completedSession = await tx.pomodoroSession.update({
        where: { id: sessionId },
        data: { status: 'completed', actualDuration, completedAt: new Date() }
      })

      await tx.task.update({
        where: { id: session.taskId },
        data: { timeSpent: { increment: actualDuration } }
      })

      if (session.goalId) {
        await tx.goal.update({
          where: { id: session.goalId },
          data: { spentHours: { increment: actualDuration / 60 } }
        })
      }

      await tx.rewardTransaction.createMany({
        data: [
          { userId: req.userId!, sessionId, sourceType: 'pomodoro', sourceId: sessionId, rewardType: 'xp', amount: xp },
          { userId: req.userId!, sessionId, sourceType: 'pomodoro', sourceId: sessionId, rewardType: 'gold', amount: gold },
        ]
      })

      await tx.user.update({
        where: { id: req.userId! },
        data: { xp: { increment: xp }, gold: { increment: gold } }
      })

      // Проверка достижений
      const user = await tx.user.findUnique({ where: { id: req.userId! } })
      const totalSessions = await tx.pomodoroSession.count({
        where: { userId: req.userId!, status: 'completed' }
      })

      const newAchievements: any[] = []
      const existingAchievements = await tx.achievement.findMany({
        where: { userId: req.userId! },
        select: { type: true }
      })
      const existingTypes = new Set(existingAchievements.map(a => a.type))

      if (totalSessions >= 10 && !existingTypes.has('pomodoro_10')) {
        newAchievements.push({ userId: req.userId!, type: 'pomodoro_10', title: '10 помодоро завершено' })
      }
      if (totalSessions >= 100 && !existingTypes.has('pomodoro_100')) {
        newAchievements.push({ userId: req.userId!, type: 'pomodoro_100', title: '100 помодоро!' })
      }

      if (newAchievements.length > 0) {
        await tx.achievement.createMany({ data: newAchievements })
      }

      return { completedSession, xp, gold, cycleBonus: cycleCompleted, newAchievements, user }
    })

    res.json({
      session: result.completedSession,
      reward: { xp: result.xp, gold: result.gold },
      cycleBonus: result.cycleBonus,
      achievements: result.newAchievements,
    })
  } catch (error) {
    console.error('completeSession error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const getActiveSession = async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.pomodoroSession.findFirst({
      where: { userId: req.userId!, status: 'active' },
      include: { task: { select: { id: true, title: true, isFocusToday: true } } }
    })
    res.json({ session })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const getTodayStats = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: req.userId!,
        status: 'completed',
        completedAt: { gte: today, lt: tomorrow }
      }
    })

    const totalMinutes = sessions.reduce((sum, s) => sum + s.actualDuration, 0)
    const completedCycles = Math.floor(sessions.length / 4)

    res.json({ totalMinutes, sessionsCount: sessions.length, completedCycles })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
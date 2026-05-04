import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'
import { checkAchievementsForUser } from '../services/achievementService'
import { getLevelFromXp, getLevelName } from '../services/levelService'

export const settingsSchema = z.object({
  workDuration:     z.number().min(1).max(120).optional(),
  shortBreak:       z.number().min(1).max(60).optional(),
  longBreak:        z.number().min(1).max(120).optional(),
  cyclesBeforeLong: z.number().min(1).max(10).optional(),
})

export const createSessionSchema = z.object({
  taskId:          z.number().positive().optional(),
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

    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId: req.userId! }
      })
      if (!task) { res.status(404).json({ error: 'Задача не найдена' }); return }
    }

    await prisma.pomodoroSession.updateMany({
      where: { userId: req.userId!, status: 'active' },
      data: { status: 'cancelled' }
    })

    let resolvedGoalId = goalId || null
    if (taskId && !resolvedGoalId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { goalId: true }
      })
      resolvedGoalId = task?.goalId || null
    }

    const session = await prisma.pomodoroSession.create({
      data: {
        userId: req.userId!,
        taskId: taskId || null,
        goalId: resolvedGoalId,
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
    if (!session) { res.status(404).json({ error: 'Сессия не найдена' }); return }

    if (session.status === 'completed') {
      res.json({ session, reward: { xp: 0, gold: 0 }, cycleBonus: false, achievements: [], levelUp: null })
      return
    }

    await prisma.pomodoroSession.update({
      where: { id: sessionId },
      data: {
        status: actualDuration > 0 ? 'completed' : 'cancelled',
        actualDuration,
        completedAt: new Date(),
      }
    })

    // Сброс — ничего не начисляем
    if (!actualDuration || actualDuration <= 0) {
      res.json({ session, reward: { xp: 0, gold: 0 }, cycleBonus: false, achievements: [], levelUp: null })
      return
    }

    // Базовые награды за время
    const BASE_XP_PER_MIN = 2
    const BASE_GOLD_PER_MIN = 0.4
    let xpForSession = Math.max(1, Math.floor(actualDuration * BASE_XP_PER_MIN))
    let goldForSession = Math.max(1, Math.floor(actualDuration * BASE_GOLD_PER_MIN))

    // Бонус за фокус-задачу (×1.5)
    if (session.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: session.taskId },
        select: { isFocusToday: true }
      })
      if (task?.isFocusToday) {
        xpForSession = Math.floor(xpForSession * 1.5)
        goldForSession = Math.floor(goldForSession * 1.5)
      }
    }

    // Проверяем завершение цикла
    const settings = await prisma.pomodoroSettings.findUnique({
      where: { userId: req.userId! }
    })
    const cyclesBeforeLong = settings?.cyclesBeforeLong || 4

    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0) // UTC чтобы избежать timezone-багов

    // Считаем завершённые сессии сегодня ВКЛЮЧАЯ текущую
    const completedTodayCount = await prisma.pomodoroSession.count({
      where: {
        userId: req.userId!,
        status: 'completed',
        completedAt: { gte: todayStart }
      }
    })

    const isNewCycleCompleted = completedTodayCount > 0 && completedTodayCount % cyclesBeforeLong === 0

    let cycleBonusXp = 0
    let cycleBonusGold = 0

    if (isNewCycleCompleted) {
      // Алгоритм: бонус = сумма XP всех сессий текущего цикла / 4
      // Берём XP последних cyclesBeforeLong сессий из RewardTransaction
      const cycleRewards = await prisma.rewardTransaction.findMany({
        where: {
          userId: req.userId!,
          sourceType: 'pomodoro',
          createdAt: { gte: todayStart },
        },
        orderBy: { createdAt: 'desc' },
        // Берём только сессии текущего цикла
        // Каждая сессия = 2 записи (xp + gold), берём cyclesBeforeLong * 2
        // Но текущая сессия ещё не записана → берём (cyclesBeforeLong - 1) * 2 + текущая
        take: (cyclesBeforeLong - 1) * 2,
      })

      const prevCycleXp = cycleRewards
        .filter(r => r.rewardType === 'xp')
        .reduce((sum, r) => sum + r.amount, 0)

      const prevCycleGold = cycleRewards
        .filter(r => r.rewardType === 'gold')
        .reduce((sum, r) => sum + r.amount, 0)

      // Суммируем с текущей сессией
      const totalCycleXp = prevCycleXp + xpForSession
      const totalCycleGold = prevCycleGold + goldForSession

      // Делим на 4 (всегда на 4, как описано в алгоритме)
      cycleBonusXp = Math.max(1, Math.round(totalCycleXp / 4))
      cycleBonusGold = Math.max(1, Math.round(totalCycleGold / 4))
    }

    const totalXp = xpForSession + cycleBonusXp
    const totalGold = goldForSession + cycleBonusGold
    const userBefore = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { level: true }
    })

    await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: req.userId! },
        data: { xp: { increment: totalXp }, gold: { increment: totalGold } }
      })

      // Автообновление уровня
      const newLevel = getLevelFromXp(updatedUser.xp)

      if (newLevel !== updatedUser.level) {
        await tx.user.update({ where: { id: req.userId! }, data: { level: newLevel } })
      }

      // RewardTransaction
      const rewardRows: any[] = [
        { userId: req.userId!, sessionId, sourceType: 'pomodoro', sourceId: sessionId, rewardType: 'xp', amount: xpForSession },
        { userId: req.userId!, sessionId, sourceType: 'pomodoro', sourceId: sessionId, rewardType: 'gold', amount: goldForSession },
      ]
      if (isNewCycleCompleted) {
        rewardRows.push(
          { userId: req.userId!, sessionId, sourceType: 'cycle_bonus', sourceId: sessionId, rewardType: 'xp', amount: cycleBonusXp },
          { userId: req.userId!, sessionId, sourceType: 'cycle_bonus', sourceId: sessionId, rewardType: 'gold', amount: cycleBonusGold },
        )
      }
      await tx.rewardTransaction.createMany({ data: rewardRows })

      // Обновляем время задачи
      if (session.taskId) {
        await tx.task.update({
          where: { id: session.taskId },
          data: { timeSpent: { increment: actualDuration } }
        })
      }

      // Обновляем часы цели
      if (session.goalId) {
        await tx.goal.update({
          where: { id: session.goalId },
          data: { spentHours: { increment: actualDuration / 60 } }
        })
      }
    })
    const userAfter = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { level: true }
    })

    const levelUp =
      userBefore?.level !== undefined &&
      userAfter?.level !== undefined &&
      userAfter.level > userBefore.level
        ? {
            level: userAfter.level,
            levelName: getLevelName(userAfter.level)
          }
        : null
    const newAchievements = await checkAchievementsForUser(req.userId!)


    res.json({
      session,
      reward: { xp: totalXp, gold: totalGold },
      cycleBonus: isNewCycleCompleted ? { xp: cycleBonusXp, gold: cycleBonusGold } : null,
      achievements: newAchievements,
      levelUp,
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
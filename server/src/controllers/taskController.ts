import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'
import { checkAchievementsForUser } from '../services/achievementService'
import { getLevelFromXp, getLevelName } from '../services/levelService'
import { applyBoosters } from '../services/boosterService'

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.string().optional(),
  labels: z.array(z.string()).default([]),
  goalId: z.number().positive().optional(),
  parentId: z.number().positive().optional(),
  dueDate: z.string().optional().nullable(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  labels: z.array(z.string()).optional(),
  status: z.enum(['todo', 'inProgress', 'done']).optional(),
  goalId: z.number().positive().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  isPinned: z.boolean().optional(),
  isFocusToday: z.boolean().optional(),
})

function detectCategory(title: string): string {
  const lower = title.toLowerCase()
  if (['диплом', 'учёба', 'курс', 'экзамен', 'лекция', 'учить'].some(w => lower.includes(w))) return 'учёба'
  if (['работа', 'проект', 'клиент', 'офис', 'дедлайн', 'встреча'].some(w => lower.includes(w))) return 'работа'
  if (['спорт', 'бег', 'зал', 'тренировка', 'питание'].some(w => lower.includes(w))) return 'здоровье'
  if (['читать', 'книга', 'музыка', 'рисовать', 'игра'].some(w => lower.includes(w))) return 'хобби'
  return 'личное'
}

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, category, goalId, date, search } = req.query

    const threshold24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const where: any = {
      userId: req.userId!,
      parentId: null,
      // Исключаем задачи выполненные более 24ч назад — они в архиве
      NOT: {
        AND: [
          { status: 'done' },
          { completedAt: { lt: threshold24h } }
        ]
      }
    }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (category) where.category = category
    if (goalId) where.goalId = parseInt(goalId as string)
    if (search) where.title = { contains: search as string, mode: 'insensitive' }

    if (date) {
      const dateStr = date as string
      const startOfDay = new Date(dateStr + 'T00:00:00.000Z')
      const endOfDay = new Date(dateStr + 'T23:59:59.999Z')
      where.dueDate = { gte: startOfDay, lte: endOfDay }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { isFocusToday: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        goal: { select: { id: true, title: true, category: true } },
        subtasks: { select: { id: true, title: true, status: true } },
        sessions: {
          where: { status: 'completed' },
          select: { actualDuration: true }
        },
      }
    })

    const tasksWithTime = tasks.map(task => ({
      ...task,
      totalPomodoroMin: task.sessions.reduce((sum, s) => sum + s.actualDuration, 0),
    }))

    const PRIORITY_ORDER: Record<string, number> = {
      critical: 4, high: 3, medium: 2, low: 1
    }

    // JS сортировка работает правильно в отличие от Prisma
    const sortedTasks = [...tasksWithTime].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      if (a.isFocusToday !== b.isFocusToday) return a.isFocusToday ? -1 : 1
      const pa = PRIORITY_ORDER[a.priority] ?? 0
      const pb = PRIORITY_ORDER[b.priority] ?? 0
      if (pa !== pb) return pb - pa
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    res.json({ tasks: sortedTasks })
  } catch (error) {
    console.error('getTasks error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body
    let taskDueDate: Date | null = null

    if (data.dueDate && data.dueDate.trim() !== '') {
      taskDueDate = new Date(data.dueDate)
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { taskSlots: true, dailyTaskLimit: true }
    })
    const maxTotal = user?.taskSlots     ?? 20
    const maxDaily = user?.dailyTaskLimit ?? 10

    // Проверка общего лимита
    const totalActive = await prisma.task.count({
      where: { userId: req.userId!, status: { not: 'done' }, parentId: null }
    })
    if (totalActive >= maxTotal) {
      res.status(400).json({
        error: `Достигнут лимит задач (${maxTotal}). Купите дополнительный слот в магазине.`
      })
      return
    }

    // Проверка дневного лимита
    // Проверка дневного лимита
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const tomorrow = new Date(todayStart)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Дата, на которую создается задача
    const limitDate = taskDueDate || new Date()
    const targetDayStart = new Date(limitDate)
    targetDayStart.setHours(0, 0, 0, 0)

    const targetDayEnd = new Date(targetDayStart)
    targetDayEnd.setDate(targetDayEnd.getDate() + 1)

    const todayCount = await prisma.task.count({
      where: {
        userId: req.userId!,
        parentId: null,
        status: { not: 'done' },
        dueDate: {
          gte: targetDayStart,
          lt: targetDayEnd,
        },
      }
    })

    if (todayCount >= maxDaily) {
      res.status(400).json({
        error: `Достигнут дневной лимит задач (${maxDaily}). Купите улучшение в магазине.`
      })
      return
    }

    // Проверка цели
    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: data.goalId, userId: req.userId! }
      })
      if (!goal) {
        res.status(400).json({ error: 'Цель не найдена' })
        return
      }
    }

    const category = data.category || detectCategory(data.title)

    const isCritical = data.priority === 'critical'

    // Фокус только если критическая И срок сегодня (или срока нет)
    const shouldBeFocus =
      isCritical &&
      (!limitDate || (limitDate >= todayStart && limitDate < tomorrow))

    if (shouldBeFocus) {
      await prisma.task.updateMany({
        where: { userId: req.userId!, isFocusToday: true },
        data: { isFocusToday: false }
      })
    }

    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        category,
        labels: data.labels || [],
        goalId: data.goalId || null,
        parentId: data.parentId || null,
        dueDate: taskDueDate, 
        isFocusToday: shouldBeFocus, 
      },
      include: {
        goal: { select: { id: true, title: true, category: true } },
        subtasks: { select: { id: true, title: true, status: true } },
      }
    })

    res.status(201).json({ task: { ...task, totalPomodoroMin: 0 } })
  } catch (error) {
    console.error('createTask error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    type Priority = 'low' | 'medium' | 'high' | 'critical'
    const taskId = parseInt(req.params.id as string, 10)
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId! }
    })
    if (!existing) { res.status(404).json({ error: 'Задача не найдена' }); return }

    const updateData: any = { ...req.body }

    let userBeforeLevel: number | null = null

    let finalXp: number | null = null
    let finalGold: number | null = null
    let levelUp: { level: number; levelName: string } | null = null
    
    if (req.body.status === 'done' && existing.status !== 'done') {
      const priority = existing.priority as Priority

      updateData.completedAt = new Date()

      const userBefore = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { level: true }
      })
      userBeforeLevel = userBefore?.level ?? null

      const XP_BY_PRIORITY = {
        low: 15, medium: 30, high: 50, critical: 70
      }

      const GOLD_BY_PRIORITY = {
        low: 1, medium: 3, high: 5, critical: 8
      }

      const baseXp = XP_BY_PRIORITY[priority] ?? 15
      const baseGold = GOLD_BY_PRIORITY[priority] ?? 1

      const isOverdue = existing.dueDate && existing.status !== 'done' && new Date(existing.dueDate).getTime() < Date.now()
      const rewardMultiplier = isOverdue ? 0.8 : 1

      const pomodoroCount = await prisma.pomodoroSession.count({
        where: { taskId, status: 'completed' }
      })

      const bonusMultiplier = pomodoroCount > 0 ? 1.2 : 1

   
      const rawXp = Math.round(baseXp * bonusMultiplier * rewardMultiplier)
      const rawGold = Math.max(1,Math.round(baseGold * rewardMultiplier))
      const boostedRewards = await applyBoosters({
        userId: req.userId!,
        baseXp: rawXp,
        baseGold: rawGold,
        hasFocusBonus: false,
      })

      finalXp = boostedRewards.xp
      finalGold = boostedRewards.gold
      const updatedUser = await prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: req.userId! },
          data: { xp: { increment: finalXp! }, gold: { increment: finalGold! } }
        })

        const newLevel = getLevelFromXp(user.xp)

        if (newLevel !== user.level) {
          await tx.user.update({
            where: { id: req.userId! },
            data: { level: newLevel }
          })
        }

        await tx.rewardTransaction.createMany({
          data: [
            { userId: req.userId!, sourceType: 'task', sourceId: taskId, rewardType: 'xp', amount: finalXp! },
            { userId: req.userId!, sourceType: 'task', sourceId: taskId, rewardType: 'gold', amount: finalGold! },
          ]
        })

        return user
      })

      if (updatedUser && userBeforeLevel !== null) {
        const newLevel = getLevelFromXp(updatedUser.xp)

        if (newLevel > userBeforeLevel) {
          levelUp = {
            level: newLevel,
            levelName: getLevelName(newLevel)
          }
        }
      }
    }
    
    const newAchievements = await checkAchievementsForUser(req.userId!)
    
    if (existing.status === 'done' && req.body.status && req.body.status !== 'done') {
      res.status(400).json({
        error: 'Нельзя изменить статус выполненной задачи'
      })
      return
    }

    if (req.body.isFocusToday === true) {
      await prisma.task.updateMany({
        where: { userId: req.userId!, isFocusToday: true },
        data: { isFocusToday: false }
      })
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        goal: { select: { id: true, title: true, category: true } },
        subtasks: { select: { id: true, title: true, status: true } },
        sessions: { where: { status: 'completed' }, select: { actualDuration: true } },
      }
    })

    res.json({
      task: {
        ...task,
        totalPomodoroMin: task.sessions.reduce((s, sess) => s + sess.actualDuration, 0)
      },
      reward: req.body.status === 'done' && existing.status !== 'done'
        ? { xp: finalXp, gold: Number(finalGold?.toFixed(1)) }
        : null,
      levelUp,
      achievements: newAchievements
    })
  } catch (error) {
    console.error('updateTask error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const taskId = parseInt(req.params.id as string, 10)

    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId! }
    })
    if (!existing) {
      res.status(404).json({ error: 'Задача не найдена' })
      return
    }

    await prisma.task.delete({ where: { id: taskId } })
    res.json({ message: 'Задача удалена' })
  } catch (error) {
    console.error('deleteTask error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const getArchivedTasks = async (req: AuthRequest, res: Response) => {
  try {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 часа назад

    const tasks = await prisma.task.findMany({
      where: {
        userId: req.userId!,
        status: 'done',
        completedAt: { lt: threshold },
        parentId: null,
      },
      orderBy: { completedAt: 'desc' },
      take: 100,
      include: {
        goal: { select: { id: true, title: true, category: true } },
        sessions: { where: { status: 'completed' }, select: { actualDuration: true } }
      }
    })

    const tasksWithTime = tasks.map(t => ({
      ...t,
      totalPomodoroMin: t.sessions.reduce((s, sess) => s + sess.actualDuration, 0)
    }))

    res.json({ tasks: tasksWithTime })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
import { Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.string().optional(),
  labels: z.array(z.string()).default([]),
  goalId: z.number().positive().optional(),
  parentId: z.number().positive().optional(),
  dueDate: z.string().datetime().optional(),
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

    const where: any = { userId: req.userId!, parentId: null }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (category) where.category = category
    if (goalId) where.goalId = parseInt(goalId as string)
    if (search) where.title = { contains: search as string, mode: 'insensitive' }

    // Фильтрация по конкретной дате
    if (date) {
      const dateObj = new Date(date as string)
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0))
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999))
      where.dueDate = { gte: startOfDay, lte: endOfDay }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { isFocusToday: 'desc' },
        { priority: 'desc' },
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

    // Добавляем суммарное время помодоро к каждой задаче
    const tasksWithTime = tasks.map(task => ({
      ...task,
      totalPomodoroMin: task.sessions.reduce((sum, s) => sum + s.actualDuration, 0),
    }))

    res.json({ tasks: tasksWithTime })
  } catch (error) {
    console.error('getTasks error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body

    // Лимит 20 задач в сутки
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayCount = await prisma.task.count({
      where: {
        userId: req.userId!,
        createdAt: { gte: today, lt: tomorrow }
      }
    })

    if (todayCount >= 20) {
      res.status(429).json({ error: 'Достигнут лимит задач на сегодня (20 задач)' })
      return
    }

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

    // Критические задачи автоматически становятся фокус-задачей
    const isCritical = data.priority === 'critical'
    if (isCritical) {
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
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        isFocusToday: isCritical,
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
    const taskId = parseInt(req.params.id as string, 10)

    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId! }
    })
    if (!existing) {
      res.status(404).json({ error: 'Задача не найдена' })
      return
    }

    const updateData: any = { ...req.body }

    if (req.body.status === 'done' && existing.status !== 'done') {
      updateData.completedAt = new Date()
    }
    if (req.body.status !== 'done' && existing.status === 'done') {
      updateData.completedAt = null
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
        sessions: {
          where: { status: 'completed' },
          select: { actualDuration: true }
        },
      }
    })

    res.json({
      task: {
        ...task,
        totalPomodoroMin: task.sessions.reduce((sum, s) => sum + s.actualDuration, 0)
      }
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
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
  projectId: z.number().positive().optional(),
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
  projectId: z.number().positive().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  isPinned: z.boolean().optional(),
  isFocusToday: z.boolean().optional(),
})

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, goalId, search } = req.query

    const where: any = { userId: req.userId! }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (goalId) where.goalId = parseInt(goalId as string)
    if (search) where.title = { contains: search as string, mode: 'insensitive' }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { isFocusToday: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        goal: { select: { id: true, title: true, category: true } },
        subtasks: {
          select: { id: true, title: true, status: true }
        },
        _count: { select: { sessions: true } },
      }
    })
    res.json({ tasks })
  } catch (error) {
    console.error('getTasks error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body

    // Проверяем что цель принадлежит пользователю
    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: data.goalId, userId: req.userId! }
      })
      if (!goal) {
        res.status(400).json({ error: 'Цель не найдена' })
        return
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        labels: data.labels || [],
        goalId: data.goalId || null,
        projectId: data.projectId || null,
        parentId: data.parentId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        goal: { select: { id: true, title: true, category: true } },
        subtasks: { select: { id: true, title: true, status: true } },
      }
    })
    res.status(201).json({ task })
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

    // Если задача завершается — записываем время завершения
    const updateData: any = { ...req.body }
    if (req.body.status === 'done' && existing.status !== 'done') {
      updateData.completedAt = new Date()
    }
    if (req.body.status !== 'done' && existing.status === 'done') {
      updateData.completedAt = null
    }

    // Если назначается фокус-задача — снимаем флаг у остальных
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
      }
    })
    res.json({ task })
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
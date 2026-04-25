import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'

export const createGoalSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum(['учёба', 'работа', 'здоровье', 'хобби', 'личное', 'проект']).optional(),
  horizon: z.enum(['day', 'week', 'month', 'year', 'longterm']),
  plannedHours: z.number().positive().optional(),
  deadline: z.string().datetime().optional(),
})

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  category: z.enum(['учёба', 'работа', 'здоровье', 'хобби', 'личное', 'проект']).optional(),
  horizon: z.enum(['day', 'week', 'month', 'year', 'longterm']).optional(),
  plannedHours: z.number().positive().nullable().optional(),
  status: z.enum(['active', 'completed', 'paused']).optional(),
})

// Автоопределение категории по ключевым словам
function detectCategory(title: string): string {
  const lower = title.toLowerCase()
  if (['диплом', 'учёба', 'курс', 'экзамен', 'лекция', 'университет', 'учить'].some(w => lower.includes(w))) return 'учёба'
  if (['работа', 'проект', 'задача', 'клиент', 'офис', 'дедлайн'].some(w => lower.includes(w))) return 'работа'
  if (['спорт', 'здоровье', 'бег', 'зал', 'тренировка', 'питание', 'сон'].some(w => lower.includes(w))) return 'здоровье'
  if (['читать', 'книга', 'музыка', 'рисовать', 'игра', 'хобби'].some(w => lower.includes(w))) return 'хобби'
  return 'личное'
}

export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tasks: true } }
      }
    })
    res.json({ goals })
  } catch (error) {
    console.error('getGoals error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const createGoal = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body
    const category = data.category || detectCategory(data.title)

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title: data.title,
        category,
        horizon: data.horizon,
        plannedHours: data.plannedHours || null,
      }
    })
    res.status(201).json({ goal })
  } catch (error) {
    console.error('createGoal error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const updateGoal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const goalId = parseInt(id as string)

    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId: req.userId! }
    })
    if (!existing) {
      res.status(404).json({ error: 'Цель не найдена' })
      return
    }

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: req.body
    })
    res.json({ goal })
  } catch (error) {
    console.error('updateGoal error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const goalId = parseInt(id as string)

    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId: req.userId! }
    })
    if (!existing) {
      res.status(404).json({ error: 'Цель не найдена' })
      return
    }

    await prisma.goal.delete({ where: { id: goalId } })
    res.json({ message: 'Цель удалена' })
  } catch (error) {
    console.error('deleteGoal error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
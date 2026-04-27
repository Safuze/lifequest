import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'

export const createGoalSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum(['учёба', 'работа', 'здоровье', 'хобби', 'личное', 'проект']).optional(),
  horizon: z.enum(['day', 'week', 'month', 'year', 'longterm']).optional().default('longterm'),
  plannedHours: z.number().positive().optional(),
  deadline: z.string().optional(), // убираем .datetime() — принимаем любую строку
})

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  category: z.enum(['учёба', 'работа', 'здоровье', 'хобби', 'личное', 'проект']).optional(),
  horizon: z.enum(['day', 'week', 'month', 'year', 'longterm']).optional(),
  plannedHours: z.number().positive().nullable().optional(),
  deadline: z.string().optional().nullable(),
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

// Вычисляем горизонт автоматически из дедлайна
function getHorizonFromDeadline(deadline: string): string {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days <= 1) return 'day'
  if (days <= 7) return 'week'
  if (days <= 31) return 'month'
  if (days <= 365) return 'year'
  return 'longterm'
}

export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tasks: true } } }
    })
    res.json({ goals })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const createGoal = async (req: AuthRequest, res: Response) => {
  console.log('createGoal body:', req.body)
  try {
    const data = req.body
    const category = data.category || detectCategory(data.title)
    
    // Парсим дату правильно — deadline может прийти как '2025-04-27' или ISO string
    let deadline: Date | null = null
    if (data.deadline) {
      deadline = new Date(data.deadline)
      // Если невалидная дата — игнорируем
      if (isNaN(deadline.getTime())) deadline = null
    }
    
    const horizon = data.horizon || (deadline ? getHorizonFromDeadline(deadline.toISOString()) : 'longterm')

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title: data.title,
        category,
        horizon,
        plannedHours: data.plannedHours || null,
        deadline,
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
    const goalId = parseInt(req.params.id as string, 10)
    const existing = await prisma.goal.findFirst({ where: { id: goalId, userId: req.userId! } })
    if (!existing) { res.status(404).json({ error: 'Цель не найдена' }); return }

    const updateData: any = { ...req.body }
    if (req.body.deadline) {
      updateData.deadline = new Date(req.body.deadline)
      if (!req.body.horizon) {
        updateData.horizon = getHorizonFromDeadline(req.body.deadline)
      }
    }

    const goal = await prisma.goal.update({ where: { id: goalId }, data: updateData })
    res.json({ goal })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  try {
    const goalId = parseInt(req.params.id as string, 10)
    const existing = await prisma.goal.findFirst({ where: { id: goalId, userId: req.userId! } })
    if (!existing) { res.status(404).json({ error: 'Цель не найдена' }); return }
    await prisma.goal.delete({ where: { id: goalId } })
    res.json({ message: 'Цель удалена' })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
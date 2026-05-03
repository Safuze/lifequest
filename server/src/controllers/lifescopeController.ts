// src/controllers/lifescopeController.ts
import { Response } from 'express'
import { prisma } from '../prisma'
import { AuthRequest } from '../middleware/authMiddleware'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'
import { ru } from 'date-fns/locale'

function generateRecommendations(data: {
  pomodoroByCategory: Record<string, number>
  habitsCompletion: number
  tasksCompleted: number
  totalXp: number
}): string[] {
  const recs: string[] = []

  if (data.pomodoroByCategory['учёба'] === 0) {
    recs.push('На этой неделе не было учебных помодоро — попробуйте выделить хотя бы 1-2 часа на обучение.')
  }
  if (data.habitsCompletion < 50) {
    recs.push('Процент выполнения привычек ниже 50%. Попробуйте сократить список до 3-5 ключевых привычек.')
  }
  if (data.tasksCompleted < 5) {
    recs.push('Завершено мало задач за неделю. Разбивайте крупные задачи на подзадачи для более частого ощущения прогресса.')
  }
  if (data.totalXp > 500) {
    recs.push('Отличная неделя по количеству XP! Продолжайте в том же темпе.')
  }
  if (recs.length === 0) {
    recs.push('Продуктивная неделя! Постарайтесь сохранить этот ритм.')
  }
  return recs
}

async function buildWeeklyReport(userId: number, weekStart: Date, weekEnd: Date) {
  const [sessions, tasks, habits, rewards, prevRewards] = await Promise.all([
    // Помодоро сессии за неделю
    prisma.pomodoroSession.findMany({
      where: { userId, status: 'completed', completedAt: { gte: weekStart, lte: weekEnd } },
      include: { task: { select: { category: true } } }
    }),
    // Завершённые задачи
    prisma.task.findMany({
      where: { userId, status: 'done', completedAt: { gte: weekStart, lte: weekEnd } },
      select: { id: true, title: true, category: true, priority: true }
    }),
    // Привычки с логами за неделю
    prisma.habit.findMany({
      where: { userId, trackingType: 'discrete' },
      include: {
        logs: { where: { date: { gte: weekStart, lte: weekEnd } } }
      }
    }),
    // Награды за эту неделю
    prisma.rewardTransaction.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      select: { rewardType: true, amount: true }
    }),
    // Награды за предыдущую неделю
    prisma.rewardTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: subWeeks(weekStart, 1), lte: subWeeks(weekEnd, 1) }
      },
      select: { rewardType: true, amount: true }
    }),
  ])

  // Помодоро по категориям
  const pomodoroByCategory: Record<string, number> = {}
  let totalPomodoroMin = 0
  sessions.forEach(s => {
    const cat = s.task?.category || 'другое'
    pomodoroByCategory[cat] = (pomodoroByCategory[cat] || 0) + s.actualDuration
    totalPomodoroMin += s.actualDuration
  })

  // Привычки
  const habitStats = habits.map(h => {
    const daysInWeek = 7
    const expectedLogs = h.timesPerDay * daysInWeek
    const actualLogs = h.logs.length
    return {
      id: h.id,
      title: h.title,
      currentStreak: h.currentStreak,
      completionRate: expectedLogs > 0 ? Math.round((actualLogs / expectedLogs) * 100) : 0,
    }
  })
  const avgHabitCompletion = habitStats.length > 0
    ? Math.round(habitStats.reduce((s, h) => s + h.completionRate, 0) / habitStats.length)
    : 0

  // XP и золото
  const weekXp = rewards.filter(r => r.rewardType === 'xp').reduce((s, r) => s + r.amount, 0)
  const weekGold = rewards.filter(r => r.rewardType === 'gold').reduce((s, r) => s + r.amount, 0)
  const prevXp = prevRewards.filter(r => r.rewardType === 'xp').reduce((s, r) => s + r.amount, 0)
  const prevGold = prevRewards.filter(r => r.rewardType === 'gold').reduce((s, r) => s + r.amount, 0)

  const recommendations = generateRecommendations({
    pomodoroByCategory,
    habitsCompletion: avgHabitCompletion,
    tasksCompleted: tasks.length,
    totalXp: weekXp,
  })

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    weekLabel: `${format(weekStart, 'd MMM', { locale: ru })} – ${format(weekEnd, 'd MMM yyyy', { locale: ru })}`,
    totalPomodoroMin,
    pomodoroByCategory,
    tasksCompleted: tasks.length,
    tasks: tasks.slice(0, 10),
    habitStats,
    avgHabitCompletion,
    weekXp,
    weekGold,
    prevXp,
    prevGold,
    xpDelta: weekXp - prevXp,
    goldDelta: weekGold - prevGold,
    recommendations,
  }
}

export const getCurrentReport = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const report = await buildWeeklyReport(req.userId!, weekStart, weekEnd)
    res.json({ report })
  } catch (error) {
    console.error('getCurrentReport error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

export const getArchive = async (req: AuthRequest, res: Response) => {
  try {
    const weeks = parseInt(req.query.weeks as string || '8')
    const reports = []

    for (let i = 1; i <= Math.min(weeks, 12); i++) {
      const now = new Date()
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
      const report = await buildWeeklyReport(req.userId!, weekStart, weekEnd)
      reports.push(report)
    }

    res.json({ reports })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
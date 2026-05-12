import { prisma } from '../prisma'
import { getLevelFromXp } from './levelService'
import { LEVEL_XP } from './levelService'
type ProgressData = {
  dailyLogs: { date: string; value: number }[]
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// Пересчитываем прогресс конкретного испытания для пользователя
async function recalcUserChallenge(
  uc: { id: number; challengeId: number; userId: number; startedAt: Date; expiresAt: Date; progressData: any },
  challenge: { type: string; targetValue: number; durationDays: number }
): Promise<{ progress: number; status: string }> {
  const now = new Date()
  const today = getTodayStr()

  // Испытание просрочено
  if (now > uc.expiresAt) {
    const progress = await calcCurrentProgress(uc, challenge)
    const status = progress >= 100 ? 'completed' : 'failed'
    return { progress, status }
  }

  const progress = await calcCurrentProgress(uc, challenge)
  return { progress, status: progress >= 100 ? 'completed' : 'active' }
}

async function calcCurrentProgress(
  uc: { userId: number; startedAt: Date; expiresAt: Date; progressData: any },
  challenge: { type: string; targetValue: number; durationDays: number }
): Promise<number> {
  const { type, targetValue, durationDays } = challenge
  const start = new Date(uc.startedAt)
  start.setHours(0, 0, 0, 0)
  const end = new Date(uc.expiresAt)
  end.setHours(23, 59, 59, 999)
  const today = new Date()

  // Сколько дней прошло
  const daysPassed = Math.min(
    Math.floor((today.getTime() - start.getTime()) / 86400000) + 1,
    durationDays
  )

  if (type === 'pomodoro_daily') {
    // Целевое: targetValue минут в день каждый день
    const totalRequired = targetValue * durationDays

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: uc.userId,
        status: 'completed',
        completedAt: { gte: start, lte: end },
      },
      select: { actualDuration: true, completedAt: true }
    })

    // Группируем по дням
    const byDay: Record<string, number> = {}
    for (const s of sessions) {
      const d = s.completedAt!.toISOString().split('T')[0]
      byDay[d] = (byDay[d] || 0) + s.actualDuration
    }

    // Считаем дни когда выполнен дневной план
    let successDays = 0
    for (const mins of Object.values(byDay)) {
      if (mins >= targetValue) successDays++
    }

    return Math.min(Math.round((successDays / durationDays) * 100), 100)
  }

  if (type === 'tasks_daily') {
    // Целевое: targetValue задач в день каждый день
    const tasks = await prisma.task.findMany({
      where: {
        userId: uc.userId,
        status: 'done',
        completedAt: { gte: start, lte: end },
      },
      select: { completedAt: true }
    })

    const byDay: Record<string, number> = {}
    for (const t of tasks) {
      const d = t.completedAt!.toISOString().split('T')[0]
      byDay[d] = (byDay[d] || 0) + 1
    }

    let successDays = 0
    for (const count of Object.values(byDay)) {
      if (count >= targetValue) successDays++
    }

    return Math.min(Math.round((successDays / durationDays) * 100), 100)
  }

  if (type === 'habit_daily') {
    const habits = await prisma.habit.findMany({
      where: {
        userId: uc.userId,
        trackingType: 'discrete',
      },
      select: {
        id: true,
        timesPerDay: true,
      },
    })

    const logs = await prisma.habitLog.findMany({
      where: {
        habit: {
          userId: uc.userId,
        },
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        habitId: true,
        date: true,
      },
    })

    // day -> habitId -> count
    const byDay: Record<string, Record<number, number>> = {}

    for (const log of logs) {
      const day = log.date.toISOString().split('T')[0]

      if (!byDay[day]) {
        byDay[day] = {}
      }

      byDay[day][log.habitId] =
        (byDay[day][log.habitId] || 0) + 1
    }

    let successDays = 0

    for (const dayData of Object.values(byDay)) {
      let completedHabitsCount = 0

      for (const habit of habits) {
        const completedTimes = dayData[habit.id] || 0

        if (completedTimes >= habit.timesPerDay) {
          completedHabitsCount++
        }
      }

      if (completedHabitsCount >= targetValue) {
        successDays++
      }
    }
    console.log({
        type,
        successDays,
        durationDays,
      })

    return Math.min(
      Math.round((successDays / durationDays) * 100),
      100
    )
    
  }
  


  return 0
}

// Главная функция — вызывается после каждого события
export async function updateUserChallenges(userId: number): Promise<void> {
  const activeChallenges = await prisma.userChallenge.findMany({
    where: { userId, status: 'active' },
    include: { challenge: true }
  })

  if (activeChallenges.length === 0) return
  for (const uc of activeChallenges) {
    const { progress, status } = await recalcUserChallenge(uc, uc.challenge)

    if (status !== uc.status || Math.abs(progress - Number(uc.progress)) > 0.5) {
      await prisma.userChallenge.update({
        where: { id: uc.id },
        data: {
          progress,
          status,
          completedAt: status === 'completed' && !uc.completedAt ? new Date() : undefined,
        }
      })

      // Начисляем награду при завершении
      if (status === 'completed' && !uc.completedAt) {
        await prisma.$transaction(async (tx) => {
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              xp:   { increment: uc.challenge.rewardXp },
              gold: { increment: uc.challenge.rewardCredits },
            }
          })
          const newLevel = getLevelFromXp(updatedUser.xp)
          if (newLevel !== updatedUser.level) {
            await tx.user.update({ where: { id: userId }, data: { level: newLevel } })
          }
          await tx.rewardTransaction.createMany({
            data: [
              { userId, sourceType: 'challenge', sourceId: uc.challengeId, rewardType: 'xp',   amount: uc.challenge.rewardXp },
              { userId, sourceType: 'challenge', sourceId: uc.challengeId, rewardType: 'gold', amount: uc.challenge.rewardCredits },
            ]
          })
        })
      }
    }
  }
}
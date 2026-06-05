import { prisma } from '../prisma'
import { getLevelFromXp } from './levelService'
import { startOfLocalDay, endOfLocalDay, localDateKey } from '../utils/date'

console.log('CHALLENGE SERVICE LOADED')
// function getLocalDateKey(date: Date): string {
//   // Форматируем в UTC чтобы совпадало с тем как хранятся даты в БД
//   const y = date.getUTCFullYear()
//   const m = String(date.getUTCMonth() + 1).padStart(2, '0')
//   const d = String(date.getUTCDate()).padStart(2, '0')
//   return `${y}-${m}-${d}`
// }
function getWeekKey(date: Date): string {
  const d = new Date(date)

  const day = d.getDay()

  const diff =
    day === 0
      ? -6
      : 1 - day

  d.setDate(
    d.getDate() + diff
  )

  d.setHours(0,0,0,0)

  return localDateKey(d)
}

// Пересчитываем прогресс конкретного испытания для пользователя
async function recalcUserChallenge(
  uc: { id: number; challengeId: number; userId: number; startedAt: Date; expiresAt: Date; progressData: any },
  challenge: { type: string; targetValue: number; durationDays: number }
): Promise<{ progress: number; status: string }> {
  const now = new Date()
  const { progress, successDays } = await calcCurrentProgress(uc, challenge)


  // Испытание просрочено
  if (now > uc.expiresAt) {
    return { progress, status: progress >= 100 ? 'completed' : 'failed' }
  }

  // Считаем сколько дней уже прошло
  const start = startOfLocalDay(uc.startedAt)
  const todayStart = startOfLocalDay(now)
  const daysPassed = Math.floor((todayStart.getTime() - start.getTime()) / 86400000)

  // Дней осталось
  const daysLeft = Math.max(0, challenge.durationDays - daysPassed)

  // Максимально возможный прогресс если выполнять все оставшиеся дни
  // successDays = текущий прогресс в днях + daysLeft
  const currentSuccessDays = successDays
  const maxPossibleDays = currentSuccessDays + daysLeft
  const maxPossibleProgress = Math.round((maxPossibleDays / challenge.durationDays) * 100)
  console.log('CHALLENGE DEBUG', {
    challengeId: uc.challengeId,
    userId: uc.userId,
    progress,
    durationDays: challenge.durationDays,
    currentSuccessDays,
    daysPassed,
    daysLeft,
    maxPossibleDays,
    maxPossibleProgress,
    now,
    startedAt: uc.startedAt,
    expiresAt: uc.expiresAt,
  })
  if (maxPossibleProgress < 100) {
    return { progress, status: 'failed' }
  }

  return { progress, status: 'active' }
}

async function calcCurrentProgress(
  uc: { userId: number; startedAt: Date; expiresAt: Date; progressData: any },
  challenge: { type: string; targetValue: number; durationDays: number }
): Promise<{ progress: number; successDays: number }> {
  const { type, targetValue, durationDays } = challenge
  const today = new Date()
  
  // Сколько дней прошло
  const challengeStart = startOfLocalDay(uc.startedAt)
  const challengeEnd = endOfLocalDay(today)

  const daysPassed = Math.max(
    0,
    Math.min(
      Math.floor(
        (today.getTime() - challengeStart.getTime()) / 86400000
      ) + 1,
      durationDays
    )
  )

  if (type === 'pomodoro_daily') {
    // Целевое: targetValue минут в день каждый день

    const sessions = await prisma.pomodoroSession.findMany({
      where: {
        userId: uc.userId,
        status: 'completed',
        completedAt: { gte: challengeStart, lte: challengeEnd },
      },
      select: { actualDuration: true, completedAt: true }
    })

    // Группируем по дням
    const byDay: Record<string, number> = {}
    for (const s of sessions) {
      const d = localDateKey(s.completedAt!)
      byDay[d] = (byDay[d] || 0) + s.actualDuration
    }

    // Считаем дни когда выполнен дневной план
    let successDays = 0
    for (const mins of Object.values(byDay)) {
      if (mins >= targetValue) successDays++
    }

    return {
      progress: Math.min(Math.round((successDays / durationDays) * 100), 100),
      successDays
    }
  }

  if (type === 'tasks_daily') {
    // Целевое: targetValue задач в день каждый день
    const tasks = await prisma.task.findMany({
      where: {
        userId: uc.userId,
        status: 'done',
        completedAt: { gte: challengeStart, lte: challengeEnd },
      },
      select: { completedAt: true }
    })

    const byDay: Record<string, number> = {}
    for (const t of tasks) {
      const d = localDateKey(t.completedAt!)
      byDay[d] = (byDay[d] || 0) + 1
    }

    let successDays = 0
    for (const count of Object.values(byDay)) {
      if (count >= targetValue) successDays++
    }
    console.log('TASKS DAILY DEBUG', {
      challengeType: type,
      targetValue,
      successDays,
      durationDays,
      byDay,
    })
    return {
      progress: Math.min(Math.round((successDays / durationDays) * 100), 100),
      successDays
    }
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
        timesPerWeek: true,
        frequency: true,
      },
    })

    const logs = await prisma.habitLog.findMany({
      where: {
        habit: {
          userId: uc.userId,
        },
        date: {
          gte: challengeStart,
          lte: challengeEnd,
        },
      },
      select: {
        habitId: true,
        date: true,
      },
    })

    const byDay: Record<string, Record<number, number>> = {}

    // WEEKLY
    const byWeek: Record<string, Record<number, number>> = {}

    for (const log of logs) {
      const dayKey = localDateKey(log.date)
      const weekKey = getWeekKey(log.date)

      // DAILY
      if (!byDay[dayKey]) {
        byDay[dayKey] = {}
      }

      byDay[dayKey][log.habitId] =
        (byDay[dayKey][log.habitId] || 0) + 1

      // WEEKLY
      if (!byWeek[weekKey]) {
        byWeek[weekKey] = {}
      }

      byWeek[weekKey][log.habitId] =
        (byWeek[weekKey][log.habitId] || 0) + 1
    }

    let successDays = 0

    for (let i = 0; i < daysPassed; i++) {

      const currentDate = new Date(challengeStart)
      currentDate.setDate(
        currentDate.getDate() + i
      )
      const dayKey = localDateKey(currentDate)
      const dayData = byDay[dayKey] || {}

      let completedHabitsCount = 0

      const currentWeekKey = getWeekKey(currentDate)

      for (const habit of habits) {

        // DAILY
        if (habit.frequency === 'daily') {
          const completedTimes = dayData[habit.id] || 0

          if (completedTimes >= habit.timesPerDay) {
            completedHabitsCount++
          }
        }

        // WEEKLY
        if (habit.frequency === 'weekly') {

          const completedWeekTimes =
            byWeek[currentWeekKey]?.[habit.id] || 0

          const targetWeekTimes = habit.timesPerWeek || 1

          // weekly привычка считается выполненной
          // только в текущий день,
          // если недельная цель уже закрыта

          const isToday =
            dayKey === localDateKey(today)

          if (
            isToday &&
            completedWeekTimes >= targetWeekTimes
          ) {
            completedHabitsCount++
          }
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

    return {
      progress: Math.min(Math.round((successDays / durationDays) * 100), 100),
      successDays
    }
    
  }
  return {
    progress: 0, successDays: 0
  }
}

// Главная функция — вызывается после каждого события
export async function updateUserChallenges(userId: number): Promise<void> {

  console.log('UPDATE CHALLENGES CALLED', userId)

  const activeChallenges = await prisma.userChallenge.findMany({

    where: { userId, status: 'active' },
    include: { challenge: true }
  })
  console.log(
    'ACTIVE CHALLENGES',
    activeChallenges.length,
    activeChallenges.map(c => ({
      id: c.id,
      challengeId: c.challengeId,
      status: c.status,
      progress: c.progress
    }))
  )
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
              { userId, sourceType: 'challenge', sourceId: uc.challengeId, 
                rewardType: 'xp',   amount: uc.challenge.rewardXp },
              { userId, sourceType: 'challenge', sourceId: uc.challengeId, 
                rewardType: 'gold', amount: uc.challenge.rewardCredits },
            ]
          })
        })
      }
    }
  }
}
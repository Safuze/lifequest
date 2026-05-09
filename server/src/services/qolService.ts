import { prisma } from '../prisma'

const HABIT_SLOT_PRICES  = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140]
const TASK_SLOT_PRICES   = [40, 50, 60, 70, 80, 90,  100, 110, 120, 130]

const HABIT_SLOTS_DEFAULT = 10
const TASK_SLOTS_DEFAULT  = 20
const DAILY_TASK_DEFAULT  = 10

export const HABIT_SLOTS_MAX = 20
export const TASK_SLOTS_MAX  = 30
export const DAILY_TASK_MAX  = 20

// Текущий уровень = сколько докуплено слотов
export function habitUpgradeLevel(current: number) { return current - HABIT_SLOTS_DEFAULT }
export function taskUpgradeLevel(current: number)  { return current - TASK_SLOTS_DEFAULT  }

export function habitNextPrice(current: number): number | null {
  const level = habitUpgradeLevel(current)
  return level < HABIT_SLOT_PRICES.length ? HABIT_SLOT_PRICES[level] : null
}

export function taskNextPrice(current: number): number | null {
  const level = taskUpgradeLevel(current)
  return level < TASK_SLOT_PRICES.length ? TASK_SLOT_PRICES[level] : null
}

export async function buyHabitSlot(userId: number): Promise<{ error?: string; newLimit?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gold: true, habitSlots: true }
  })
  if (!user) return { error: 'Пользователь не найден' }
  if (user.habitSlots >= HABIT_SLOTS_MAX) return { error: 'Достигнут максимум слотов привычек' }

  const price = habitNextPrice(user.habitSlots)
  if (!price) return { error: 'Максимум достигнут' }
  if (user.gold < price) return { error: `Нужно ${price} 🪙` }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { gold: { decrement: price }, habitSlots: { increment: 1 } },
    select: { habitSlots: true }
  })
  return { newLimit: updated.habitSlots }
}

export async function buyTaskSlot(userId: number): Promise<{ error?: string; newLimit?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gold: true, taskSlots: true, dailyTaskLimit: true }
  })
  if (!user) return { error: 'Пользователь не найден' }
  if (user.taskSlots >= TASK_SLOTS_MAX) return { error: 'Достигнут максимум слотов задач' }

  const price = taskNextPrice(user.taskSlots)
  if (!price) return { error: 'Максимум достигнут' }
  if (user.gold < price) return { error: `Нужно ${price} 🪙` }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      gold: { decrement: price },
      taskSlots: { increment: 1 },
      dailyTaskLimit: user.dailyTaskLimit < DAILY_TASK_MAX ? { increment: 1 } : undefined,
    },
    select: { taskSlots: true, dailyTaskLimit: true }
  })
  return { newLimit: updated.taskSlots }
}
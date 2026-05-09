import { prisma } from '../prisma'

export type BoosterType = 'xp_boost' | 'gold_boost' | 'combo_boost'
export type PerkType    = 'xp_bonus' | 'gold_bonus'
const PERK_PRICES = [500, 600, 750, 950, 1200]
const MAX_PERK_LEVEL = 5
export interface RewardResult {
  xp: number
  gold: number
  appliedBoosters: string[]  // для дебага/логов
  appliedPerks: string[]
}

interface ApplyBoostersOptions {
  userId: number
  baseXp: number
  baseGold: number
  hasFocusBonus?: boolean
}

// Главная функция — применяет все активные бустеры и перки
export async function applyBoosters({
  userId,
  baseXp,
  baseGold,
  hasFocusBonus = false,
}: ApplyBoostersOptions) {

  const boosters = await prisma.activeBooster.findMany({
    where: {
      userId,
      expiresAt: {
        gte: new Date()
      }
    }
  })

  const perks = await prisma.permanentPerk.findMany({
    where: {
      userId,
      isActive: true,
    }
  })

  let xpMultiplier = 1
  let goldMultiplier = 1

  // ===== FOCUS BONUS =====

  if (hasFocusBonus) {
    xpMultiplier *= 1.5
    goldMultiplier *= 1.5
  }

  // ===== BOOSTERS =====

  const xpBooster = boosters
    .filter(b => b.type === 'xp_boost' || b.type === 'combo_boost')
    .sort((a, b) => b.multiplier - a.multiplier)[0]

  if (xpBooster) {
    xpMultiplier *= xpBooster.multiplier
  }

  const goldBooster = boosters
    .filter(b => b.type === 'gold_boost' || b.type === 'combo_boost')
    .sort((a, b) => b.multiplier - a.multiplier)[0]

  if (goldBooster) {
    goldMultiplier *= goldBooster.multiplier
  }

  // ===== PERKS =====

  const xpPerk = perks.find(p => p.type === 'xp_bonus')

  if (xpPerk) {
    xpMultiplier *= (1 + xpPerk.bonusPercent / 100)
  }

  const goldPerk = perks.find(p => p.type === 'gold_bonus')

  if (goldPerk) {
    goldMultiplier *= (1 + goldPerk.bonusPercent / 100)
  }

  // ===== FINAL =====

  const xp = Math.round(baseXp * xpMultiplier)

  const gold = Number(
    (baseGold * goldMultiplier).toFixed(2)
  )

  return { xp, gold }
}

// Активировать временный бустер
export async function activateBooster(
  userId: number,
  type: BoosterType,
  multiplier: number,
  durationMinutes: number,
): Promise<void> {

  const existing = await prisma.activeBooster.findFirst({
    where: {
      userId,
      type,
      expiresAt: {
        gte: new Date()
      }
    }
  })

  // Если уже есть активный бустер такого типа —
  // просто продлеваем время
  if (existing) {
    await prisma.activeBooster.update({
      where: { id: existing.id },
      data: {
        expiresAt: new Date(
          existing.expiresAt.getTime() + durationMinutes * 60_000
        ),
        multiplier: Math.max(existing.multiplier, multiplier),
      }
    })

    return
  }

  // Иначе создаём новый
  await prisma.activeBooster.create({
    data: {
      userId,
      type,
      multiplier,
      expiresAt: new Date(Date.now() + durationMinutes * 60_000),
    }
  })
}

// Добавить/улучшить постоянный перк
export async function addPermanentPerk(
  userId: number,
  type: PerkType,
): Promise<void> {

  const existing = await prisma.permanentPerk.findUnique({
    where: {
      userId_type: {
        userId,
        type
      }
    }
  })

  // Создаём новый
  if (!existing) {
    await prisma.permanentPerk.create({
      data: {
        userId,
        type,
        level: 1,
        bonusPercent: 10,
        isActive: true,
      }
    })

    return
  }

  // MAX LEVEL
  if (existing.level >= MAX_PERK_LEVEL) {
    throw new Error('Перк уже максимального уровня')
  }

  const nextLevel = existing.level + 1

  await prisma.permanentPerk.update({
    where: {
      userId_type: {
        userId,
        type
      }
    },
    data: {
      level: nextLevel,
      bonusPercent: nextLevel * 10,
      isActive: true,
    }
  })
}

// Очистка просроченных (можно вызывать по крону)
export async function cleanExpiredBoosters(): Promise<number> {
  const result = await prisma.activeBooster.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  })
  return result.count
}
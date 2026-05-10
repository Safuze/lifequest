import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware'
import { prisma } from '../prisma'
import { SHOP_ITEMS, getShopItem } from '../data/shopItems'
import { activateBooster, addPermanentPerk } from '../services/boosterService'
import {
  buyHabitSlot, buyTaskSlot,
  habitNextPrice, taskNextPrice,
  HABIT_SLOTS_MAX, TASK_SLOTS_MAX, DAILY_TASK_MAX,
  habitUpgradeLevel, taskUpgradeLevel,
} from '../services/qolService'
import { PETS, getPet } from '../data/pets'


const router = Router()
router.use(authMiddleware)

// Каталог магазина + что куплено
const PERK_PRICES = [500, 600, 750, 950, 1200]
router.get('/catalog', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { gold: true, avatarBorder: true, profileBg: true, permanentPerks: true, }
    })

    // Список купленных предметов из inventoryItem
    const purchased = await prisma.inventoryItem.findMany({
      where: { userId: req.userId! },
      select: { name: true, itemType: true }
    })
    const purchasedIds = new Set(purchased.map(p => p.name))
    const perksMap = new Map((user?.permanentPerks || []).map(perk => [perk.type,perk]))

    const catalog = SHOP_ITEMS.map(item => {
      const perk = item.perkConfig
        ? perksMap.get(item.perkConfig.type)
        : null

      const currentLevel = perk?.level || 0

      return {
        ...item,

        owned:
          purchasedIds.has(item.id) ||
          item.category === 'perk_permanent',

        equipped:
          item.category === 'avatar_border'
            ? user?.avatarBorder === item.id
            : item.category === 'profile_bg'
              ? user?.profileBg === item.id
              : false,

        // ДЛЯ FRONTEND
        level: currentLevel,

        maxLevel: 5,

        bonusPercent:
          perk?.bonusPercent ||
          currentLevel * (item.perkConfig?.bonusPercent || 0),

        perkActive: perk?.isActive || false,

        nextPrice:
          item.category === 'perk_permanent'
            ? currentLevel >= 5
              ? null
              : PERK_PRICES[currentLevel]
            : null,
      }
    })

    res.json({ catalog, gold: user?.gold || 0, equipped: { avatarBorder: user?.avatarBorder, profileBg: user?.profileBg } })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Купить предмет
router.post('/buy', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body

    const item = getShopItem(itemId)

    if (!item) {
      res.status(404).json({ error: 'Предмет не найден' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! }
    })

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' })
      return
    }

    let finalPrice = item.price
    let currentLevel = 0

    // ===== ПЕРКИ =====

    if (item.category === 'perk_permanent') {

      const existing = await prisma.permanentPerk.findUnique({
        where: {
          userId_type: {
            userId: req.userId!,
            type: item.perkConfig!.type
          }
        }
      })

      currentLevel = existing?.level || 0

      // максимум 5 уровней
      if (currentLevel >= 5) {
        res.status(400).json({
          error: 'Перк уже максимального уровня'
        })
        return
      }

      finalPrice = PERK_PRICES[currentLevel]
    }

    // ===== ПРОВЕРКА ЗОЛОТА =====

    if (user.gold < finalPrice) {
      res.status(400).json({
        error: `Нужно ${finalPrice} 🪙, у вас ${user.gold}`
      })
      return
    }

    // ===== РАСХОДУЕМЫЕ ПРЕДМЕТЫ =====

    const isConsumable =
      item.category === 'booster_temp' ||
      item.category === 'perk_permanent'

    // ===== КОСМЕТИКА =====

    if (!isConsumable) {

      const existing = await prisma.inventoryItem.findFirst({
        where: {
          userId: req.userId!,
          name: itemId
        }
      })

      if (existing) {
        res.status(400).json({
          error: 'Уже куплено'
        })
        return
      }
    }

    // ===== ТРАНЗАКЦИЯ =====

    await prisma.$transaction(async (tx) => {

      await tx.user.update({
        where: { id: req.userId! },
        data: {
          gold: {
            decrement: finalPrice
          }
        }
      })

      // косметика сохраняется в inventory
      if (!isConsumable) {

        await tx.inventoryItem.create({
          data: {
            userId: req.userId!,
            name: itemId,
            itemType: item.category,
            rarity: item.rarity,
          }
        })
      }
    })

    // ===== АКТИВАЦИЯ БУСТЕРОВ =====

    if (item.boosterConfig) {

      await activateBooster(
        req.userId!,
        item.boosterConfig.type,
        item.boosterConfig.multiplier,
        item.boosterConfig.durationMinutes,
      )
    }

    // ===== ПЕРКИ =====

    if (item.perkConfig) {

      await addPermanentPerk(
        req.userId!,
        item.perkConfig.type
      )
    }

    res.json({
      success: true,
      itemId,
      goldSpent: finalPrice
    })

  } catch (error) {

    console.error('Shop buy error:', error)

    res.status(500).json({
      error: 'Ошибка покупки'
    })
  }
})

// Надеть/снять предмет
router.post('/equip', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body
    const item = getShopItem(itemId)
    if (!item) { res.status(404).json({ error: 'Предмет не найден' }); return }

    // Проверяем что куплен
    if (item.price > 0) {
      const owned = await prisma.inventoryItem.findFirst({
        where: { userId: req.userId!, name: itemId }
      })
      if (!owned) { res.status(403).json({ error: 'Предмет не куплен' }); return }
    }

    const updateData: any = {}
    if (item.category === 'avatar_border') updateData.avatarBorder = itemId
    if (item.category === 'profile_bg') updateData.profileBg = itemId

    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: updateData,
      select: { avatarBorder: true, profileBg: true }
    })

    res.json({ success: true, equipped: updated })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Снять предмет (вернуть к default)
router.post('/unequip', async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.body

    const updateData: any = {}
    if (category === 'avatar_border') updateData.avatarBorder = 'none'
    if (category === 'profile_bg') updateData.profileBg = 'default'

    await prisma.user.update({ where: { id: req.userId! }, data: updateData })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// QoL-данные для каталога
router.get('/qol', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { gold: true, habitSlots: true, taskSlots: true, dailyTaskLimit: true }
    })
    if (!user) { res.status(404).json({ error: 'Не найден' }); return }

    res.json({
      gold: user.gold,
      habitSlot: {
        current: user.habitSlots,
        max: HABIT_SLOTS_MAX,
        level: habitUpgradeLevel(user.habitSlots),
        nextPrice: habitNextPrice(user.habitSlots),
        isMaxed: user.habitSlots >= HABIT_SLOTS_MAX,
      },
      taskSlot: {
        current: user.taskSlots,
        dailyCurrent: user.dailyTaskLimit,
        max: TASK_SLOTS_MAX,
        dailyMax: DAILY_TASK_MAX,
        level: taskUpgradeLevel(user.taskSlots),
        nextPrice: taskNextPrice(user.taskSlots),
        isMaxed: user.taskSlots >= TASK_SLOTS_MAX,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/qol/buy-habit-slot', async (req: AuthRequest, res: Response) => {
  try {
    const result = await buyHabitSlot(req.userId!)
    if (result.error) { res.status(400).json({ error: result.error }); return }
    res.json({ success: true, newLimit: result.newLimit })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/qol/buy-task-slot', async (req: AuthRequest, res: Response) => {
  try {
    const result = await buyTaskSlot(req.userId!)
    if (result.error) { res.status(400).json({ error: result.error }); return }
    res.json({ success: true, newLimit: result.newLimit })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Каталог питомцев
router.get('/pets', async (req: AuthRequest, res: Response) => {
  try {
    const [user, purchased] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId! },
        select: { gold: true, activePetId: true }
      }),
      prisma.inventoryItem.findMany({
        where: { userId: req.userId!, itemType: 'pet' },
        select: { name: true }
      })
    ])

    const ownedIds = new Set(purchased.map(p => p.name))

    const catalog = PETS.map(pet => ({
      ...pet,
      owned: ownedIds.has(pet.id),
      active: user?.activePetId === pet.id,
    }))

    res.json({ catalog, gold: user?.gold || 0, activePetId: user?.activePetId })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Купить питомца
router.post('/pets/buy', async (req: AuthRequest, res: Response) => {
  try {
    const { petId } = req.body
    const pet = getPet(petId)
    if (!pet) { res.status(404).json({ error: 'Питомец не найден' }); return }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { gold: true }
    })
    if (!user) { res.status(404).json({ error: 'Не найден' }); return }
    if (user.gold < pet.price) {
      res.status(400).json({ error: `Нужно ${pet.price} 🪙, у вас ${user.gold}` })
      return
    }

    const existing = await prisma.inventoryItem.findFirst({
      where: { userId: req.userId!, name: petId, itemType: 'pet' }
    })
    if (existing) { res.status(400).json({ error: 'Питомец уже в коллекции' }); return }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.userId! },
        data: { gold: { decrement: pet.price } }
      })
      await tx.inventoryItem.create({
        data: { userId: req.userId!, name: petId, itemType: 'pet', rarity: pet.rarity }
      })
    })

    res.json({ success: true, petId, goldSpent: pet.price })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Установить активного питомца
router.post('/pets/activate', async (req: AuthRequest, res: Response) => {
  try {
    const { petId } = req.body

    if (petId) {
      const owned = await prisma.inventoryItem.findFirst({
        where: { userId: req.userId!, name: petId, itemType: 'pet' }
      })
      if (!owned) { res.status(403).json({ error: 'Питомец не куплен' }); return }
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: { activePetId: petId || null }
    })
    res.json({ success: true, activePetId: petId || null })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware'
import { prisma } from '../prisma'
import { SHOP_ITEMS, getShopItem } from '../data/shopItems'

const router = Router()
router.use(authMiddleware)

// Каталог магазина + что куплено
router.get('/catalog', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { gold: true, avatarBorder: true, profileBg: true }
    })

    // Список купленных предметов из inventoryItem
    const purchased = await prisma.inventoryItem.findMany({
      where: { userId: req.userId! },
      select: { name: true, itemType: true }
    })
    const purchasedIds = new Set(purchased.map(p => p.name))

    const catalog = SHOP_ITEMS.map(item => ({
      ...item,
      owned: purchasedIds.has(item.id) || item.price === 0,
      equipped: item.category === 'avatar_border'
        ? user?.avatarBorder === item.id
        : user?.profileBg === item.id,
    }))

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
    if (!item) { res.status(404).json({ error: 'Предмет не найден' }); return }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) { res.status(404).json({ error: 'Пользователь не найден' }); return }

    if (user.gold < item.price) {
      res.status(400).json({ error: `Нужно ${item.price} 🪙, у вас ${user.gold}` })
      return
    }

    // Проверяем не куплен ли уже
    const existing = await prisma.inventoryItem.findFirst({
      where: { userId: req.userId!, name: itemId }
    })
    if (existing) { res.status(400).json({ error: 'Уже куплено' }); return }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.userId! },
        data: { gold: { decrement: item.price } }
      })
      await tx.inventoryItem.create({
        data: { userId: req.userId!, name: itemId, itemType: item.category, rarity: item.rarity }
      })
    })

    res.json({ success: true, itemId, goldSpent: item.price })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
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

export default router
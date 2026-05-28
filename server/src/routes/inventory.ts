import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware'
import { prisma } from '../prisma'
import { Response } from 'express'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { userId: req.userId! },
      select: { itemId: true, itemType: true, name: true, isActive: true, isEquipped: true, rarity: true,}
    })
    res.json({ items })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/equip', async (req: AuthRequest, res: Response) => {
  try {
    const { itemName } = req.body

    if (!itemName) {
      res.status(400).json({ error: 'itemName required' })
      return
    }

    const item = await prisma.inventoryItem.findFirst({
      where: {
        userId: req.userId!,
        name: itemName,
      }
    })

    if (!item) {
      res.status(404).json({ error: 'Предмет не найден' })
      return
    }

    // ПИТОМЕЦ

    if (item.itemType === 'pet') {

      await prisma.user.update({
        where: { id: req.userId! },
        data: {
          activePetId: item.name
        }
      })

      res.json({
        success: true,
        activePetId: item.name
      })

      return
    }

    // ОСТАЛЬНАЯ КОСМЕТИКА 

    await prisma.inventoryItem.updateMany({
      where: {
        userId: req.userId!,
        itemType: item.itemType
      },
      data: {
        isEquipped: false,
        isActive: false
      }
    })

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        isEquipped: true,
        isActive: true
      }
    })

    // sync user table
    if (item.itemType === 'avatar_border') {
      await prisma.user.update({
        where: { id: req.userId! },
        data: {
          avatarBorder: item.name
        }
      })
    }

    if (item.itemType === 'profile_bg') {
      await prisma.user.update({
        where: { id: req.userId! },
        data: {
          profileBg: item.name
        }
      })
    }

    res.json({
      success: true,
      item: updated
    })

  } catch (error) {
    console.error(error)

    res.status(500).json({
      error: 'Ошибка сервера'
    })
  }
})

export default router
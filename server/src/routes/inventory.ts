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
      select: { itemType: true, name: true, isActive: true }
    })
    res.json({ items })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/purchase', async (req: AuthRequest, res: Response) => {
  try {
    const { itemType, name, price } = req.body

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user || user.gold < price) {
      res.status(400).json({ error: 'Недостаточно золота' })
      return
    }

    // Проверяем что ещё не куплено
    const existing = await prisma.inventoryItem.findFirst({
      where: { userId: req.userId!, itemType, name }
    })
    if (existing) {
      res.status(400).json({ error: 'Уже куплено' })
      return
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId! },
        data: { gold: { decrement: price } }
      }),
      prisma.inventoryItem.create({
        data: {
          userId: req.userId!,
          itemType,
          name,
          rarity: price <= 100 ? 'common' : price <= 250 ? 'rare' : 'epic',
          source: 'shop',
          price,
        }
      })
    ])

    const updatedUser = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { gold: true, xp: true, level: true }
    })

    res.json({ success: true, user: updatedUser })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware'
import { prisma } from '../prisma'
import { Response } from 'express'

const router = Router()
router.use(authMiddleware)

router.patch('/me', async (req: AuthRequest, res: Response) => {
  try {
    const { goldDelta } = req.body
    if (typeof goldDelta !== 'number') {
      res.status(400).json({ error: 'goldDelta required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) { res.status(404).json({ error: 'Not found' }); return }

    if (user.gold + goldDelta < 0) {
      res.status(400).json({ error: 'Недостаточно золота' })
      return
    }

    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: { gold: { increment: goldDelta } },
      select: { id: true, gold: true, xp: true, level: true }
    })
    res.json({ user: updated })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

export default router
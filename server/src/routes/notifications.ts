import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware'
import { prisma } from '../prisma'

const router = Router()
router.use(authMiddleware)

// Получить уведомления
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId!, isRead: false }
    })
    res.json({ notifications, unreadCount })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Пометить как прочитанные
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, isRead: false },
      data: { isRead: true }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: parseInt(req.params.id as string, 10), userId: req.userId! } as any,
      data: { isRead: true }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

// Утилита для создания уведомлений — импортируй в других контроллерах
export async function createNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    await prisma.notification.create({ data: { userId, type, title, body, data } })
  } catch (error) {
    console.error('createNotification error:', error)
  }
}
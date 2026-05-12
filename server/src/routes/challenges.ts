import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware'
import { prisma } from '../prisma'
import { updateUserChallenges } from '../services/challengeService'
import { LEVEL_XP } from '../services/levelService'

const router = Router()
router.use(authMiddleware)

// Все доступные испытания
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [challenges, myActive] = await Promise.all([
      prisma.challenge.findMany({ where: { isActive: true }, orderBy: { entryFee: 'asc' } }),
      prisma.userChallenge.findMany({
        where: { userId: req.userId!, status: 'active' },
        select: { challengeId: true }
      })
    ])

    const activeIds = new Set(myActive.map(u => u.challengeId))

    res.json({
      challenges: challenges.map(c => ({
        ...c,
        isJoined: activeIds.has(c.id),
      }))
    })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Мои испытания
router.get('/my', async (req: AuthRequest, res: Response) => {
  try {
    const userChallenges = await prisma.userChallenge.findMany({
      where: { userId: req.userId! },
      include: { challenge: true },
      orderBy: { startedAt: 'desc' }
    })

    res.json({ challenges: userChallenges })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

// Присоединиться к испытанию
router.post('/join/:id', async (req: AuthRequest, res: Response) => {
  try {
    const challengeId = parseInt(req.params.id as string, 10)

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
    if (!challenge || !challenge.isActive) {
      res.status(404).json({ error: 'Испытание не найдено' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { gold: true }
    })
    if (!user || user.gold < challenge.entryFee) {
      res.status(400).json({ error: `Нужно ${challenge.entryFee} кредитов для участия` })
      return
    }

    // Проверка: уже участвует?
    const existing = await prisma.userChallenge.findUnique({
      where: { userId_challengeId: { userId: req.userId!, challengeId } }
    })
    if (existing && existing.status === 'active') {
      res.status(400).json({ error: 'Вы уже участвуете в этом испытании' })
      return
    }
    // Провалившееся можно перепройти
    if (existing && existing.status === 'failed') {
      await prisma.userChallenge.delete({ where: { id: existing.id } })
    }
    if (existing && existing.status === 'completed') {
      res.status(400).json({ error: 'Испытание уже пройдено' })
      return
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + challenge.durationDays * 24 * 60 * 60 * 1000)

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.userId! },
        data: { gold: { decrement: challenge.entryFee } }
      })
      await tx.userChallenge.create({
        data: {
          userId: req.userId!,
          challengeId,
          status: 'active',
          progress: 0,
          startedAt: now,
          expiresAt,
        }
      })
    })

    res.json({ success: true, message: `Вы вступили в испытание "${challenge.title}"` })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
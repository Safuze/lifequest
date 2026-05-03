import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware'
import { prisma } from '../prisma'
import { Response } from 'express'
import { startOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns'
import bcrypt from 'bcryptjs'
import { Hash } from 'node:crypto'
import { createNotification } from './notifications'


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

router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const today = new Date()
    const dayStart = new Date(today.setHours(0, 0, 0, 0))
    const dayEnd = new Date(today.setHours(23, 59, 59, 999))

    const [user, todayTasks, focusTask, pomodoroStats, habits, activeGoals] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, xp: true, gold: true, level: true }
      }),
      // Задачи на сегодня
      prisma.task.findMany({
        where: {
          userId,
          parentId: null,
          OR: [
            { dueDate: { gte: dayStart, lte: dayEnd } },
            { isFocusToday: true }
          ]
        },
        orderBy: [{ isPinned: 'desc' }, { isFocusToday: 'desc' }, { priority: 'desc' }],
        take: 7,
        include: { goal: { select: { title: true } } }
      }),
      // Фокус-задача
      prisma.task.findFirst({
        where: { userId, isFocusToday: true, status: { not: 'done' } },
        include: { goal: { select: { title: true } } }
      }),
      // Статистика помодоро за сегодня
      prisma.pomodoroSession.aggregate({
        where: {
          userId,
          status: 'completed',
          completedAt: { gte: dayStart, lte: dayEnd }
        },
        _sum: { actualDuration: true },
        _count: true
      }),
      // Привычки с сегодняшними логами
      prisma.habit.findMany({
        where: { userId },
        include: {
          logs: {
            where: { date: { gte: dayStart, lte: dayEnd } }
          }
        }
      }),
      // Активные цели
      prisma.goal.findMany({
        where: { userId, status: 'active' },
        take: 3,
        include: { _count: { select: { tasks: true } } }
      })
    ])

    // Стрик задач — считаем дни подряд когда была хоть одна завершённая задача
    const taskStreakDays = await prisma.task.findMany({
      where: { userId, status: 'done', completedAt: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: 'desc' }
    })

    let taskStreak = 0
    const checkedDays = new Set<string>()
    for (const t of taskStreakDays) {
      const d = t.completedAt!.toISOString().split('T')[0]
      if (!checkedDays.has(d)) {
        checkedDays.add(d)
        const prev = new Date(t.completedAt!)
        prev.setDate(prev.getDate() - checkedDays.size + 1)
        taskStreak++
      } else {
        break
      }
    }

    const habitsDone = habits.filter(h =>
      h.trackingType === 'discrete' && h.logs.length >= h.timesPerDay
    ).length

    res.json({
      user,
      todayTasks,
      focusTask,
      pomodoroMinutesToday: pomodoroStats._sum.actualDuration || 0,
      pomodoroSessionsToday: pomodoroStats._count || 0,
      habits: habits.map(h => ({
        id: h.id,
        title: h.title,
        type: h.type,
        trackingType: h.trackingType,
        currentStreak: h.currentStreak,
        isCompletedToday: h.trackingType === 'discrete'
          ? h.logs.length >= h.timesPerDay
          : false,
        logsToday: h.logs.length,
        timesPerDay: h.timesPerDay,
        startDate: h.startDate,
      })),
      habitsDone,
      habitsTotal: habits.filter(h => h.trackingType === 'discrete').length,
      taskStreak,
      activeGoals,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const period = (req.query.period as string) || 'week'

    const now = new Date()
    let since: Date

    // === ВСЕГДА считаем через UTC ===
    if (period === 'day') {
      // начало текущего дня (UTC)
      since = new Date(now)
      since.setUTCHours(0, 0, 0, 0)

    } else if (period === 'month') {
      // начало месяца (UTC)
      since = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
        0, 0, 0, 0
      ))

    } else {
      // неделя — 7 дней назад от начала сегодняшнего дня (UTC)
      const startOfTodayUTC = new Date(now)
      startOfTodayUTC.setUTCHours(0, 0, 0, 0)

      since = new Date(startOfTodayUTC.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // DEBUG
    console.log(
      'Profile period:',
      period,
      'since:',
      since.toISOString(),
      'now:',
      now.toISOString()
    )

    const [user, achievements, sessions, completedTasks, habits, goals, inventory, rewards] = await Promise.all([
      
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, xp: true, gold: true, level: true, createdAt: true }
      }),
      prisma.achievement.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.pomodoroSession.findMany({
        where: { userId, status: 'completed', completedAt: { gte: since } },
        select: { actualDuration: true }
      }),
      prisma.task.findMany({
        where: { userId, status: 'done', completedAt: { gte: since } },
        select: { id: true }
      }),
      prisma.habit.findMany({
        where: { userId, trackingType: 'discrete' },
        include: {
          logs: { where: { date: { gte: since } } }
        }
      }),
      prisma.goal.findMany({
        where: { userId, status: 'active' },
        select: { spentHours: true, plannedHours: true }
      }),
      prisma.inventoryItem.findMany({
        where: { userId },
        select: { name: true, itemType: true, rarity: true }
      }),
      prisma.rewardTransaction.findMany({
        where: {
          userId,
          createdAt: { gte: since }
        },
        select: { rewardType: true, amount: true }
      })
    ])
    console.log('REWARDS RAW:', rewards)
    console.log('SESSIONS RAW:', sessions)
    console.log('TASKS RAW:', completedTasks)
    if (!user) {
      res.status(404).json({ error: 'Не найден' })
      return
    }

    const totalPomodoroMin = sessions.reduce((s, sess) => s + sess.actualDuration, 0)
    const tasksCompleted = completedTasks.length

    const daysInPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30
    console.log('since:', since.toISOString())
    const habitsFullyDone = habits.filter(h => {
      const expected = h.timesPerDay * daysInPeriod
      return h.logs.length >= expected
    }).length

    const habitsCompletion = habits.length > 0
      ? Math.round((habitsFullyDone / habits.length) * 100)
      : 0

    const allCompletedTasks = await prisma.task.findMany({
      where: { userId, status: 'done', completedAt: { not: null } },
      select: { completedAt: true },
      orderBy: { completedAt: 'desc' }
    })

    let taskStreak = 0
    const seenDays = new Set<string>()
    let prevDate: Date | null = null

    for (const task of allCompletedTasks) {
      const d = task.completedAt!
      const dateStr = d.toISOString().split('T')[0]

      if (!seenDays.has(dateStr)) {
        if (prevDate === null) {
          seenDays.add(dateStr)
          prevDate = d
          taskStreak = 1
        } else {
          const diffDays = Math.floor((prevDate.getTime() - d.getTime()) / 86400000)

          if (diffDays <= 1) {
            seenDays.add(dateStr)
            prevDate = d
            taskStreak++
          } else {
            break
          }
        }
      }
    }

    const maxHabitStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0)
    const maxBestHabitStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak), 0)

    const goalsWithPlan = goals.filter(g => g.plannedHours && g.plannedHours > 0)

    const goalsProgress = goalsWithPlan.length > 0
      ? Math.round(
          goalsWithPlan.reduce((sum, g) =>
            sum + Math.min((g.spentHours / g.plannedHours!) * 100, 100), 0
          ) / goalsWithPlan.length
        )
      : 0

    const earnedXp = rewards
      .filter(r => r.rewardType === 'xp')
      .reduce((s, r) => s + r.amount, 0)

    const earnedGold = rewards
      .filter(r => r.rewardType === 'gold')
      .reduce((s, r) => s + r.amount, 0)

    const focusNorm = period === 'day' ? 60 : period === 'week' ? 420 : 1800
    const radarFocus = Math.min(Math.round((totalPomodoroMin / focusNorm) * 100), 100)

    const radarDiscipline = habitsCompletion
    const radarProgress = goalsProgress

    const taskNorm = period === 'day' ? 5 : period === 'week' ? 20 : 80
    const radarProductivity = Math.min(Math.round((tasksCompleted / taskNorm) * 100), 100)

    const goldNorm = period === 'day' ? 50 : period === 'week' ? 200 : 800
    const radarGold = Math.min(Math.round((earnedGold / goldNorm) * 100), 100)

    const LEVEL_XP = [0, 1000, 3000, 6000, 10000, 15000]
    const LEVEL_NAMES = ['Новичок', 'Ученик', 'Практик', 'Эксперт', 'Мастер', 'Легенда']

    let level = 0
    for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
      if (user.xp >= LEVEL_XP[i]) {
        level = i
        break
      }
    }

    const nextLevelXp = LEVEL_XP[level + 1] || LEVEL_XP[level] + 5000
    const prevLevelXp = LEVEL_XP[level]
    const xpProgress = Math.round(((user.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)

    res.json({
      user: {
        ...user,
        level,
        levelName: LEVEL_NAMES[level],
        xpProgress,
        nextLevelXp,
        prevLevelXp
      },
      stats: {
        totalPomodoroMin,
        tasksCompleted,
        habitsCompletion,
        taskStreak,
        maxHabitStreak,
        maxBestHabitStreak,
        earnedXp,
        earnedGold,
        goalsProgress,
      },
      radar: {
        focus: radarFocus,
        discipline: radarDiscipline,
        progress: radarProgress,
        productivity: radarProductivity,
        gold: radarGold
      },
      achievements,
      inventory,
      period,
    })

  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

// Leaderboard
router.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  try {
    const mode = (req.query.mode as string) || 'global'
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 100)

    let usersList: { id: number; name: string; xp: number; gold: number; level: number }[]

    if (mode === 'friends') {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { senderId: req.userId!, status: 'accepted' },
            { receiverId: req.userId!, status: 'accepted' }
          ]
        },
        select: { senderId: true, receiverId: true }
      })

      const friendIds = friendships.map(f =>
        f.senderId === req.userId! ? f.receiverId : f.senderId
      )
      friendIds.push(req.userId!)

      usersList = await prisma.user.findMany({
        where: { id: { in: friendIds } },
        select: { id: true, name: true, xp: true, gold: true, level: true },
        orderBy: { xp: 'desc' },
        take: limit,
      })
    } else {
      usersList = await prisma.user.findMany({
        select: { id: true, name: true, xp: true, gold: true, level: true },
        orderBy: { xp: 'desc' },
        take: limit,
      })
    }

    const LEVEL_NAMES = ['Новичок', 'Ученик', 'Практик', 'Эксперт', 'Мастер', 'Легенда']
    const leaderboard = usersList.map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      xp: u.xp,
      gold: u.gold,
      level: u.level,
      levelName: LEVEL_NAMES[Math.min(u.level, LEVEL_NAMES.length - 1)],
      isCurrentUser: u.id === req.userId!,
    }))

    const currentUserRank = leaderboard.find(u => u.isCurrentUser)?.rank ?? null
    res.json({ leaderboard, currentUserRank, mode })
  } catch (error) {
    console.error('Leaderboard error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

// Отправить заявку в друзья
router.post('/friends/request', async (req: AuthRequest, res: Response) => {
  
  try {
    const { friendId } = req.body
    if (!friendId || friendId === req.userId) {
      res.status(400).json({ error: 'Некорректный ID' })
      return
    }

    const target = await prisma.user.findUnique({ where: { id: friendId } })
    if (!target) { res.status(404).json({ error: 'Пользователь не найден' }); return }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: req.userId!, receiverId: friendId },
          { senderId: friendId, receiverId: req.userId! },
        ]
      }
    })
    
    if (existing) { res.status(400).json({ error: 'Заявка уже существует' }); return }

    // получаем текущего пользователя (отправителя)
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { name: true }
    })

    const friendship = await prisma.friendship.create({
      data: { senderId: req.userId!, receiverId: friendId, status: 'pending' }
    })

    await createNotification(
      friendId,
      'friend_request',
      'Новая заявка в друзья',
      `${user?.name || 'Пользователь'} хочет добавить вас в друзья`,
      {
        senderId: req.userId!,
        senderName: user?.name
      }
    )
    
    res.json({ friendship })
    
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

// Принять/отклонить заявку
router.patch('/friends/:id', async (req: AuthRequest, res: Response) => {
  try {
    const friendshipId = parseInt(req.params.id as string, 10)
    const { action } = req.body

    const friendship = await prisma.friendship.findFirst({
      where: { id: friendshipId, receiverId: req.userId! }
    })
    if (!friendship) { res.status(404).json({ error: 'Заявка не найдена' }); return }

    if (action === 'accept') {
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: 'accepted' }
      })
    } else {
      await prisma.friendship.delete({ where: { id: friendshipId } })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

// Список друзей и входящих заявок
router.get('/friends', async (req: AuthRequest, res: Response) => {
  try {
    const [accepted, incoming] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          OR: [
            { senderId: req.userId!, status: 'accepted' },
            { receiverId: req.userId!, status: 'accepted' }
          ]
        },
        include: {
          sender: { select: { id: true, name: true, xp: true, level: true } },
          receiver: { select: { id: true, name: true, xp: true, level: true } },
        }
      }),
      prisma.friendship.findMany({
        where: { receiverId: req.userId!, status: 'pending' },
        include: {
          sender: { select: { id: true, name: true, xp: true, level: true } }
        }
      })
    ])

    const friends = accepted.map(f => {
      const friend = f.senderId === req.userId! ? f.receiver : f.sender
      return { ...friend, friendshipId: f.id }
    })

    const incomingMapped = incoming.map(f => ({
      friendshipId: f.id,
      user: f.sender
    }))

    res.json({ friends, incoming: incomingMapped })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

// Публичный профиль
router.get('/:id/public', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string, 10) 
    if (isNaN(userId)) { res.status(400).json({ error: 'Некорректный ID' }); return }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, xp: true, gold: true, level: true, createdAt: true, isProfilePublic: true }
    })
    if (!user) { res.status(404).json({ error: 'Не найден' }); return }

    if (!user.isProfilePublic && req.userId !== userId) {
      res.json({ user: { id: user.id, name: user.name, level: user.level, xp: user.xp, isPrivate: true } })
      return
    }

    const since7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [achievements, habits, sessions, tasks, goals, rewards, inventory] = await Promise.all([
      prisma.achievement.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.habit.findMany({
        where: { userId, trackingType: 'discrete' },
        select: { title: true, currentStreak: true, bestStreak: true, timesPerDay: true },
        orderBy: { currentStreak: 'desc' }, take: 5,
      }),
      prisma.pomodoroSession.findMany({
        where: { userId, status: 'completed', completedAt: { gte: since7days } },
        select: { actualDuration: true }
      }),
      prisma.task.findMany({
        where: { userId, status: 'done', completedAt: { gte: since7days } },
        select: { id: true }
      }),
      prisma.goal.findMany({ where: { userId, status: 'active' }, select: { spentHours: true, plannedHours: true } }),
      prisma.rewardTransaction.findMany({
        where: { userId, createdAt: { gte: since7days } },
        select: { rewardType: true, amount: true }
      }),
      prisma.inventoryItem.findMany({ where: { userId }, select: { name: true, itemType: true, rarity: true } }),
    ])

    const allSessions = await prisma.pomodoroSession.aggregate({
      where: { userId, status: 'completed' },
      _sum: { actualDuration: true },
      _count: true,
    })
    const allTasksCount = await prisma.task.count({ where: { userId, status: 'done' } })

    const totalPomodoroMin7d = sessions.reduce((s, sess) => s + sess.actualDuration, 0)
    const tasksCompleted7d = tasks.length
    const earnedGold7d = rewards.filter(r => r.rewardType === 'gold').reduce((s, r) => s + r.amount, 0)

    const habitsFullyDone = habits.filter(h => h.currentStreak > 0).length
    const habitsCompletion = habits.length > 0 ? Math.round((habitsFullyDone / habits.length) * 100) : 0

    const goalsWithPlan = goals.filter(g => g.plannedHours && g.plannedHours > 0)
    const goalsProgress = goalsWithPlan.length > 0
      ? Math.round(goalsWithPlan.reduce((sum, g) => sum + Math.min((g.spentHours / g.plannedHours!) * 100, 100), 0) / goalsWithPlan.length)
      : 0

    const radar = {
      focus: Math.min(Math.round((totalPomodoroMin7d / 420) * 100), 100),
      discipline: habitsCompletion,
      progress: goalsProgress,
      productivity: Math.min(Math.round((tasksCompleted7d / 20) * 100), 100),
      gold: Math.min(Math.round((earnedGold7d / 200) * 100), 100),
    }

    res.json({
      user: { id: user.id, name: user.name, xp: user.xp, gold: user.gold, level: user.level, createdAt: user.createdAt, isPrivate: false },
      achievements,
      topHabits: habits,
      totalPomodoroMin: allSessions._sum.actualDuration || 0,
      totalSessions: allSessions._count,
      tasksCompleted: allTasksCount,
      radar,
      inventory,
    })
  } catch (error) {
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
})

router.delete('/friends/:id', async (req: AuthRequest, res: Response) => {
  try {
    const friendId = parseInt(req.params.id as string, 10)
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { senderId: req.userId!, receiverId: friendId },
          { senderId: friendId, receiverId: req.userId! }
        ],
        status: 'accepted'
      }
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true, name: true, email: true, level: true, xp: true, gold: true,
        isProfilePublic: true, createdAt: true
      }
    })
    if (!user) { res.status(404).json({ error: 'Не найден' }); return }
    res.json({ user })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.patch('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { name, currentPassword, newPassword, isProfilePublic } = req.body

    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) { res.status(404).json({ error: 'Не найден' }); return }

    const updateData: any = {}

    if (name && name.trim().length >= 2) {
      updateData.name = name.trim()
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Введите текущий пароль' })
        return
      }
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash!)
      if (!isValid) {
        res.status(400).json({ error: 'Неверный текущий пароль' })
        return
      }
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'Новый пароль минимум 6 символов' })
        return
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 12)
    }

    if (typeof isProfilePublic === 'boolean') {
      updateData.isProfilePublic = isProfilePublic
    }

    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: updateData,
      select: { id: true, name: true, email: true, isProfilePublic: true }
    })

    res.json({ user: updated })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/account', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) { res.status(404).json({ error: 'Не найден' }); return }

    const isValid = await bcrypt.compare(password, user.passwordHash!)
    if (!isValid) { res.status(400).json({ error: 'Неверный пароль' }); return }

    await prisma.user.delete({ where: { id: req.userId! } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/achievements', async (req: AuthRequest, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ achievements })
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router
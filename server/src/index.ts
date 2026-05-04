import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import authRouter from './routes/auth'
import goalsRouter from './routes/goals'
import tasksRouter from './routes/tasks'
import pomodoroRouter from './routes/pomodoro'
import usersRouter from './routes/users'
import habitsRouter from './routes/habits'
import inventoryRouter from './routes/inventory'
import lifescopeRouter from './routes/lifescope'
import notificationsRouter from './routes/notifications'
import { PrismaClient } from '@prisma/client'
import shopRouter from './routes/shop'

const prisma = new PrismaClient()
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/goals', goalsRouter)
app.use('/api/v1/tasks', tasksRouter)
app.use('/api/v1/pomodoro', pomodoroRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/habits', habitsRouter)
app.use('/api/v1/inventory', inventoryRouter)
app.use('/api/v1/lifescope', lifescopeRouter)
app.use('/api/v1/notifications', notificationsRouter)
app.use('/api/v1/shop', shopRouter)

setInterval(async () => {
  try {
    const now = new Date()
    const in1hour = new Date(now.getTime() + 60 * 60 * 1000)

    const dueTasks = await prisma.task.findMany({
      where: {
        status: { not: 'done' },
        dueDate: {
          gte: now,
          lte: in1hour,
        },
      },
      include: {
        user: { select: { id: true } }
      }
    })

    for (const task of dueTasks) {
      // проверяем — не создавали ли уже уведомление
      const existing = await prisma.notification.findFirst({
        where: {
          userId: task.user.id,
          type: 'task_due',
          data: {
            path: ['taskId'],
            equals: task.id
          }
        }
      })

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: task.user.id,
            type: 'task_due',
            title: 'Задача скоро истекает',
            body: `«${task.title}» — срок через час`,
            data: { taskId: task.id }
          }
        })
      }
    }

  } catch (error) {
    console.error('Task notification cron error:', error)
  }
}, 60 * 60 * 1000) // каждый час
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
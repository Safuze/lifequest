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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
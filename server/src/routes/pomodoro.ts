import { Router } from 'express'
import {
  getSettings, updateSettings, startSession,
  completeSession, getActiveSession, getTodayStats,
  settingsSchema, createSessionSchema, completeSessionSchema
} from '../controllers/pomodoroController'
import { authMiddleware } from '../middleware/authMiddleware'
import { validate } from '../middleware/validateMiddleware'

const router = Router()
router.use(authMiddleware)

router.get('/settings', getSettings)
router.patch('/settings', validate(settingsSchema), updateSettings)
router.get('/active', getActiveSession)
router.get('/today-stats', getTodayStats)
router.post('/sessions', validate(createSessionSchema), startSession)
router.patch('/sessions/:id/complete', validate(completeSessionSchema), completeSession)

export default router
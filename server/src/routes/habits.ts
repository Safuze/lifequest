import { Router } from 'express'
import {
  getHabits, createHabit, deleteHabit, logHabit,
  breakContinuousHabit, restoreStreak, skipRestoreStreak, getHeatmap,
  getTemplates, createHabitSchema, updateHabit
} from '../controllers/habitController'
import { authMiddleware } from '../middleware/authMiddleware'
import { validate } from '../middleware/validateMiddleware'

const router = Router()
router.use(authMiddleware)

router.get('/templates', getTemplates)
router.get('/', getHabits)
router.post('/', validate(createHabitSchema), createHabit)
router.delete('/:id', deleteHabit)
router.post('/:id/log', logHabit)
router.post('/:id/break', breakContinuousHabit)
router.post('/:id/restore-streak', restoreStreak)
router.post('/:id/skip-restore', skipRestoreStreak)
router.get('/:id/heatmap', getHeatmap)
router.get('/heatmap', getHeatmap)
router.patch('/:id', updateHabit)

export default router
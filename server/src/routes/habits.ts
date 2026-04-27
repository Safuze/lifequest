import { Router } from 'express'
import {
  getHabits, createHabit, deleteHabit, logHabit,
  restoreStreak, getHeatmap, getTemplates,
  createHabitSchema, updateHabitSchema
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
router.post('/:id/restore-streak', restoreStreak)
router.get('/:id/heatmap', getHeatmap)

export default router
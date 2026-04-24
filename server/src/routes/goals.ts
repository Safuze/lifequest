import { Router } from 'express'
import { getGoals, createGoal, updateGoal, deleteGoal, createGoalSchema, updateGoalSchema } from '../controllers/goalController'
import { authMiddleware } from '../middleware/authMiddleware'
import { validate } from '../middleware/validateMiddleware'

const router = Router()

router.use(authMiddleware)

router.get('/', getGoals)
router.post('/', validate(createGoalSchema), createGoal)
router.patch('/:id', validate(updateGoalSchema), updateGoal)
router.delete('/:id', deleteGoal)

export default router
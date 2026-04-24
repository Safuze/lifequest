import { Router } from 'express'
import {
  getTasks, createTask, updateTask, deleteTask,
  createTaskSchema, updateTaskSchema
} from '../controllers/taskController'
import { authMiddleware } from '../middleware/authMiddleware'
import { validate } from '../middleware/validateMiddleware'

const router = Router()
router.use(authMiddleware)

router.get('/', getTasks)
router.post('/', validate(createTaskSchema), createTask)
router.patch('/:id', validate(updateTaskSchema), updateTask)
router.delete('/:id', deleteTask)

export default router
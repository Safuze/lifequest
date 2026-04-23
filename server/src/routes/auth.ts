import { Router } from 'express'
import { register, login, refresh, getMe, registerSchema, loginSchema } from '../controllers/authController'
import { validate } from '../middleware/validateMiddleware'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.post('/refresh', refresh)
router.get('/me', authMiddleware, getMe)

export default router
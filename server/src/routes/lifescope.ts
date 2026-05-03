import { Router } from 'express'
import { getCurrentReport, getArchive } from '../controllers/lifescopeController'
import { authMiddleware } from '../middleware/authMiddleware'

const router = Router()
router.use(authMiddleware)
router.get('/current', getCurrentReport)
router.get('/archive', getArchive)
export default router
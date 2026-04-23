import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_CONFIG } from '../config/constants'

export interface AuthRequest extends Request {
  userId?: number
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Токен не предоставлен' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, JWT_CONFIG.accessSecret) as { userId: number }
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Недействительный токен' })
  }
}
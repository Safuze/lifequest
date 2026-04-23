import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Ошибка валидации',
        details: result.error.flatten().fieldErrors
      })
      return
    }
    req.body = result.data
    next()
  }
}
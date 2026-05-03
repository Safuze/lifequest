import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Очищаем пустые строки — Zod enum не принимает ""
    const cleanBody = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => [k, v === '' ? undefined : v])
    )
    const result = schema.safeParse(cleanBody)
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
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../prisma'
import { JWT_CONFIG, BCRYPT_ROUNDS } from '../config/constants'

// Схемы валидации
export const registerSchema = z.object({
  name: z.string().min(2, 'Имя минимум 2 символа').max(50),
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль минимум 6 символов'),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Генерация токенов
const generateTokens = (userId: number) => {
  const accessToken = jwt.sign(
    { userId },
    JWT_CONFIG.accessSecret,
    { expiresIn: JWT_CONFIG.accessExpiresIn }
  )
  const refreshToken = jwt.sign(
    { userId },
    JWT_CONFIG.refreshSecret,
    { expiresIn: JWT_CONFIG.refreshExpiresIn }
  )
  return { accessToken, refreshToken }
}

// Регистрация
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body

    // Проверяем существует ли пользователь
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'Email уже используется' })
      return
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // Создаём пользователя
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: {
        id: true,
        publicId: true,
        name: true,
        email: true,
        level: true,
        xp: true,
        gold: true,
        characterClass: true,
        avatar: true,
        createdAt: true,
      }
    })

    const tokens = generateTokens(user.id)

    res.status(201).json({ user, ...tokens })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

// Логин
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Неверный email или пароль' })
      return
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      res.status(401).json({ error: 'Неверный email или пароль' })
      return
    }

    const tokens = generateTokens(user.id)

    res.json({
      user: {
        id: user.id,
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        level: user.level,
        xp: user.xp,
        gold: user.gold,
        characterClass: user.characterClass,
        avatar: user.avatar,
      },
      ...tokens
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}

// Обновление токена
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token не предоставлен' })
      return
    }

    const payload = jwt.verify(
      refreshToken,
      JWT_CONFIG.refreshSecret
    ) as { userId: number }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true }
    })

    if (!user) {
      res.status(401).json({ error: 'Пользователь не найден' })
      return
    }

    const tokens = generateTokens(user.id)
    res.json(tokens)
  } catch {
    res.status(401).json({ error: 'Недействительный refresh token' })
  }
}

// Получить текущего пользователя
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        publicId: true,
        name: true,
        email: true,
        level: true,
        xp: true,
        gold: true,
        characterClass: true,
        avatar: true,
        theme: true,
        createdAt: true,
      }
    })

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' })
      return
    }

    res.json({ user })
  } catch (error) {
    console.error('GetMe error:', error)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
}
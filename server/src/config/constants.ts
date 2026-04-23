export const JWT_CONFIG = {
  accessSecret: process.env.JWT_SECRET || 'fallback-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
} as const

export const BCRYPT_ROUNDS = 12
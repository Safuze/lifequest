const TZ_OFFSET_MS = 3 * 60 * 60 * 1000 // UTC+3 (МСК)

export function startOfLocalDay(date: Date = new Date()): Date {
  // переводим в локальное время, обнуляем, переводим обратно в UTC
  const local = new Date(date.getTime() + TZ_OFFSET_MS)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() - TZ_OFFSET_MS)
}

export function endOfLocalDay(date: Date = new Date()): Date {
  const local = new Date(date.getTime() + TZ_OFFSET_MS)
  local.setUTCHours(23, 59, 59, 999)
  return new Date(local.getTime() - TZ_OFFSET_MS)
}

export function localDateKey(date: Date): string {
  const local = new Date(date.getTime() + TZ_OFFSET_MS)
  const y = local.getUTCFullYear()
  const m = String(local.getUTCMonth() + 1).padStart(2, '0')
  const d = String(local.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function startOfLocalWeek(date: Date = new Date()): Date {
  const start = startOfLocalDay(date)
  const local = new Date(start.getTime() + TZ_OFFSET_MS)
  const day = local.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(start.getTime() + diff * 86400000)
}
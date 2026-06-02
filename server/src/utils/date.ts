export function startOfLocalDay(date = new Date()) {
  const d = new Date(date)

  d.setHours(0, 0, 0, 0)

  return d
}

export function endOfLocalDay(date = new Date()) {
  const d = new Date(date)

  d.setHours(23, 59, 59, 999)

  return d
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}
export function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatWeekStart(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return formatDateKey(d)
}

export function parseWeekStart(weekStart: string): Date {
  const [y, m, d] = weekStart.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setHours(0, 0, 0, 0)
  return date
}

export function shiftWeekStart(weekStart: string, weeks: number): string {
  const date = parseWeekStart(weekStart)
  date.setDate(date.getDate() + weeks * 7)
  return formatWeekStart(date)
}

export function dateFromWeekDay(weekStart: string, dayIndex: number): string {
  const date = parseWeekStart(weekStart)
  date.setDate(date.getDate() + dayIndex)
  return formatDateKey(date)
}

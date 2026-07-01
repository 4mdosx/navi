export function formatWeekStart(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

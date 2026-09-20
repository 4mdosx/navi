export const WEEK_MS = 7 * 86_400_000
export const DAY_MS = 86_400_000
export const TIMELINE_PAGE_SIZE = 5
export const ACTIVITY_MAX_WEEKS = 16

export function startOfWeek(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() - result.getDay())
  return result
}

export function firstWeekOfYear(year: number) {
  return startOfWeek(new Date(year, 0, 1))
}

export function formatWeekDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** 今年第一周到当前周后一周；末页不足 TIMELINE_PAGE_SIZE 时用去年周向前补足 */
export function buildWeekList(now: Date = new Date()): Date[] {
  const currentWeek = startOfWeek(now)
  const year = now.getFullYear()
  const rangeStart = firstWeekOfYear(year)
  const rangeEnd = new Date(currentWeek.getTime() + WEEK_MS)

  const weeks: Date[] = []
  for (let time = rangeStart.getTime(); time <= rangeEnd.getTime(); time += WEEK_MS) {
    weeks.push(new Date(time))
  }

  const remainder = weeks.length % TIMELINE_PAGE_SIZE
  if (remainder > 0) {
    const padCount = TIMELINE_PAGE_SIZE - remainder
    for (let i = 1; i <= padCount; i++) {
      weeks.unshift(new Date(rangeStart.getTime() - i * WEEK_MS))
    }
  }

  return weeks
}

/** 保留时间进度日历周列表中较新的部分，供热点图复用 */
export function truncateWeeksForActivity(weeks: Date[]) {
  return weeks.slice(-ACTIVITY_MAX_WEEKS)
}

export function expandWeeksToDays(weeks: Date[]) {
  return weeks.flatMap((weekStart) =>
    Array.from({ length: 7 }, (_, dayIndex) => new Date(weekStart.getTime() + dayIndex * DAY_MS))
  )
}

export function weekNumber(date: Date) {
  const first = firstWeekOfYear(date.getFullYear())
  return Math.floor((startOfWeek(date).getTime() - first.getTime()) / WEEK_MS) + 1
}

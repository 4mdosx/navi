/** Local midnight of the given instant. */
export function startOfLocalDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Sunday 00:00 of the calendar week that contains `date` (week runs Sun–Sat).
 */
export function getSundayOfWeekContaining(date: Date): Date {
  const d = startOfLocalDay(date)
  const dow = d.getDay() // 0 = Sunday … 6 = Saturday
  d.setDate(d.getDate() - dow)
  return d
}

export function addLocalDays(date: Date, delta: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + delta)
  return d
}

/** Seven dates from Sunday (index 0) to Saturday (index 6). */
export function getWeekDaysFromSunday(sunday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addLocalDays(sunday, i))
}

/** Integer hours for grid rows: [startHour, endHour). */
export function getHourRange(startHour: number, endHour: number): number[] {
  const safeStart = Math.max(0, Math.min(23, Math.floor(startHour)))
  const safeEnd = Math.max(safeStart + 1, Math.min(24, Math.floor(endHour)))
  return Array.from(
    { length: safeEnd - safeStart },
    (_, i) => safeStart + i
  )
}

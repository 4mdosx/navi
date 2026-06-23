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

export type ScheduleSlot = {
  /** Index within the requested [startHour, endHour) range. */
  index: number
  hour: number
  minute: number
}

/** 15-minute slots for grid rows: [startHour, endHour). */
export function getSlotRange(
  startHour: number,
  endHour: number,
  slotMinutes = 15
): ScheduleSlot[] {
  const slotsPerHour = 60 / slotMinutes
  const safeStart = Math.max(0, Math.min(23, Math.floor(startHour)))
  const safeEnd = Math.max(safeStart + 1, Math.min(24, Math.floor(endHour)))
  const totalSlots = (safeEnd - safeStart) * slotsPerHour
  return Array.from({ length: totalSlots }, (_, i) => {
    const absoluteSlot = safeStart * slotsPerHour + i
    const hour = Math.floor(absoluteSlot / slotsPerHour)
    const minute = (absoluteSlot % slotsPerHour) * slotMinutes
    return { index: i, hour, minute }
  })
}

/** Global slot index from schedule day start hour (e.g. 8:00 → 0). */
export function globalSlotIndexFromHour(
  hour: number,
  scheduleStartHour: number,
  slotMinutes = 15
): number {
  const slotsPerHour = 60 / slotMinutes
  return (hour - scheduleStartHour) * slotsPerHour
}

export function getCurrentSlotIndexInRange(
  date: Date,
  startHour: number,
  endHour: number,
  slotMinutes = 15
): number | null {
  const slots = getSlotRange(startHour, endHour, slotMinutes)
  const slotMinute = Math.floor(date.getMinutes() / slotMinutes) * slotMinutes
  const idx = slots.findIndex(
    (s) => s.hour === date.getHours() && s.minute === slotMinute
  )
  return idx >= 0 ? idx : null
}

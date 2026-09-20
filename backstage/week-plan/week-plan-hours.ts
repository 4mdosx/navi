/** Round to nearest 0.5 hour, minimum 0.5 */
export function normalizeEstimatedHours(hours: number): number {
  const h = Number(hours)
  if (!Number.isFinite(h) || h <= 0) return 0.5
  return Math.max(0.5, Math.round(h * 2) / 2)
}

export function hoursToMinutes(hours: number): number {
  return Math.round(normalizeEstimatedHours(hours) * 60)
}

export function minutesToHours(minutes: number): number {
  const m = Number(minutes)
  if (!Number.isFinite(m) || m <= 0) return 0.5
  return normalizeEstimatedHours(m / 60)
}

export function formatEstimatedDuration(hours: number): string {
  const h = normalizeEstimatedHours(hours)
  if (h === 0.5) return '30 分钟'
  if (Number.isInteger(h)) return `${h} 小时`
  return `${h} 小时`
}

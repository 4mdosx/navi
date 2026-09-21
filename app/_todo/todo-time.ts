import { formatDateKey } from '@/backstage/week-plan/week-utils'
import { isRestKind, type Todo, type TodoTimeSpan } from '@/types/todo'

export const DAY_MS = 86_400_000

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function dateKeyFromMs(ms: number) {
  return formatDateKey(new Date(ms))
}

export function elapsedFraction(now: number, dayStart: number) {
  if (now <= dayStart) return 0
  if (now >= dayStart + DAY_MS) return 1
  return (now - dayStart) / DAY_MS
}

export function clipSpan(span: TodoTimeSpan, dayStart: number, now: number) {
  const start = Date.parse(span.startedAt)
  const end = span.endedAt ? Date.parse(span.endedAt) : now
  const left = Math.max(start, dayStart)
  const right = Math.min(end, dayStart + DAY_MS)
  if (!(right > left)) return null
  return {
    start: left,
    end: right,
    left: ((left - dayStart) / DAY_MS) * 100,
    width: ((right - left) / DAY_MS) * 100,
  }
}

export function spanDurationMs(span: TodoTimeSpan, now: number) {
  const start = Date.parse(span.startedAt)
  const end = span.endedAt ? Date.parse(span.endedAt) : now
  return Math.max(0, end - start)
}

export function totalSpanMs(spans: TodoTimeSpan[], now: number) {
  return spans.reduce((sum, span) => sum + spanDurationMs(span, now), 0)
}

export function spansOnDay(spans: TodoTimeSpan[], dayStart: number, now: number) {
  return spans
    .map((span) => {
      const clip = clipSpan(span, dayStart, now)
      if (!clip) return null
      return { span, ...clip }
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((a, b) => a.start - b.start)
}

export function formatClock(ms: number) {
  const date = new Date(ms)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60_000)
  if (totalMinutes < 1) return '不足 1 分钟'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} 分钟`
  if (minutes === 0) return `${hours} 小时`
  return `${hours} 小时 ${minutes} 分钟`
}

export function isRestTodo(todo?: Pick<Todo, 'kind'> | null) {
  return Boolean(todo && isRestKind(todo.kind))
}

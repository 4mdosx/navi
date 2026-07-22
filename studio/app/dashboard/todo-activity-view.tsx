'use client'

import { useMemo } from 'react'
import { Activity, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Todo } from '@/types/todo'
import {
  buildWeekList,
  expandWeeksToDays,
  formatWeekDateKey,
  startOfWeek,
  truncateWeeksForActivity,
  WEEK_MS,
} from '@/app/week-plan/todo-timeline-weeks'

function dayKey(value: string | number | Date) {
  return formatWeekDateKey(new Date(value))
}

function minutesSpent(todo: Todo) {
  if (todo.startedAt && todo.completedAt) {
    return Math.max(1, Math.round((Date.parse(todo.completedAt) - Date.parse(todo.startedAt)) / 60_000))
  }
  return todo.estimatedMinutes
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} 分钟`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`
}

export function TodoActivityView({
  todos,
  compact = false,
  selectedWeekStart,
  onWeekSelect,
}: {
  todos: Todo[]
  compact?: boolean
  selectedWeekStart?: string
  onWeekSelect?: (weekStart: string) => void
}) {
  const currentWeek = startOfWeek(new Date())
  const visibleWeeks = useMemo(
    () => truncateWeeksForActivity(buildWeekList(new Date())),
    [currentWeek.getTime()]
  )
  const days = useMemo(() => expandWeeksToDays(visibleWeeks), [visibleWeeks])
  const visibleDayKeys = useMemo(() => new Set(days.map(dayKey)), [days])

  const activity = new Map<string, Set<string>>()
  for (const todo of todos) {
    const timestamps = [todo.createdAt, todo.updatedAt, todo.startedAt, todo.completedAt].filter(Boolean) as string[]
    for (const timestamp of timestamps) {
      const key = dayKey(timestamp)
      if (!visibleDayKeys.has(key)) continue
      const ids = activity.get(key) ?? new Set<string>()
      ids.add(todo.id)
      activity.set(key, ids)
    }
  }

  const weeklyMinutes = visibleWeeks.map((weekStart) => {
    const start = weekStart.getTime()
    const end = start + WEEK_MS
    return todos.reduce((total, todo) => {
      const timestamp = Date.parse(todo.completedAt ?? todo.updatedAt)
      return timestamp >= start && timestamp < end ? total + minutesSpent(todo) : total
    }, 0)
  })
  const maxMinutes = Math.max(...weeklyMinutes, 1)
  const totalActivity = [...activity.values()].reduce((sum, ids) => sum + ids.size, 0)

  return (
    <section className={cn('rounded-lg border border-border bg-card', compact ? 'p-3' : 'p-4')}>
      <div className={cn('flex flex-wrap items-start justify-between gap-3', compact ? 'mb-3' : 'mb-4')}>
        <div>
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-emerald-600" />
            <h2 className="text-sm font-semibold">Todo 周视图</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">最近 {visibleWeeks.length} 周 · {totalActivity} 次 Todo 活动</p>
        </div>
      </div>

      <div className={cn('py-2', compact ? 'overflow-hidden' : 'overflow-x-auto pb-1')}>
        <div
          className={cn(
            'mx-auto grid w-fit max-w-full grid-flow-col grid-rows-7',
            compact ? 'gap-px' : 'min-w-[42rem] gap-0.5'
          )}
          aria-label="Todo 活动热度图"
        >
          {days.map((date) => {
            const dateKey = dayKey(date)
            const weekKey = formatWeekDateKey(startOfWeek(date))
            const count = activity.get(dateKey)?.size ?? 0
            return (
              <button
                type="button"
                key={dateKey}
                title={`${dateKey} · ${count} 次活动`}
                onClick={() => onWeekSelect?.(weekKey)}
                className={cn(
                  'rounded-[2px] border border-black/5 dark:border-white/5',
                  compact ? 'size-2' : 'size-3',
                  selectedWeekStart === weekKey && 'ring-1 ring-primary ring-offset-1',
                  count === 0 && 'bg-muted',
                  count === 1 && 'bg-emerald-200 dark:bg-emerald-900',
                  count === 2 && 'bg-emerald-400 dark:bg-emerald-700',
                  count >= 3 && count < 5 && 'bg-emerald-600 dark:bg-emerald-500',
                  count >= 5 && 'bg-emerald-800 dark:bg-emerald-300'
                )}
              />
            )
          })}
        </div>
      </div>

      <div className={cn('border-t', compact ? 'mt-3 pt-3' : 'mt-5 pt-4')}>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> 每周投入时间</span>
          <span>本周 {formatMinutes(weeklyMinutes.at(-1) ?? 0)}</span>
        </div>
        <div className={cn('flex items-end gap-1', compact ? 'h-12' : 'h-20')} aria-label="Todo 每周时间统计">
          {weeklyMinutes.map((minutes, index) => {
            const weekStart = visibleWeeks[index]
            if (!weekStart) return null
            return (
              <button
                type="button"
                key={weekStart.getTime()}
                className="flex h-full flex-1 items-end"
                title={`第 ${index + 1} 周 · ${formatMinutes(minutes)}`}
                onClick={() => onWeekSelect?.(formatWeekDateKey(weekStart))}
              >
                <div
                  className="w-full rounded-sm bg-blue-500/70 transition-colors hover:bg-blue-500"
                  style={{ height: minutes === 0 ? 2 : `${Math.max(8, (minutes / maxMinutes) * 100)}%` }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

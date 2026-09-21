'use client'

import { formatDateKey } from '@/backstage/week-plan/week-utils'
import type { Todo, TodoTimeSpan } from '@/types/todo'
import { cn } from '@/lib/utils'
import {
  formatClock,
  formatDuration,
  isRestTodo,
  spansOnDay,
  startOfLocalDay,
} from './todo-time'

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function dayLabel(dateKey: string, now: number) {
  const date = new Date(`${dateKey}T00:00:00`)
  const weekday = WEEKDAY_LABELS[date.getDay()]
  const today = formatDateKey(new Date(now))
  const md = `${date.getMonth() + 1}月${date.getDate()}日`
  return today === dateKey ? `今天 · ${md} ${weekday}` : `${md} ${weekday}`
}

export function DayTimelinePanel({
  dateKey,
  todos,
  spans,
  now,
  onSelectTodo,
}: {
  dateKey: string
  todos: Todo[]
  spans: TodoTimeSpan[]
  now: number
  onSelectTodo?: (todo: Todo) => void
}) {
  const todosById = new Map(todos.map((todo) => [todo.id, todo]))
  const dayStart = startOfLocalDay(new Date(`${dateKey}T00:00:00`))
  const items = spansOnDay(spans, dayStart, now)
  const workMs = items
    .filter((item) => !isRestTodo(todosById.get(item.span.todoId)))
    .reduce((sum, item) => sum + (item.end - item.start), 0)
  const restMs = items
    .filter((item) => isRestTodo(todosById.get(item.span.todoId)))
    .reduce((sum, item) => sum + (item.end - item.start), 0)

  return (
    <div className="mt-3">
      <p className="font-medium">{dayLabel(dateKey, now)}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {items.length === 0
          ? '这一天还没有时间记录。'
          : `工作 ${formatDuration(workMs)} · 休息 ${formatDuration(restMs)}`}
      </p>
      {items.length > 0 && (
        <ol className="mt-4 space-y-1.5">
          {items.map((item) => {
            const todo = todosById.get(item.span.todoId)
            const rest = isRestTodo(todo)
            const open = item.span.endedAt == null && item.end >= now - 1000
            const title = rest ? '休息' : todo?.title ?? '未知任务'
            return (
              <li key={item.span.id}>
                <button
                  type="button"
                  disabled={rest || !todo || !onSelectTodo}
                  onClick={() => todo && !rest && onSelectTodo?.(todo)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left',
                    rest
                      ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30'
                      : 'hover:bg-muted/60',
                    !rest && todo && 'cursor-pointer',
                  )}
                >
                  <span className="w-[5.75rem] shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {formatClock(item.start)}–{open ? '现在' : formatClock(item.end)}
                  </span>
                  <span className={cn('min-w-0 flex-1 truncate text-xs font-medium', rest && 'text-amber-800 dark:text-amber-300')}>
                    {title}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {open ? '进行中' : formatDuration(item.end - item.start)}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

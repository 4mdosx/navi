'use client'

import { cn } from '@/lib/utils'
import { formatDateKey, parseWeekStart } from '@/backstage/week-plan/week-utils'
import type { Todo, TodoTimeSpan } from '@/types/todo'
import {
  DAY_MS,
  clipSpan,
  dateKeyFromMs,
  elapsedFraction,
  isRestTodo,
  startOfLocalDay,
} from './todo-time'

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'] as const

function DayTrack({
  dayStart,
  now,
  spans,
  todosById,
  className,
  mutedTrack = false,
  selected = false,
  labeled = false,
  onSelect,
}: {
  dayStart: number | null
  now: number | null
  spans: TodoTimeSpan[]
  todosById: Map<string, Todo>
  className?: string
  mutedTrack?: boolean
  selected?: boolean
  labeled?: boolean
  onSelect?: (dateKey: string) => void
}) {
  const elapsed = dayStart == null || now == null ? 0 : elapsedFraction(now, dayStart)
  const clips = dayStart == null || now == null
    ? []
    : spans
      .map((span) => {
        const clip = clipSpan(span, dayStart, now)
        if (!clip) return null
        return { span, ...clip }
      })
      .filter((item): item is NonNullable<typeof item> => item != null)
  const dateKey = dayStart == null ? null : dateKeyFromMs(dayStart)

  return (
    <button
      type="button"
      onClick={() => {
        if (dateKey) onSelect?.(dateKey)
      }}
      aria-pressed={selected}
      aria-label={dateKey ? `${dateKey} 时间进度` : '今天时间进度'}
      className={cn(
        'relative min-h-0 overflow-hidden',
        labeled && 'flex flex-col items-center justify-center',
        mutedTrack && 'bg-neutral-200/45 dark:bg-neutral-800/60',
        selected && 'ring-1 ring-inset ring-sky-500',
        onSelect && 'cursor-pointer',
        className,
      )}
    >
      {elapsed > 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-neutral-300/85 dark:bg-neutral-600/80"
          style={{ width: `${elapsed * 100}%` }}
        />
      )}
      {clips.map((clip, index) => (
        <div
          key={`${clip.span.id}-${index}`}
          className={cn(
            'absolute inset-y-0',
            isRestTodo(todosById.get(clip.span.todoId))
              ? 'bg-amber-300/80 dark:bg-amber-500/55'
              : 'bg-sky-400/75 dark:bg-sky-500/65',
          )}
          style={{ left: `${clip.left}%`, width: `${Math.max(clip.width, 0.35)}%` }}
        />
      ))}
      {labeled && dayStart != null && (
        <span className="relative z-10 text-[10px] leading-tight text-foreground">
          <span className="block">{WEEKDAY_SHORT[new Date(dayStart).getDay()]}</span>
          <span className="block font-medium tabular-nums">{new Date(dayStart).getDate()}</span>
        </span>
      )}
    </button>
  )
}

export function TimeProgressBackdrop({
  weekStart,
  spans,
  todos,
  now,
  selectedDate,
  onSelectDay,
  overlay = true,
}: {
  weekStart: string
  spans: TodoTimeSpan[]
  todos: Todo[]
  now: number | null
  selectedDate?: string | null
  onSelectDay?: (dateKey: string) => void
  overlay?: boolean
}) {
  const stacked = overlay === false
  const todayStart = now == null ? null : startOfLocalDay(new Date(now))
  const todayKey = now == null ? null : formatDateKey(new Date(now))
  const todosById = new Map(todos.map((todo) => [todo.id, todo]))
  const days = Array.from({ length: 7 }, (_, index) => parseWeekStart(weekStart).getTime() + index * DAY_MS)

  return (
    <div className={cn(stacked ? 'flex flex-col gap-1.5' : 'absolute inset-0 flex flex-col')} aria-hidden={!onSelectDay}>
      <DayTrack
        dayStart={todayStart}
        now={now}
        spans={spans}
        todosById={todosById}
        className={stacked ? 'h-1.5 rounded-sm' : 'min-h-0 flex-1'}
        selected={todayKey != null && selectedDate === todayKey}
        onSelect={onSelectDay}
      />
      <div className={cn('relative z-10 flex gap-px', stacked ? 'h-11' : 'h-2 border-t border-white/50 dark:border-black/30')}>
        {days.map((dayStart) => {
          const dateKey = dateKeyFromMs(dayStart)
          return (
            <DayTrack
              key={dayStart}
              dayStart={dayStart}
              now={now}
              spans={spans}
              todosById={todosById}
              className={cn('min-w-0 flex-1', stacked && 'rounded-sm')}
              mutedTrack
              labeled={stacked}
              selected={selectedDate === dateKey}
              onSelect={onSelectDay}
            />
          )
        })}
      </div>
    </div>
  )
}

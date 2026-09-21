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

function DayTrack({
  dayStart,
  now,
  spans,
  todosById,
  className,
  mutedTrack = false,
  selected = false,
  onSelect,
}: {
  dayStart: number
  now: number
  spans: TodoTimeSpan[]
  todosById: Map<string, Todo>
  className?: string
  mutedTrack?: boolean
  selected?: boolean
  onSelect?: (dateKey: string) => void
}) {
  const elapsed = elapsedFraction(now, dayStart)
  const clips = spans
    .map((span) => {
      const clip = clipSpan(span, dayStart, now)
      if (!clip) return null
      return { span, ...clip }
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
  const dateKey = dateKeyFromMs(dayStart)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(dateKey)}
      aria-pressed={selected}
      aria-label={`${dateKey} 时间进度`}
      className={cn(
        'relative min-h-0 overflow-hidden',
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
}: {
  weekStart: string
  spans: TodoTimeSpan[]
  todos: Todo[]
  now: number
  selectedDate?: string | null
  onSelectDay?: (dateKey: string) => void
}) {
  const todayStart = startOfLocalDay(new Date(now))
  const todayKey = formatDateKey(new Date(now))
  const todosById = new Map(todos.map((todo) => [todo.id, todo]))
  const days = Array.from({ length: 7 }, (_, index) => parseWeekStart(weekStart).getTime() + index * DAY_MS)

  return (
    <div className="absolute inset-0 flex flex-col" aria-hidden={!onSelectDay}>
      <DayTrack
        dayStart={todayStart}
        now={now}
        spans={spans}
        todosById={todosById}
        className="min-h-0 flex-1"
        selected={selectedDate === todayKey}
        onSelect={onSelectDay}
      />
      <div className="relative z-10 flex h-2 gap-px border-t border-white/50 dark:border-black/30">
        {days.map((dayStart) => {
          const dateKey = dateKeyFromMs(dayStart)
          return (
            <DayTrack
              key={dayStart}
              dayStart={dayStart}
              now={now}
              spans={spans}
              todosById={todosById}
              className="min-w-0 flex-1"
              mutedTrack
              selected={selectedDate === dateKey}
              onSelect={onSelectDay}
            />
          )
        })}
      </div>
    </div>
  )
}

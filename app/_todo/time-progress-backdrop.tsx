'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { parseWeekStart } from '@/backstage/week-plan/week-utils'
import type { TodoTimeSpan } from '@/types/todo'

const DAY_MS = 86_400_000

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function elapsedFraction(now: number, dayStart: number) {
  if (now <= dayStart) return 0
  if (now >= dayStart + DAY_MS) return 1
  return (now - dayStart) / DAY_MS
}

function clipSpan(span: TodoTimeSpan, dayStart: number, now: number) {
  const start = Date.parse(span.startedAt)
  const end = span.endedAt ? Date.parse(span.endedAt) : now
  const left = Math.max(start, dayStart)
  const right = Math.min(end, dayStart + DAY_MS)
  if (!(right > left)) return null
  return {
    left: ((left - dayStart) / DAY_MS) * 100,
    width: ((right - left) / DAY_MS) * 100,
  }
}

function DayTrack({
  dayStart,
  now,
  spans,
  className,
  mutedTrack = false,
}: {
  dayStart: number
  now: number
  spans: TodoTimeSpan[]
  className?: string
  mutedTrack?: boolean
}) {
  const elapsed = elapsedFraction(now, dayStart)
  const clips = spans
    .map((span) => clipSpan(span, dayStart, now))
    .filter((clip): clip is { left: number; width: number } => clip != null)

  return (
    <div className={cn('relative min-h-0 overflow-hidden', mutedTrack && 'bg-neutral-200/45 dark:bg-neutral-800/60', className)}>
      {elapsed > 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-neutral-300/85 dark:bg-neutral-600/80"
          style={{ width: `${elapsed * 100}%` }}
        />
      )}
      {clips.map((clip, index) => (
        <div
          key={`${clip.left}-${clip.width}-${index}`}
          className="absolute inset-y-0 bg-sky-400/75 dark:bg-sky-500/65"
          style={{ left: `${clip.left}%`, width: `${Math.max(clip.width, 0.35)}%` }}
        />
      ))}
    </div>
  )
}

export function TimeProgressBackdrop({
  weekStart,
  spans,
  now,
}: {
  weekStart: string
  spans: TodoTimeSpan[]
  now: number
}) {
  const todayStart = startOfLocalDay(new Date(now))
  const days = useMemo(() => {
    const start = parseWeekStart(weekStart).getTime()
    return Array.from({ length: 7 }, (_, index) => start + index * DAY_MS)
  }, [weekStart])

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col" aria-hidden>
      <DayTrack dayStart={todayStart} now={now} spans={spans} className="min-h-0 flex-1" />
      <div className="flex h-2 gap-px border-t border-white/50 dark:border-black/30">
        {days.map((dayStart) => (
          <DayTrack
            key={dayStart}
            dayStart={dayStart}
            now={now}
            spans={spans}
            className="min-w-0 flex-1"
            mutedTrack
          />
        ))}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM,
  CurriculumSchedule,
  type CourseDragPayload,
  curriculumScheduleDayColumnMinWidthPx,
  getSundayOfWeekContaining,
  type ScheduleBlock,
} from '@/feature/curriculum-schedule'
import { useScheduleStore } from './schedule-store'

const DAY_COL_PX = curriculumScheduleDayColumnMinWidthPx()
const PENDING_CARD_SCALE = 0.65
const SCHEDULE_START_HOUR = 9
const SCHEDULE_END_HOUR = 23

function getYearWeekLabel(date: Date): string {
  const year = date.getFullYear()
  const weekStart = getSundayOfWeekContaining(date)
  const firstWeekStart = getSundayOfWeekContaining(new Date(year, 0, 1))
  const diffDays = Math.floor(
    (weekStart.getTime() - firstWeekStart.getTime()) / 86400000
  )
  const week = Math.floor(diffDays / 7) + 1
  return `${year}年 第${week}周`
}

function PendingCourseCard({
  id,
  title,
  day,
  hour,
}: {
  id: string
  title: string
  day: number
  hour: number
}) {
  const setDraggingPayload = useScheduleStore((s) => s.setDraggingPayload)
  const onDragStart = (e: React.DragEvent) => {
    const payloadObj = {
      kind: 'schedule-course',
      source: 'pending',
      id,
      title,
      rowSpan: day,
      colSpan: hour,
    } satisfies CourseDragPayload
    const payload = JSON.stringify(payloadObj)
    setDraggingPayload(payloadObj)
    e.dataTransfer.setData('application/json', payload)
    e.dataTransfer.setData('text/plain', payload)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setDraggingPayload(null)}
      className="flex max-w-full min-w-0 shrink-0 cursor-grab flex-col justify-start overflow-hidden rounded border border-neutral-200 bg-white px-2 py-1 text-xs shadow-sm active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-950"
      style={{
        width: `${hour * DAY_COL_PX * PENDING_CARD_SCALE}px`,
        minHeight: `${day * CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM * PENDING_CARD_SCALE}rem`,
      }}
    >
      <span className="block min-w-0 truncate font-medium leading-tight">{title}</span>
      <span className="mt-0.5 text-[10px] tabular-nums text-neutral-500">
        {day} 行 × {hour} 列
      </span>
    </div>
  )
}

export default function WeekPlanPage() {
  const currentDate = useMemo(() => new Date(), [])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const pending = useScheduleStore((s) => s.pending)
  const placed = useScheduleStore((s) => s.placed)
  const draggingPayload = useScheduleStore((s) => s.draggingPayload)
  const setWeekAnchor = useScheduleStore((s) => s.setWeekAnchor)
  const setScheduleHours = useScheduleStore((s) => s.setScheduleHours)
  const setDraggingPayload = useScheduleStore((s) => s.setDraggingPayload)
  const tryCommitDropToSchedule = useScheduleStore((s) => s.tryCommitDropToSchedule)
  const movePlacedBackToPending = useScheduleStore((s) => s.movePlacedBackToPending)

  useEffect(() => {
    setWeekAnchor(currentDate)
  }, [currentDate, setWeekAnchor])

  useEffect(() => {
    setScheduleHours(SCHEDULE_START_HOUR, SCHEDULE_END_HOUR)
  }, [setScheduleHours])

  const handleDropToSchedule = useCallback(
    (block: ScheduleBlock) => {
      tryCommitDropToSchedule(block, Date.now())
      setDraggingPayload(null)
    },
    [setDraggingPayload, tryCommitDropToSchedule]
  )

  const handleDropOutsideSchedule = useCallback(
    (courseId: string) => {
      movePlacedBackToPending(courseId)
      setDraggingPayload(null)
    },
    [movePlacedBackToPending, setDraggingPayload]
  )

  const yearWeekLabel = useMemo(() => getYearWeekLabel(currentDate), [currentDate])

  return (
    <div className="mx-auto h-[calc(100vh-6rem)] max-w-7xl p-6">
      <div className="grid h-full gap-6 md:grid-cols-[2fr_1fr]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">{yearWeekLabel}</h1>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/box-editor" className="text-primary underline-offset-4 hover:underline">
                空间编辑器
              </Link>
            </div>
          </div>
          <CurriculumSchedule
            className="min-h-0 flex-1"
            currentDate={currentDate}
            current={now}
            startHour={SCHEDULE_START_HOUR}
            endHour={SCHEDULE_END_HOUR}
            locale="zh-CN"
            blocks={placed}
            activeDragPayload={draggingPayload}
            onDropToSchedule={handleDropToSchedule}
            onDropOutsideSchedule={handleDropOutsideSchedule}
          />
        </div>
        <aside className="flex min-h-0 min-w-0 flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              待安排活动
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              按住卡片拖到左侧周历；day = 纵向格数，hour = 横向格数。
            </p>
          </div>
          <div className="scrollbar-hide flex min-h-0 flex-1 flex-wrap content-start items-start gap-1.5 overflow-y-auto">
            {pending.map((c) => (
              <PendingCourseCard key={c.id} {...c} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo } from 'react'
import {
  CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM,
  CurriculumSchedule,
  type CourseDragPayload,
  curriculumScheduleDayColumnMinWidthPx,
  getHourRange,
  getSundayOfWeekContaining,
  type ScheduleBlock,
} from '@/feature/curriculum-schedule'
import { useScheduleStore } from './schedule-store'

const DAY_COL_PX = curriculumScheduleDayColumnMinWidthPx()

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
    e.dataTransfer.setData(
      'application/json',
      payload
    )
    // Fallback for browsers that only expose plain text type during dragover.
    e.dataTransfer.setData('text/plain', payload)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={() => setDraggingPayload(null)}
      className="flex max-w-full min-w-0 cursor-grab flex-col justify-start overflow-hidden rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-950"
      style={{
        width: `min(100%, ${hour * DAY_COL_PX}px)`,
        minHeight: `${day * CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM}rem`,
      }}
    >
      <span className="block min-w-0 truncate font-medium leading-snug">
        {title}
      </span>
      <span className="mt-0.5 text-xs tabular-nums text-neutral-500">
        {day} 行 × {hour} 列
      </span>
    </div>
  )
}

export default function DashboardScheduleTestPage() {
  const currentDate = useMemo(() => new Date(), [])

  const pending = useScheduleStore((s) => s.pending)
  const placed = useScheduleStore((s) => s.placed)
  const draggingPayload = useScheduleStore((s) => s.draggingPayload)
  const setWeekAnchor = useScheduleStore((s) => s.setWeekAnchor)
  const setScheduleHours = useScheduleStore((s) => s.setScheduleHours)
  const setDraggingPayload = useScheduleStore((s) => s.setDraggingPayload)
  const tryCommitDropToSchedule = useScheduleStore(
    (s) => s.tryCommitDropToSchedule
  )
  const movePlacedBackToPending = useScheduleStore(
    (s) => s.movePlacedBackToPending
  )

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

  const hourRows = useMemo(
    () => getHourRange(SCHEDULE_START_HOUR, SCHEDULE_END_HOUR).length,
    []
  )
  const yearWeekLabel = useMemo(() => getYearWeekLabel(currentDate), [currentDate])

  return (
    <div className="mx-auto h-[calc(100vh-6rem)] max-w-7xl p-6">
      <div className="grid h-full gap-6 md:grid-cols-[2fr_1fr]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <h1 className="mb-2 text-lg font-semibold">{yearWeekLabel}</h1>
          <CurriculumSchedule
            className="min-h-0 flex-1"
            currentDate={currentDate}
            startHour={SCHEDULE_START_HOUR}
            endHour={SCHEDULE_END_HOUR}
            locale="zh-CN"
            blocks={placed}
            activeDragPayload={draggingPayload}
            onDropToSchedule={handleDropToSchedule}
            onDropOutsideSchedule={handleDropOutsideSchedule}
          />
        </div>
        <aside className="flex min-h-0 min-w-0 flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              待安排活动
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              按住卡片拖到左侧周历；day = 纵向格数，hour = 横向格数。
            </p>
          </div>
          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
            {pending.map((c) => (
              <PendingCourseCard key={c.id} {...c} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

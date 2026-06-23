'use client'

import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM,
  CurriculumSchedule,
  type CourseDragPayload,
  curriculumScheduleDayColumnMinWidthPx,
  getSlotRange,
  getSundayOfWeekContaining,
  globalSlotIndexFromHour,
  SCHEDULE_SLOT_MINUTES,
  SCHEDULE_SLOTS_PER_HOUR,
  type ScheduleBlock,
} from '@/feature/curriculum-schedule'
import { cn } from '@/lib/utils'
import { useScheduleStore, type PlacedCourseBlock } from './schedule-store'

const DAY_COL_PX = curriculumScheduleDayColumnMinWidthPx()
const PENDING_CARD_SCALE = 0.65
const SCHEDULE_START_HOUR = 8
const SCHEDULE_END_HOUR = 22

const SCHEDULE_PERIODS = [
  { id: 'morning', label: '上午', startHour: 8, endHour: 12 },
  { id: 'afternoon', label: '下午', startHour: 12, endHour: 18 },
  { id: 'evening', label: '晚上', startHour: 18, endHour: 22 },
] as const

function getPeriodIndexForHour(hour: number): number {
  if (hour >= 8 && hour < 12) return 0
  if (hour >= 12 && hour < 18) return 1
  if (hour >= 18 && hour < 22) return 2
  return 0
}

function getPeriodStartRow(periodStartHour: number): number {
  return globalSlotIndexFromHour(periodStartHour, SCHEDULE_START_HOUR, SCHEDULE_SLOT_MINUTES)
}

function toPeriodBlocks(
  placed: PlacedCourseBlock[],
  periodStartRow: number,
  periodRowCount: number
): ScheduleBlock[] {
  const periodEnd = periodStartRow + periodRowCount
  return placed.flatMap((b) => {
    const blockEnd = b.rowStart + b.rowSpan
    if (blockEnd <= periodStartRow || b.rowStart >= periodEnd) return []
    const clipStart = Math.max(b.rowStart, periodStartRow)
    const clipEnd = Math.min(blockEnd, periodEnd)
    return [
      {
        ...b,
        placementRowSpan: b.rowSpan,
        rowStart: clipStart - periodStartRow,
        rowSpan: clipEnd - clipStart,
      },
    ]
  })
}

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
      rowSpan: day * SCHEDULE_SLOTS_PER_HOUR,
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

function SchedulePeriodSwitcher({
  activeIndex,
  onChange,
}: {
  activeIndex: number
  onChange: (index: number) => void
}) {
  const goPrev = () => {
    onChange((activeIndex - 1 + SCHEDULE_PERIODS.length) % SCHEDULE_PERIODS.length)
  }
  const goNext = () => {
    onChange((activeIndex + 1) % SCHEDULE_PERIODS.length)
  }

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-2 py-2">
      <button
        type="button"
        onClick={goPrev}
        aria-label="上一时段"
        className="flex size-7 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <ChevronUp className="size-4" />
      </button>
      <div
        className="flex flex-col items-center gap-2 py-1"
        role="tablist"
        aria-label="课程表时段"
      >
        {SCHEDULE_PERIODS.map((period, index) => (
          <button
            key={period.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={period.label}
            onClick={() => onChange(index)}
            className={cn(
              'rounded-full transition-all duration-200',
              index === activeIndex
                ? 'size-2 bg-neutral-900 dark:bg-neutral-100'
                : 'size-1.5 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-600 dark:hover:bg-neutral-500'
            )}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={goNext}
        aria-label="下一时段"
        className="flex size-7 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  )
}

export default function WeekPlanPage() {
  const currentDate = useMemo(() => new Date(), [])
  const [now, setNow] = useState(() => new Date())
  const [activePeriodIndex, setActivePeriodIndex] = useState(() =>
    getPeriodIndexForHour(new Date().getHours())
  )

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

  const activePeriod = SCHEDULE_PERIODS[activePeriodIndex]
  const periodStartRow = getPeriodStartRow(activePeriod.startHour)
  const periodRowCount = getSlotRange(
    activePeriod.startHour,
    activePeriod.endHour,
    SCHEDULE_SLOT_MINUTES
  ).length

  const periodBlocks = useMemo(
    () => toPeriodBlocks(placed, periodStartRow, periodRowCount),
    [placed, periodStartRow, periodRowCount]
  )

  useEffect(() => {
    setWeekAnchor(currentDate)
  }, [currentDate, setWeekAnchor])

  useEffect(() => {
    setScheduleHours(SCHEDULE_START_HOUR, SCHEDULE_END_HOUR)
  }, [setScheduleHours])

  const handleDropToSchedule = useCallback(
    (block: ScheduleBlock) => {
      tryCommitDropToSchedule(
        { ...block, rowStart: block.rowStart + periodStartRow },
        Date.now()
      )
      setDraggingPayload(null)
    },
    [periodStartRow, setDraggingPayload, tryCommitDropToSchedule]
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
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-lg font-semibold">{yearWeekLabel}</h1>
              <p className="text-sm text-neutral-500">
                {activePeriod.label}{' '}
                <span className="tabular-nums">
                  {activePeriod.startHour}:00–{activePeriod.endHour}:00
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/box-editor" className="text-primary underline-offset-4 hover:underline">
                空间编辑器
              </Link>
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 gap-1">
            <SchedulePeriodSwitcher
              activeIndex={activePeriodIndex}
              onChange={setActivePeriodIndex}
            />
            <CurriculumSchedule
              className="min-h-0 min-w-0 flex-1"
              currentDate={currentDate}
              current={now}
              startHour={activePeriod.startHour}
              endHour={activePeriod.endHour}
              locale="zh-CN"
              blocks={periodBlocks}
              activeDragPayload={draggingPayload}
              onDropToSchedule={handleDropToSchedule}
              onDropOutsideSchedule={handleDropOutsideSchedule}
            />
          </div>
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

'use client'

import { Fragment, useState, type DragEvent } from 'react'
import {
  CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM,
  CURRICULUM_SCHEDULE_ROW_MIN_WIDTH_PX,
  CURRICULUM_SCHEDULE_TIME_GUTTER_REM,
  SCHEDULE_SLOT_MINUTES,
} from './grid-dimensions'
import type { CourseDragPayload, ScheduleBlock } from './types'
import {
  getCurrentSlotIndexInRange,
  getSlotRange,
  getSundayOfWeekContaining,
  getWeekDaysFromSunday,
} from './utils'

export type { ScheduleBlock } from './types'

export interface CurriculumScheduleProps {
  currentDate: Date
  /** 用于高亮「今天 + 当前小时」格；不传则不显示时间高亮 */
  current?: Date
  startHour: number
  endHour: number
  locale?: string
  className?: string
  /** 已排入周历的活动块 */
  blocks?: ScheduleBlock[]
  /** 当前正在拖拽的活动载荷（用于稳定预览和放置） */
  activeDragPayload?: CourseDragPayload | null
  /** 拖入且落在合法格内时调用（周历内已做边界校验；重叠由父组件决定） */
  onDropToSchedule?: (block: ScheduleBlock) => void
  /** 已排活动拖到课表外结束时调用（用于回收回待安排区） */
  onDropOutsideSchedule?: (courseId: string) => void
}

function formatSlotLabel(
  hour: number,
  minute: number,
  locale?: string
): string {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

function formatDayHeader(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
  }).format(date)
}

const CELL_HEIGHT = `${CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM}rem`
const TIME_GUTTER = `${CURRICULUM_SCHEDULE_TIME_GUTTER_REM}rem`

function slotRowBorderClass(isHourBoundary: boolean, isFirstSlot: boolean): string {
  const slotDivider = 'border-b border-b-neutral-100 dark:border-b-neutral-800/60'
  if (isHourBoundary && !isFirstSlot) {
    return `border-t border-t-neutral-300 dark:border-t-neutral-600 ${slotDivider}`
  }
  return slotDivider
}

function sameLocalCalendarDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

type DropPreview = {
  dayIndex: number
  rowIndex: number
  rowSpan: number
  colSpan: number
}

function parseDragPayload(dt: DataTransfer): CourseDragPayload | null {
  try {
    const raw =
      dt.getData('application/json') || dt.getData('text/plain') || ''
    if (!raw) return null
    const v = JSON.parse(raw) as CourseDragPayload
    if (v?.kind !== 'schedule-course' || typeof v.id !== 'string') return null
    if (
      typeof v.rowSpan !== 'number' ||
      typeof v.colSpan !== 'number' ||
      typeof v.title !== 'string'
    )
      return null
    if (v.rowSpan < 1 || v.colSpan < 1) return null
    return v
  } catch {
    return null
  }
}

function hasPendingCoursePayload(dt: DataTransfer): boolean {
  const types = Array.from(dt.types ?? [])
  return (
    types.includes('application/json') ||
    types.includes('text/plain') ||
    types.includes('Text')
  )
}

function formatRangeLabel(
  startMs?: number,
  endMs?: number,
  locale?: string
): string | null {
  if (startMs == null || endMs == null) return null
  const start = new Date(startMs)
  const end = new Date(endMs)
  const sameDay = start.toDateString() === end.toDateString()
  const dateStr = start.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })
  const t0 = start.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
  const t1 = end.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return sameDay ? `${dateStr} ${t0}–${t1}` : `${start.toLocaleString(locale)} – ${end.toLocaleString(locale)}`
}

function ScheduleBlocksOverlay({
  blocks,
  locale,
  onDropOutsideSchedule,
  onPlacedBlockDragPayloadChange,
}: {
  blocks: ScheduleBlock[]
  locale?: string
  onDropOutsideSchedule?: (courseId: string) => void
  onPlacedBlockDragPayloadChange?: (payload: CourseDragPayload | null) => void
}) {
  const cell = CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM
  return (
    <>
      {blocks.map((b) => {
        const range = formatRangeLabel(b.rangeStartMs, b.rangeEndMs, locale)
        return (
          <div
            key={b.id}
            draggable
            onDragStart={(e) => {
              const payloadObj = {
                kind: 'schedule-course',
                source: 'placed',
                id: b.id,
                title: b.title,
                rowSpan: b.placementRowSpan ?? b.rowSpan,
                colSpan: b.colSpan,
              } satisfies CourseDragPayload
              const payload = JSON.stringify(payloadObj)
              onPlacedBlockDragPayloadChange?.(payloadObj)
              e.dataTransfer.setData('application/json', payload)
              e.dataTransfer.setData('text/plain', payload)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={(e) => {
              onPlacedBlockDragPayloadChange?.(null)
              if (e.dataTransfer.dropEffect === 'none') {
                onDropOutsideSchedule?.(b.id)
              }
            }}
            className="pointer-events-auto absolute z-[1] cursor-grab overflow-hidden rounded-md border border-violet-400/70 bg-violet-500/15 px-1 py-0.5 text-left text-xs text-violet-950 shadow-sm active:cursor-grabbing dark:border-violet-400/50 dark:bg-violet-500/20 dark:text-violet-50"
            style={{
              left: `${(b.dayIndex / 7) * 100}%`,
              width: `${(b.colSpan / 7) * 100}%`,
              top: `calc(${cell}rem * ${b.rowStart})`,
              height: `calc(${cell}rem * ${b.rowSpan})`,
            }}
          >
            <span className="block truncate font-medium">{b.title}</span>
            {range ? (
              <span className="mt-0.5 block truncate text-[10px] font-normal opacity-90">
                {range}
              </span>
            ) : null}
            {b.droppedAtMs != null ? (
              <span className="mt-0.5 block truncate text-[10px] font-normal opacity-75">
                放下{' '}
                {new Date(b.droppedAtMs).toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

/** Weekly grid: columns Sun→Sat, rows per 15-minute slot between startHour and endHour. */
export function CurriculumSchedule({
  currentDate,
  current,
  startHour,
  endHour,
  locale,
  className,
  blocks = [],
  activeDragPayload,
  onDropToSchedule,
  onDropOutsideSchedule,
}: CurriculumScheduleProps) {
  const sunday = getSundayOfWeekContaining(currentDate)
  const weekDays = getWeekDaysFromSunday(sunday)
  const slots = getSlotRange(startHour, endHour, SCHEDULE_SLOT_MINUTES)
  const rowCount = slots.length
  const currentSlotIndex =
    current != null
      ? getCurrentSlotIndexInRange(current, startHour, endHour, SCHEDULE_SLOT_MINUTES)
      : null
  const [placedDragPayload, setPlacedDragPayload] =
    useState<CourseDragPayload | null>(null)
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null)
  const effectivePayload = activeDragPayload ?? placedDragPayload

  const handleDragOver = (e: DragEvent, dayIndex: number, rowIndex: number) => {
    if (!onDropToSchedule) return
    if (!hasPendingCoursePayload(e.dataTransfer)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const p = parseDragPayload(e.dataTransfer) ?? effectivePayload
    if (!p) return
    if (dayIndex + p.colSpan > 7 || rowIndex + p.rowSpan > rowCount) {
      setDropPreview(null)
      return
    }
    setDropPreview({
      dayIndex,
      rowIndex,
      rowSpan: p.rowSpan,
      colSpan: p.colSpan,
    })
  }

  const handleDrop = (e: DragEvent, dayIndex: number, rowIndex: number) => {
    if (!onDropToSchedule) return
    e.preventDefault()
    setDropPreview(null)
    setPlacedDragPayload(null)
    const p = parseDragPayload(e.dataTransfer) ?? effectivePayload
    if (!p) return
    if (dayIndex + p.colSpan > 7) return
    if (rowIndex + p.rowSpan > rowCount) return
    onDropToSchedule({
      id: p.id,
      title: p.title,
      rowSpan: p.rowSpan,
      colSpan: p.colSpan,
      dayIndex,
      rowStart: rowIndex,
    })
  }

  return (
    <div
      className={
        'scrollbar-hide h-full overflow-auto rounded-lg border border-neutral-200 bg-background text-foreground dark:border-neutral-800 ' +
        (className ?? '')
      }
    >
      <div
        className="relative"
        style={{ minWidth: CURRICULUM_SCHEDULE_ROW_MIN_WIDTH_PX }}
        onDragLeave={(e) => {
          const next = e.relatedTarget as Node | null
          if (!next || !e.currentTarget.contains(next)) {
            setDropPreview(null)
          }
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${TIME_GUTTER} repeat(7, minmax(0, 1fr))`,
            gridAutoRows: CELL_HEIGHT,
          }}
        >
          <div
            className="sticky left-0 top-0 z-30 box-border border-b border-neutral-200 bg-background dark:border-neutral-800"
            style={{ gridColumn: 1, gridRow: 1 }}
          />

          {weekDays.map((day, dayIndex) => (
            <div
              key={day.toISOString()}
              className={
                'sticky top-0 z-20 box-border flex items-center justify-center border-b-2 border-neutral-200 bg-background px-1 text-center text-xs font-medium dark:border-neutral-800 ' +
                (current != null && sameLocalCalendarDate(day, current)
                  ? 'text-blue-800 dark:text-blue-200'
                  : '')
              }
              style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
            >
              {formatDayHeader(day, locale)}
            </div>
          ))}

          {slots.map((slot, rowIndex) => {
            const gridRow = rowIndex + 2
            const isHourBoundary = slot.minute === 0
            const isFirstSlot = rowIndex === 0
            const borderClass = slotRowBorderClass(isHourBoundary, isFirstSlot)
            const isNowSlotRow = currentSlotIndex === slot.index

            return (
              <Fragment key={`${slot.hour}-${slot.minute}`}>
                <div
                  className={
                    'sticky left-0 z-20 box-border flex items-start justify-end border-b bg-background px-1 text-[10px] tabular-nums dark:border-neutral-800 ' +
                    borderClass +
                    (isNowSlotRow
                      ? ' font-medium text-blue-700 dark:text-blue-300'
                      : ' text-neutral-500')
                  }
                  style={{ gridColumn: 1, gridRow }}
                >
                  {isHourBoundary
                    ? formatSlotLabel(slot.hour, slot.minute, locale)
                    : null}
                </div>

                {weekDays.map((day, dayIndex) => {
                  const isCurrentSlot =
                    current != null &&
                    sameLocalCalendarDate(day, current) &&
                    currentSlotIndex === rowIndex

                  return (
                    <div
                      key={day.toISOString()}
                      role="presentation"
                      className={`box-border border-b px-0.5 dark:border-neutral-800 ${borderClass}`}
                      style={{ gridColumn: dayIndex + 2, gridRow }}
                      onDragOver={(ev) =>
                        handleDragOver(ev, dayIndex, rowIndex)
                      }
                      onDrop={(ev) => handleDrop(ev, dayIndex, rowIndex)}
                    >
                      <div
                        className={
                          'box-border h-full rounded-sm bg-neutral-50 dark:bg-neutral-900/40 ' +
                          (isCurrentSlot
                            ? ' ring-2 ring-inset ring-blue-500 dark:ring-blue-400'
                            : '')
                        }
                      />
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
        </div>

        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: TIME_GUTTER,
            right: 0,
            top: CELL_HEIGHT,
            bottom: 0,
          }}
        >
          {dropPreview && (
            <div
              className="pointer-events-none absolute z-20 rounded-md border-2 border-dashed border-violet-500/90"
              style={{
                left: `${(dropPreview.dayIndex / 7) * 100}%`,
                width: `${(dropPreview.colSpan / 7) * 100}%`,
                top: `calc(${CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM}rem * ${dropPreview.rowIndex})`,
                height: `calc(${CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM}rem * ${dropPreview.rowSpan})`,
              }}
            />
          )}

          {blocks.length > 0 && (
            <ScheduleBlocksOverlay
              blocks={blocks}
              locale={locale}
              onDropOutsideSchedule={onDropOutsideSchedule}
              onPlacedBlockDragPayloadChange={setPlacedDragPayload}
            />
          )}
        </div>
      </div>
    </div>
  )
}

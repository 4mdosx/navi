import { create } from 'zustand'
import type {
  CourseDragPayload,
  ScheduleBlock,
} from '@/feature/curriculum-schedule'
import {
  addLocalDays,
  getHourRange,
  getSundayOfWeekContaining,
} from '@/feature/curriculum-schedule'

export type PendingCourse = {
  id: string
  title: string
  day: number
  hour: number
}

/** 已排块 + 拖拽结束时刻 + 周历上的起止时间（本地） */
export type PlacedCourseBlock = ScheduleBlock & {
  droppedAtMs: number
  rangeStartMs: number
  rangeEndMs: number
}

const INITIAL_PENDING: PendingCourse[] = [
  { id: '1', title: '高等数学（习题）', day: 3, hour: 1 },
  { id: '2', title: '实验课', day: 1, hour: 2 },
  { id: '3', title: '小组项目', day: 2, hour: 3 },
  { id: '4', title: '讲座', day: 1, hour: 1 },
]

function blocksOverlap(a: ScheduleBlock, b: ScheduleBlock): boolean {
  const aDayEnd = a.dayIndex + a.colSpan
  const bDayEnd = b.dayIndex + b.colSpan
  const aRowEnd = a.rowStart + a.rowSpan
  const bRowEnd = b.rowStart + b.rowSpan
  const dayOverlap = !(aDayEnd <= b.dayIndex || bDayEnd <= a.dayIndex)
  const rowOverlap = !(aRowEnd <= b.rowStart || bRowEnd <= a.rowStart)
  return dayOverlap && rowOverlap
}

function computePlacementRangeMs(
  weekContaining: Date,
  scheduleStartHour: number,
  scheduleEndHour: number,
  block: ScheduleBlock
): { rangeStartMs: number; rangeEndMs: number } {
  const hours = getHourRange(scheduleStartHour, scheduleEndHour)
  const sunday = getSundayOfWeekContaining(weekContaining)
  const dayDate = addLocalDays(sunday, block.dayIndex)
  const startHour = hours[block.rowStart]
  const rangeStart = new Date(dayDate)
  rangeStart.setHours(startHour, 0, 0, 0)
  const rangeEnd = new Date(rangeStart)
  rangeEnd.setHours(rangeEnd.getHours() + block.rowSpan)
  return { rangeStartMs: rangeStart.getTime(), rangeEndMs: rangeEnd.getTime() }
}

type ScheduleStore = {
  /** 用于把格坐标换算成具体日期时间（与 `CurriculumSchedule` 的 `currentDate` 对齐） */
  weekContaining: Date
  scheduleStartHour: number
  scheduleEndHour: number
  draggingPayload: CourseDragPayload | null
  pending: PendingCourse[]
  placed: PlacedCourseBlock[]
  setWeekAnchor: (date: Date) => void
  setScheduleHours: (startHour: number, endHour: number) => void
  setDraggingPayload: (payload: CourseDragPayload | null) => void
  /** 拖入课表成功：写入 `droppedAtMs`、起止时间；已存在则移动，不存在则从 `pending` 转移 */
  tryCommitDropToSchedule: (
    block: ScheduleBlock,
    droppedAtMs?: number
  ) => boolean
  /** 从课表移除并回收到待安排 */
  movePlacedBackToPending: (courseId: string) => boolean
  resetDemo: () => void
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  weekContaining: new Date(),
  scheduleStartHour: 9,
  scheduleEndHour: 23,
  draggingPayload: null,
  pending: INITIAL_PENDING,
  placed: [],

  setWeekAnchor: (date) => set({ weekContaining: new Date(date) }),

  setScheduleHours: (startHour, endHour) =>
    set({ scheduleStartHour: startHour, scheduleEndHour: endHour }),

  setDraggingPayload: (payload) => set({ draggingPayload: payload }),

  tryCommitDropToSchedule: (block, droppedAtMs = Date.now()) => {
    const {
      weekContaining,
      scheduleStartHour,
      scheduleEndHour,
      placed,
      pending,
    } = get()
    if (placed.some((e) => e.id !== block.id && blocksOverlap(e, block))) {
      return false
    }
    const { rangeStartMs, rangeEndMs } = computePlacementRangeMs(
      weekContaining,
      scheduleStartHour,
      scheduleEndHour,
      block
    )
    const existing = placed.find((p) => p.id === block.id)
    const next: PlacedCourseBlock = existing
      ? {
          ...existing,
          ...block,
          droppedAtMs,
          rangeStartMs,
          rangeEndMs,
        }
      : {
          ...block,
          droppedAtMs,
          rangeStartMs,
          rangeEndMs,
        }
    set({
      placed: existing
        ? placed.map((p) => (p.id === block.id ? next : p))
        : [...placed, next],
      pending: existing ? pending : pending.filter((p) => p.id !== block.id),
    })
    return true
  },

  movePlacedBackToPending: (courseId) => {
    const { placed, pending } = get()
    const target = placed.find((p) => p.id === courseId)
    if (!target) return false
    const existsInPending = pending.some((p) => p.id === target.id)
    set({
      placed: placed.filter((p) => p.id !== target.id),
      pending: existsInPending
        ? pending
        : [
            {
              id: target.id,
              title: target.title,
              day: target.rowSpan,
              hour: target.colSpan,
            },
            ...pending,
          ],
    })
    return true
  },

  resetDemo: () =>
    set({
      pending: INITIAL_PENDING,
      placed: [],
      draggingPayload: null,
      weekContaining: new Date(),
    }),
}))

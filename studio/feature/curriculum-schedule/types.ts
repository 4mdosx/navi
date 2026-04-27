/** 已放到周历上的块；`rowStart` 为相对 `startHour` 的显示行下标（从 0 起）。 */
export type ScheduleBlock = {
  id: string
  title: string
  rowSpan: number
  colSpan: number
  /** 0 = 周日 … 6 = 周六 */
  dayIndex: number
  rowStart: number
  /** 成功落在表上的时刻（`Date.now()`） */
  droppedAtMs?: number
  /** 该块在周历中的本地开始时间戳 */
  rangeStartMs?: number
  /** 该块在周历中的本地结束时间戳（最后一格的结束时刻） */
  rangeEndMs?: number
}

export type CourseDragPayload = {
  kind: 'schedule-course'
  source: 'pending' | 'placed'
  id: string
  title: string
  rowSpan: number
  colSpan: number
}

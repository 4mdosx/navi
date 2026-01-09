import { format, startOfWeek, addWeeks, differenceInWeeks, parseISO, getWeek } from 'date-fns'
import type { Task, TaskNote, WeeklyProgress } from '@/types/tasks'

/**
 * 获取任务开始日期所在周的周一
 */
export function getTaskStartWeek(task: Task): Date {
  const startDate = parseISO(task.createdAt)
  return startOfWeek(startDate, { weekStartsOn: 1 }) // 周一开始
}

/**
 * 获取指定周的开始日期（周一）
 */
export function getWeekStartDate(weekNumber: number, taskStartWeek: Date): Date {
  return addWeeks(taskStartWeek, weekNumber - 1)
}

/**
 * 获取指定周的结束日期（周日）
 */
export function getWeekEndDate(weekNumber: number, taskStartWeek: Date): Date {
  const startDate = getWeekStartDate(weekNumber, taskStartWeek)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6) // 加6天得到周日
  return endDate
}

/**
 * 计算某个日期属于任务的第几周（从1开始）
 */
export function getWeekNumberForDate(date: Date, taskStartWeek: Date): number {
  const weeksDiff = differenceInWeeks(date, taskStartWeek, { roundingMethod: 'floor' })
  return weeksDiff + 1 // 从1开始计数
}

/**
 * 获取当前日期属于任务的第几周
 */
export function getCurrentWeekNumber(task: Task): number {
  const taskStartWeek = getTaskStartWeek(task)
  return getWeekNumberForDate(new Date(), taskStartWeek)
}

/**
 * 将任务的笔记按周分组
 */
export function groupNotesByWeek(task: Task, notes: TaskNote[]): WeeklyProgress[] {
  const taskStartWeek = getTaskStartWeek(task)
  const weeksMap = new Map<number, WeeklyProgress>()
  
  // 按时间排序笔记
  const sortedNotes = [...notes].sort((a, b) => 
    parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime()
  )
  
  let lastProgress = 0
  
  sortedNotes.forEach((note) => {
    const noteDate = parseISO(note.timestamp)
    const weekNumber = getWeekNumberForDate(noteDate, taskStartWeek)
    
    if (!weeksMap.has(weekNumber)) {
      const weekStartDate = getWeekStartDate(weekNumber, taskStartWeek)
      const weekEndDate = getWeekEndDate(weekNumber, taskStartWeek)
      
      weeksMap.set(weekNumber, {
        weekNumber,
        weekStartDate: weekStartDate.toISOString(),
        weekEndDate: weekEndDate.toISOString(),
        notes: [],
        progressDelta: 0,
        progressAtEnd: lastProgress,
      })
    }
    
    const weekProgress = weeksMap.get(weekNumber)!
    weekProgress.notes.push(note)
    
    // 更新进度（如果有进度信息在metadata中）
    if (note.metadata?.progress !== undefined) {
      const newProgress = note.metadata.progress as number
      weekProgress.progressDelta = newProgress - lastProgress
      weekProgress.progressAtEnd = newProgress
      lastProgress = newProgress
    }
  })
  
  // 如果没有笔记，至少创建当前周的记录
  const currentWeekNumber = getCurrentWeekNumber(task)
  if (weeksMap.size === 0 && currentWeekNumber >= 1) {
    const weekStartDate = getWeekStartDate(currentWeekNumber, taskStartWeek)
    const weekEndDate = getWeekEndDate(currentWeekNumber, taskStartWeek)
    
    weeksMap.set(currentWeekNumber, {
      weekNumber: currentWeekNumber,
      weekStartDate: weekStartDate.toISOString(),
      weekEndDate: weekEndDate.toISOString(),
      notes: [],
      progressDelta: 0,
      progressAtEnd: task.progress,
    })
  }
  
  return Array.from(weeksMap.values()).sort((a, b) => a.weekNumber - b.weekNumber)
}

/**
 * 获取指定周的所有笔记
 */
export function getNotesForWeek(task: Task, notes: TaskNote[], weekNumber: number): TaskNote[] {
  const taskStartWeek = getTaskStartWeek(task)
  const weekStartDate = getWeekStartDate(weekNumber, taskStartWeek)
  const weekEndDate = getWeekEndDate(weekNumber, taskStartWeek)
  
  return notes.filter((note) => {
    const noteDate = parseISO(note.timestamp)
    return noteDate >= weekStartDate && noteDate <= weekEndDate
  })
}

/**
 * 格式化周显示文本
 * @param weekStartDate 周的开始日期（周一）
 * @returns 格式化的周标签，显示为 "2026 第9周 (01/05 - 03/08)"
 */
export function formatWeekLabel(weekStartDate: Date): string {
  const year = format(weekStartDate, 'yyyy')
  // 计算 ISO 周数（今年的第几周）
  const isoWeekNumber = getWeek(weekStartDate, { weekStartsOn: 1, firstWeekContainsDate: 4 })
  const startStr = format(weekStartDate, 'MM/dd')
  // 周一是开始日期，周日是开始日期+6天
  const endDate = new Date(weekStartDate)
  endDate.setDate(endDate.getDate() + 6)
  const endStr = format(endDate, 'MM/dd')
  return `${year} 第${isoWeekNumber}周 (${startStr} - ${endStr})`
}

/**
 * 计算任务的总周数（从创建到现在）
 */
export function getTotalWeeks(task: Task): number {
  const taskStartWeek = getTaskStartWeek(task)
  const now = new Date()
  return getWeekNumberForDate(now, taskStartWeek)
}

import { format, startOfWeek, addWeeks, differenceInWeeks, parseISO, getWeek } from 'date-fns'
import type { Task } from '@/types/tasks'

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
 * 计算任务的总周数（从创建到现在）
 */
export function getTotalWeeks(task: Task): number {
  const taskStartWeek = getTaskStartWeek(task)
  const now = new Date()
  return getWeekNumberForDate(now, taskStartWeek)
}

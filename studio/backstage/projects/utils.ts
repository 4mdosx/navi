import { startOfWeek, addWeeks, differenceInWeeks, parseISO } from 'date-fns'
import type { Project } from '@/types/projects'

/**
 * 获取项目创建日期所在周的周一
 */
export function getProjectStartWeek(project: Project): Date {
  const startDate = parseISO(project.createdAt)
  return startOfWeek(startDate, { weekStartsOn: 1 })
}

/**
 * 获取指定周的开始日期（周一）
 */
export function getWeekStartDate(weekNumber: number, projectStartWeek: Date): Date {
  return addWeeks(projectStartWeek, weekNumber - 1)
}

/**
 * 获取指定周的结束日期（周日）
 */
export function getWeekEndDate(weekNumber: number, projectStartWeek: Date): Date {
  const startDate = getWeekStartDate(weekNumber, projectStartWeek)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  return endDate
}

/**
 * 计算某个日期属于项目的第几周（从1开始）
 */
export function getWeekNumberForDate(date: Date, projectStartWeek: Date): number {
  const weeksDiff = differenceInWeeks(date, projectStartWeek, { roundingMethod: 'floor' })
  return weeksDiff + 1
}

/**
 * 获取当前日期属于项目的第几周
 */
export function getCurrentWeekNumber(project: Project): number {
  const projectStartWeek = getProjectStartWeek(project)
  return getWeekNumberForDate(new Date(), projectStartWeek)
}

/**
 * 计算项目的总周数（从创建到现在）
 */
export function getTotalWeeks(project: Project): number {
  const projectStartWeek = getProjectStartWeek(project)
  const now = new Date()
  return getWeekNumberForDate(now, projectStartWeek)
}

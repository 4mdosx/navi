import type { Task, TaskNote } from '@/types/tasks'
import { addWeeks, subWeeks, startOfWeek, addDays } from 'date-fns'

// 生成模拟数据：从8周前开始的任务
const baseDate = new Date()
const task1StartDate = subWeeks(baseDate, 8)
const task2StartDate = subWeeks(baseDate, 6)
const task3StartDate = subWeeks(baseDate, 3)

function createTask(
  id: string,
  title: string,
  description: string,
  startDate: Date,
  status: Task['status'],
  progress: number
): Task {
  const createdAt = startDate.toISOString()
  const lastActiveAt = addDays(startDate, Math.floor(Math.random() * 7)).toISOString()
  
  return {
    id,
    title,
    description,
    status,
    progress,
    filePath: `task-${id}.md`,
    createdAt,
    lastActiveAt,
    updatedAt: lastActiveAt,
  }
}

function createNote(
  id: string,
  content: string,
  date: Date,
  weekNumber: number,
  progress?: number
): TaskNote {
  return {
    id,
    type: 'text',
    content,
    timestamp: date.toISOString(),
    metadata: {
      weekNumber,
      weekStartDate: startOfWeek(date, { weekStartsOn: 1 }).toISOString(),
      ...(progress !== undefined && { progress }),
    },
  }
}

export const mockTasks: Task[] = [
  createTask(
    '1',
    '重构用户认证系统',
    '将现有的认证系统重构为更安全的实现，支持多因素认证',
    task1StartDate,
    'in_progress',
    65
  ),
  createTask(
    '2',
    '开发任务管理功能',
    '实现长期任务追踪和管理功能，支持周视图和进展记录',
    task2StartDate,
    'in_progress',
    40
  ),
  createTask(
    '3',
    '优化数据库查询性能',
    '分析和优化慢查询，添加必要的索引',
    task3StartDate,
    'in_progress',
    20
  ),
]

export const mockNotes: Record<string, TaskNote[]> = {
  '1': [
    createNote('note-1-1', '完成了需求分析和架构设计', addDays(task1StartDate, 2), 1, 10),
    createNote('note-1-2', '开始实现基础认证逻辑', addDays(task1StartDate, 5), 1, 15),
    createNote('note-1-3', '完成了JWT token生成和验证', addWeeks(task1StartDate, 1), 2, 30),
    createNote('note-1-4', '实现了密码重置功能', addWeeks(task1StartDate, 2), 3, 45),
    createNote('note-1-5', '开始集成2FA功能', addWeeks(task1StartDate, 3), 4, 55),
    createNote('note-1-6', '完成了2FA的TOTP实现', addWeeks(task1StartDate, 4), 5, 65),
  ],
  '2': [
    createNote('note-2-1', '完成了数据模型设计', addDays(task2StartDate, 1), 1, 10),
    createNote('note-2-2', '实现了任务CRUD接口', addDays(task2StartDate, 4), 1, 20),
    createNote('note-2-3', '开始开发周视图组件', addWeeks(task2StartDate, 1), 2, 30),
    createNote('note-2-4', '实现了周进展记录功能', addWeeks(task2StartDate, 2), 3, 40),
  ],
  '3': [
    createNote('note-3-1', '分析了慢查询日志', addDays(task3StartDate, 1), 1, 10),
    createNote('note-3-2', '为常用查询添加了索引', addDays(task3StartDate, 4), 1, 20),
  ],
}

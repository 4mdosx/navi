export type TaskStatus = 'in_progress' | 'waiting' | 'completed' | 'paused'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  progress: number // 0-100
  createdAt: string // ISO 8601 格式
  updatedAt: string // ISO 8601 格式
}

export interface TaskNote {
  id: string
  content: string
  timestamp: string // ISO 8601 格式
  metadata?: {
    weekNumber?: number // 属于第几周（从任务开始算起）
    weekStartDate?: string // 这周的开始日期
    [key: string]: any
  }
}

export interface WeeklyProgress {
  weekNumber: number // 第几周（从任务开始算起，从1开始）
  weekStartDate: string // 这周的开始日期（周一）
  weekEndDate: string // 这周的结束日期（周日）
  notes: TaskNote[] // 这周的笔记
  progressDelta: number // 这周的进度变化（相对于上周）
  progressAtEnd: number // 这周结束时的进度
}

export interface CreateTaskDto {
  title: string
  description?: string
}

export interface UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  progress?: number
}

export interface CreateTaskNoteDto {
  type: TaskNoteType
  content: string
  metadata?: Record<string, any>
}

export interface UpdateTaskNoteDto {
  type?: TaskNoteType
  content?: string
  metadata?: Record<string, any>
}

export interface TaskContext {
  taskId: string
  lastNoteId?: string
  scrollPosition?: number
  openSections?: string[]
}

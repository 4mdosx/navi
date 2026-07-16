export type TodoStatus = 'active' | 'pending' | 'done'

export type WeekPlanPendingActivity = {
  id: string
  title: string
  /** 预计时长（小时） */
  day: number
  /** 卡片宽度格数（展示用） */
  hour: number
}

export type WeekPlanTodo = {
  id: string
  parentId: string | null
  sortOrder: number
  title: string
  content: string
  status: TodoStatus
  estimatedHours: number
  hour: number
  /** 0 = 周日 … 6 = 周六 */
  dayIndex: number
  weekStart: string
  startedAtMs?: number
  completedAtMs?: number
  createdAt: string
  updatedAt: string
}

export type TodoDraft = {
  id: string
  parentId: string | null
  title: string
  estimatedHours: number
  sortOrder: number
}

export type ParseTodoCopilotResult = {
  parent: TodoDraft | null
  subtasks: TodoDraft[]
  root: TodoDraft | null
  logId: string
}

export type CreateTodoTreeInput = {
  dayIndex: number
  weekStart: string
  parent?: { title: string }
  subtasks?: Array<{ title: string; estimatedHours: number }>
  root?: { title: string; estimatedHours: number }
}

export type CreateTodoTreeResult = {
  parent?: WeekPlanTodo
  subtasks?: WeekPlanTodo[]
  root?: WeekPlanTodo
}

export type WeekPlanData = {
  weekStart: string
  pending: WeekPlanPendingActivity[]
  todos: WeekPlanTodo[]
}

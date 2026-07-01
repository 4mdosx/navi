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

export type WeekPlanData = {
  weekStart: string
  pending: WeekPlanPendingActivity[]
  todos: WeekPlanTodo[]
}

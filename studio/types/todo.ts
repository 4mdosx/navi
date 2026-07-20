export type TodoStatus = 'active' | 'pending' | 'blocked' | 'done' | 'cancelled'
export type TodoPlacement = 'backlog' | 'week_plan'

export type Todo = {
  id: string
  parentId: string | null
  sortOrder: number
  depth: number
  title: string
  description: string
  content: string
  status: TodoStatus
  estimatedMinutes: number
  placement: TodoPlacement
  hour: number
  dayIndex: number | null
  weekStart: string | null
  version: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateTodoInput = {
  title: string
  description?: string
  content?: string
  parentId?: string | null
  status?: TodoStatus
  estimatedMinutes?: number
  placement?: TodoPlacement
  hour?: number
  dayIndex?: number | null
  weekStart?: string | null
  sortOrder?: number
}

export type UpdateTodoInput = Partial<Omit<CreateTodoInput, 'parentId'>> & {
  version?: number
}

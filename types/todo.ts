export type TodoStatus = 'active' | 'pending' | 'blocked' | 'done' | 'cancelled'
export type TodoPlacement = 'backlog' | 'week_plan'
export type TodoKind = 'direction' | 'outcome' | 'action' | 'habit' | 'note'
export type TimeGrain = 'day' | 'week' | 'horizon'

export const TIME_GRAINS: TimeGrain[] = ['day', 'week', 'horizon']

export function isTimeGrain(value: string): value is TimeGrain {
  return TIME_GRAINS.includes(value as TimeGrain)
}

export type TodoTimeLink = {
  id: string
  todoId: string
  grain: TimeGrain
  date: string
}

export function todoTimeLinks(todo?: Pick<Todo, 'timeLinks'> | null): TodoTimeLink[] {
  return Array.isArray(todo?.timeLinks) ? todo.timeLinks : []
}

export function hasTimeLink(
  todo?: Pick<Todo, 'timeLinks'> | null,
  grain: TimeGrain = 'week',
  date?: string,
): boolean {
  return todoTimeLinks(todo).some((link) => link.grain === grain && (date == null || link.date === date))
}

export function isThemeKind(kind: TodoKind): boolean {
  return kind === 'direction' || kind === 'outcome'
}

export function isCheckableKind(kind: TodoKind): boolean {
  return kind === 'action' || kind === 'habit'
}

export function isNoteKind(kind: TodoKind): boolean {
  return kind === 'note'
}

export function isOpenTodoStatus(status: TodoStatus): boolean {
  return status !== 'done' && status !== 'cancelled'
}

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
  kind: TodoKind
  reviewAt: string | null
  activationCondition: string
  hour: number
  dayIndex: number | null
  weekStart: string | null
  timeLinks?: TodoTimeLink[]
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
  kind?: TodoKind
  reviewAt?: string | null
  activationCondition?: string
  hour?: number
  dayIndex?: number | null
  weekStart?: string | null
  time?: Array<{ grain: TimeGrain; date: string }>
  sortOrder?: number
}

export type UpdateTodoInput = Partial<Omit<CreateTodoInput, 'parentId'>> & {
  version?: number
}

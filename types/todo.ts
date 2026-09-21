export type TodoStatus = 'active' | 'pending' | 'blocked' | 'done' | 'cancelled'
export type TodoPlacement = 'backlog' | 'week_plan'
export type TodoKind = 'direction' | 'outcome' | 'action' | 'habit' | 'note'
export type TodoNoteType = 'user' | 'status_change'
export type TimeGrain = 'day' | 'week' | 'horizon'

export const TODO_STATUSES: TodoStatus[] = ['pending', 'active', 'blocked', 'done', 'cancelled']
export const TODO_STATUS_LABEL: Record<TodoStatus, string> = {
  pending: '待办',
  active: '进行中',
  blocked: '冻结',
  done: '完成',
  cancelled: '放弃',
}
export const NOTE_TYPES: TodoNoteType[] = ['user', 'status_change']
export const TIME_GRAINS: TimeGrain[] = ['day', 'week', 'horizon']

export function isTodoStatus(value: string): value is TodoStatus {
  return TODO_STATUSES.includes(value as TodoStatus)
}

export function isTodoNoteType(value: string): value is TodoNoteType {
  return NOTE_TYPES.includes(value as TodoNoteType)
}

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

export function isCarryTodoStatus(status: TodoStatus): boolean {
  return status === 'pending' || status === 'active' || status === 'blocked'
}

export function isStatusChangeNote(todo?: Pick<Todo, 'kind' | 'noteType'> | null): boolean {
  return todo?.kind === 'note' && todo.noteType === 'status_change'
}

export function isEditableNote(todo?: Pick<Todo, 'kind' | 'noteType'> | null): boolean {
  return todo?.kind === 'note' && todo.noteType !== 'status_change'
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
  noteType: TodoNoteType
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
  noteType?: TodoNoteType
}

export type UpdateTodoInput = Partial<Omit<CreateTodoInput, 'parentId'>> & {
  version?: number
}

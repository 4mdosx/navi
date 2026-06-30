import { create } from 'zustand'

export type PendingActivity = {
  id: string
  title: string
  /** 预计时长（小时） */
  day: number
  /** 卡片宽度格数（展示用） */
  hour: number
}

export type ActivityDragPayload = {
  kind: 'week-activity'
  source: 'pending' | 'todo'
  id: string
  title: string
  day: number
  hour: number
}

export type TodoStatus = 'active' | 'pending' | 'done'

export type TodoItem = {
  id: string
  title: string
  status: TodoStatus
  estimatedHours: number
  hour: number
  /** 0 = 周日 … 6 = 周六 */
  dayIndex: number
  startedAtMs?: number
  completedAtMs?: number
}

const INITIAL_PENDING: PendingActivity[] = [
  { id: '1', title: '高等数学（习题）', day: 3, hour: 1 },
  { id: '2', title: '实验课', day: 1, hour: 2 },
  { id: '3', title: '小组项目', day: 2, hour: 3 },
  { id: '4', title: '讲座', day: 1, hour: 1 },
]

type TodoStore = {
  draggingPayload: ActivityDragPayload | null
  pending: PendingActivity[]
  todos: TodoItem[]
  setDraggingPayload: (payload: ActivityDragPayload | null) => void
  addTodoFromDrop: (
    activity: Omit<ActivityDragPayload, 'kind' | 'source'>,
    dayIndex: number
  ) => void
  moveTodoBackToPending: (id: string) => void
  startTodo: (id: string) => void
  completeTodo: (id: string) => void
  removeTodo: (id: string) => void
  resetDemo: () => void
}

function demoteActive(todos: TodoItem[]): TodoItem[] {
  return todos.map((t) =>
    t.status === 'active' ? { ...t, status: 'pending' as const, startedAtMs: undefined } : t
  )
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  draggingPayload: null,
  pending: INITIAL_PENDING,
  todos: [],
  setDraggingPayload: (payload) => set({ draggingPayload: payload }),
  moveTodoBackToPending: (id) => {
    const { pending, todos } = get()
    const target = todos.find((t) => t.id === id)
    if (!target) return
    const existsInPending = pending.some((p) => p.id === id)
    set({
      todos: todos.filter((t) => t.id !== id),
      pending: existsInPending
        ? pending
        : [
            {
              id: target.id,
              title: target.title,
              day: target.estimatedHours,
              hour: target.hour,
            },
            ...pending,
          ],
      draggingPayload: null,
    })
  },
  addTodoFromDrop: ({ id, title, day, hour }, dayIndex) => {
    const { pending, todos } = get()
    const now = Date.now()
    const existing = todos.find((t) => t.id === id)
    const nextTodos = demoteActive(todos.filter((t) => t.id !== id))
    const item: TodoItem = existing
      ? {
          ...existing,
          status: 'active',
          dayIndex,
          startedAtMs: now,
          completedAtMs: undefined,
        }
      : {
          id,
          title,
          status: 'active',
          estimatedHours: day,
          hour,
          dayIndex,
          startedAtMs: now,
        }
    set({
      todos: [item, ...nextTodos],
      pending: pending.filter((p) => p.id !== id),
      draggingPayload: null,
    })
  },
  startTodo: (id) => {
    const { todos } = get()
    const now = Date.now()
    set({
      todos: demoteActive(todos).map((t) =>
        t.id === id
          ? { ...t, status: 'active' as const, startedAtMs: now, completedAtMs: undefined }
          : t
      ),
    })
  },
  completeTodo: (id) => {
    const { todos } = get()
    const now = Date.now()
    set({
      todos: todos.map((t) =>
        t.id === id ? { ...t, status: 'done' as const, completedAtMs: now } : t
      ),
    })
  },
  removeTodo: (id) => {
    set({ todos: get().todos.filter((t) => t.id !== id) })
  },
  resetDemo: () =>
    set({
      pending: INITIAL_PENDING,
      todos: [],
      draggingPayload: null,
    }),
}))

export function parseActivityDragPayload(
  dataTransfer: DataTransfer
): ActivityDragPayload | null {
  const raw = dataTransfer.getData('application/json') || dataTransfer.getData('text/plain')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ActivityDragPayload
    if (parsed.kind !== 'week-activity') return null
    if (parsed.source !== 'pending' && parsed.source !== 'todo') return null
    return parsed
  } catch {
    return null
  }
}

export function hasActivityDragPayload(dataTransfer: DataTransfer): boolean {
  return (
    dataTransfer.types.includes('application/json') ||
    dataTransfer.types.includes('text/plain')
  )
}

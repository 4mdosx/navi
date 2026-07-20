import 'server-only'
import {
  createTodo, deleteTodo, getTodo, listTodos, updateTodo,
} from '@/backstage/todo/todo.service'
import { normalizeEstimatedHours } from './week-plan-hours'
import type {
  CreateTodoTreeInput, CreateTodoTreeResult, TodoStatus,
  WeekPlanData, WeekPlanPendingActivity, WeekPlanTodo,
} from '@/types/week-plan'
import type { Todo } from '@/types/todo'

function toWeekTodo(todo: Todo): WeekPlanTodo {
  return {
    id: todo.id,
    parentId: todo.parentId,
    sortOrder: todo.sortOrder,
    title: todo.title,
    description: todo.description,
    content: todo.content,
    version: todo.version,
    status: todo.status,
    estimatedHours: todo.estimatedMinutes / 60,
    hour: todo.hour,
    dayIndex: todo.dayIndex ?? 0,
    weekStart: todo.weekStart ?? '',
    startedAtMs: todo.startedAt ? Date.parse(todo.startedAt) : undefined,
    completedAtMs: todo.completedAt ? Date.parse(todo.completedAt) : undefined,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  }
}

function toPending(todo: Todo): WeekPlanPendingActivity {
  return { id: todo.id, title: todo.title, day: todo.estimatedMinutes / 60, hour: todo.hour }
}

export async function getWeekPlanData(weekStart: string): Promise<WeekPlanData> {
  const [pending, todos] = await Promise.all([
    listTodos({ placement: 'backlog' }),
    listTodos({ placement: 'week_plan', weekStart }),
  ])
  return { weekStart, pending: pending.map(toPending), todos: todos.map(toWeekTodo) }
}

export async function createWeekPlanTodo(input: {
  title: string; description?: string; content?: string; dayIndex: number; weekStart: string
  estimatedHours?: number; hour?: number; status?: TodoStatus; startedAtMs?: number
}): Promise<WeekPlanTodo> {
  const todo = await createTodo({
    title: input.title,
    description: input.description,
    content: input.content,
    dayIndex: input.dayIndex,
    weekStart: input.weekStart,
    estimatedMinutes: normalizeEstimatedHours(input.estimatedHours ?? 1) * 60,
    hour: input.hour,
    status: input.status,
    placement: 'week_plan',
  })
  return toWeekTodo(todo)
}

export async function createWeekPlanTodoTree(input: CreateTodoTreeInput): Promise<CreateTodoTreeResult> {
  const subtasks = input.subtasks ?? []
  if (subtasks.length === 0) {
    const root = input.root ?? (input.parent ? { title: input.parent.title, estimatedHours: 1 } : null)
    if (!root) throw new Error('root title is required')
    return { root: await createWeekPlanTodo({ ...root, dayIndex: input.dayIndex, weekStart: input.weekStart }) }
  }
  if (!input.parent?.title.trim()) throw new Error('parent title is required when subtasks are provided')
  const parent = await createTodo({
    title: input.parent.title,
    estimatedMinutes: subtasks.reduce((sum, item) => sum + normalizeEstimatedHours(item.estimatedHours) * 60, 0),
    dayIndex: input.dayIndex, weekStart: input.weekStart, placement: 'week_plan',
  })
  const children: Todo[] = []
  try {
    for (let index = 0; index < subtasks.length; index++) {
      const item = subtasks[index]
      children.push(await createTodo({
        title: item.title, parentId: parent.id, sortOrder: index,
        estimatedMinutes: normalizeEstimatedHours(item.estimatedHours) * 60,
        dayIndex: input.dayIndex, weekStart: input.weekStart, placement: 'week_plan',
      }))
    }
  } catch (error) {
    await deleteTodo(parent.id, true)
    throw error
  }
  return { parent: toWeekTodo(parent), subtasks: children.map(toWeekTodo) }
}

export async function addTodoFromPendingActivity(input: {
  id: string; title: string; day: number; hour: number; dayIndex: number; weekStart: string
}): Promise<{ todo: WeekPlanTodo; pending: WeekPlanPendingActivity[] }> {
  const todo = await updateTodo(input.id, {
    title: input.title, status: 'active', placement: 'week_plan',
    estimatedMinutes: normalizeEstimatedHours(input.day) * 60,
    hour: input.hour, dayIndex: input.dayIndex, weekStart: input.weekStart,
  })
  const pending = await listTodos({ placement: 'backlog' })
  return { todo: toWeekTodo(todo), pending: pending.map(toPending) }
}

export async function moveTodoToPending(id: string): Promise<{
  pending: WeekPlanPendingActivity[]; todos: WeekPlanTodo[]
}> {
  const current = await getTodo(id)
  await updateTodo(id, {
    placement: 'backlog', status: 'pending', weekStart: null, dayIndex: null,
  })
  const [pending, todos] = await Promise.all([
    listTodos({ placement: 'backlog' }),
    current.weekStart ? listTodos({ placement: 'week_plan', weekStart: current.weekStart }) : [],
  ])
  return { pending: pending.map(toPending), todos: todos.map(toWeekTodo) }
}

export async function startWeekPlanTodo(id: string, weekStart: string): Promise<WeekPlanTodo> {
  const children = await listTodos({ parentId: id })
  if (children.length) throw new Error('Cannot start a parent todo with subtasks; start a subtask instead')
  const active = (await listTodos({ placement: 'week_plan', weekStart })).filter((todo) => todo.status === 'active')
  await Promise.all(active.filter((todo) => todo.id !== id).map((todo) => updateTodo(todo.id, { status: 'pending' })))
  return toWeekTodo(await updateTodo(id, { status: 'active' }))
}

export async function completeWeekPlanTodo(id: string): Promise<WeekPlanTodo> {
  return toWeekTodo(await updateTodo(id, { status: 'done' }))
}

export async function deleteWeekPlanTodo(id: string): Promise<void> {
  await deleteTodo(id, true)
}

export async function createPendingActivity(input: {
  title: string; estimatedHours?: number; hour?: number
}): Promise<WeekPlanPendingActivity> {
  return toPending(await createTodo({
    title: input.title,
    estimatedMinutes: normalizeEstimatedHours(input.estimatedHours ?? 1) * 60,
    hour: input.hour,
    placement: 'backlog',
  }))
}

export async function updatePendingActivity(id: string, input: {
  title?: string; estimatedHours?: number; hour?: number
}): Promise<WeekPlanPendingActivity> {
  return toPending(await updateTodo(id, {
    title: input.title,
    estimatedMinutes: input.estimatedHours == null ? undefined : normalizeEstimatedHours(input.estimatedHours) * 60,
    hour: input.hour,
  }))
}

export async function deletePendingActivity(id: string): Promise<void> {
  await deleteTodo(id)
}

import type {
  WeekPlanData,
  WeekPlanPendingActivity,
  WeekPlanTodo,
  ParseTodoCopilotResult,
  CreateTodoTreeResult,
} from '@/types/week-plan'
import { formatWeekStart } from '@/backstage/week-plan/week-utils'

export const formatWeekStartClient = formatWeekStart

export type CopilotLlmLog = {
  id: string
  feature: string
  model: string
  messages: Array<{ role: string; content: string }>
  requestMeta?: { temperature?: number; maxTokens?: number }
  responseText: string | null
  error: string | null
  createdAt: string
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(
      typeof data?.error === 'string' ? data.error : 'Request failed'
    ) as Error & { logId?: string }
    if (typeof data?.logId === 'string') {
      err.logId = data.logId
    }
    throw err
  }
  return data as T
}

export async function fetchWeekPlan(weekStart: string): Promise<WeekPlanData> {
  const res = await fetch(
    `/api/week-plan?weekStart=${encodeURIComponent(weekStart)}`,
    { credentials: 'include' }
  )
  return parseJson<WeekPlanData>(res)
}

export async function apiCreateTodo(input: {
  title: string
  dayIndex: number
  weekStart: string
  estimatedHours?: number
}): Promise<WeekPlanTodo> {
  const res = await fetch('/api/week-plan/todos', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ todo: WeekPlanTodo }>(res)
  return data.todo
}

export async function apiAddTodoFromPending(input: {
  id: string
  title: string
  day: number
  hour: number
  dayIndex: number
  weekStart: string
}): Promise<{ todo: WeekPlanTodo; pending: WeekPlanPendingActivity[] }> {
  const res = await fetch('/api/week-plan/todos', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'fromPending', ...input }),
  })
  return parseJson(res)
}

export async function apiStartTodo(
  id: string,
  weekStart: string
): Promise<WeekPlanTodo> {
  const res = await fetch('/api/week-plan/todos', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'start', weekStart }),
  })
  const data = await parseJson<{ todo: WeekPlanTodo }>(res)
  return data.todo
}

export async function apiCompleteTodo(id: string): Promise<WeekPlanTodo> {
  const res = await fetch('/api/week-plan/todos', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'complete' }),
  })
  const data = await parseJson<{ todo: WeekPlanTodo }>(res)
  return data.todo
}

export async function apiMoveTodoToPending(id: string): Promise<{
  pending: WeekPlanPendingActivity[]
  todos: WeekPlanTodo[]
}> {
  const res = await fetch('/api/week-plan/todos', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'moveToPending' }),
  })
  return parseJson(res)
}

export async function apiDeleteTodo(id: string): Promise<void> {
  const res = await fetch('/api/week-plan/todos', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  await parseJson(res)
}

export async function apiCreatePending(input: {
  title: string
  estimatedHours?: number
  hour?: number
}): Promise<WeekPlanPendingActivity> {
  const res = await fetch('/api/week-plan/pending', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<{ pending: WeekPlanPendingActivity }>(res)
  return data.pending
}

export async function apiUpdatePending(
  id: string,
  input: { title?: string; estimatedHours?: number; hour?: number }
): Promise<WeekPlanPendingActivity> {
  const res = await fetch('/api/week-plan/pending', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...input }),
  })
  const data = await parseJson<{ pending: WeekPlanPendingActivity }>(res)
  return data.pending
}

export async function apiDeletePending(id: string): Promise<void> {
  const res = await fetch('/api/week-plan/pending', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  await parseJson(res)
}

export async function apiParseTodoCopilot(input: {
  text: string
  dayLabel?: string
}): Promise<ParseTodoCopilotResult> {
  const res = await fetch('/api/week-plan/parse-todo', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await parseJson<ParseTodoCopilotResult & { success?: boolean }>(res)
  return {
    parent: data.parent ?? null,
    subtasks: data.subtasks ?? [],
    root: data.root ?? null,
    logId: data.logId,
  }
}

export async function apiFetchCopilotLog(id: string): Promise<CopilotLlmLog> {
  const res = await fetch(
    `/api/week-plan/parse-todo?id=${encodeURIComponent(id)}`,
    { credentials: 'include' }
  )
  const data = await parseJson<{ log: CopilotLlmLog }>(res)
  return data.log
}

export async function apiCreateTodoTree(input: {
  dayIndex: number
  weekStart: string
  parent?: { title: string }
  subtasks?: Array<{ title: string; estimatedHours: number }>
  root?: { title: string; estimatedHours: number }
}): Promise<CreateTodoTreeResult> {
  const res = await fetch('/api/week-plan/todos', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'createTree', ...input }),
  })
  return parseJson(res)
}

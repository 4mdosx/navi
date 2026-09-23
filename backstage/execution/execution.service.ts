import 'server-only'
import { nanoid } from 'nanoid'
import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm'
import { getDatabase } from '@/backstage/db/database'
import { executionSessions, todoTimeLinks, todos, workItems } from '@/backstage/db/schema'
import { linkTodoTime, updateTodo } from '@/backstage/todo/todo.service'
import type { TodayExecution, WorkItemState, ExecutionActivity } from '@/types/execution'

const key = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export async function syncToday(date = key()) {
  const db = await getDatabase()
  const links = await db.select().from(todoTimeLinks)
    .where(and(eq(todoTimeLinks.grain, 'day'), eq(todoTimeLinks.date, date)))
  const now = new Date().toISOString()
  for (const link of links) {
    const [todo] = await db.select().from(todos).where(eq(todos.id, link.todoId)).limit(1)
    if (!todo || todo.status === 'done' || todo.status === 'cancelled') continue
    await db.insert(workItems).values({
      id: `work-todo-${todo.id}-${date}`, sourceType: 'todo', sourceId: todo.id,
      title: todo.title, description: todo.description, scheduledDate: date,
      queueOrder: todo.sortOrder, priority: 'normal', state: todo.status === 'active' ? 'paused' : 'ready',
      plannedMinutes: todo.estimatedMinutes, createdAt: now, updatedAt: now,
    }).onConflictDoNothing({ target: [workItems.sourceType, workItems.sourceId, workItems.scheduledDate] })
  }
}

export async function getToday(date = key()): Promise<TodayExecution> {
  await syncToday(date)
  const db = await getDatabase()
  const items = await db.select().from(workItems)
    .where(and(eq(workItems.scheduledDate, date), eq(workItems.sourceType, 'todo'))).orderBy(asc(workItems.queueOrder)) as TodayExecution['items']
  const ids = new Set(items.map((item) => item.id))
  const sessions = (await db.select().from(executionSessions)
    .where(gte(executionSessions.startedAt, `${date}T00:00:00`)).orderBy(asc(executionSessions.startedAt)) as TodayExecution['sessions'])
    .filter((session) => ids.has(session.workItemId))
  return { items, sessions }
}

async function closeOpenSessions(endReason: 'paused' | 'switched' | 'completed' | 'interrupted', now: string) {
  const db = await getDatabase()
  const open = await db.select().from(executionSessions).where(isNull(executionSessions.endedAt))
  for (const session of open) {
    await db.update(executionSessions).set({ endedAt: now, endReason }).where(eq(executionSessions.id, session.id))
    await db.update(workItems).set({ state: 'paused', updatedAt: now }).where(eq(workItems.id, session.workItemId))
  }
}

export async function act(id: string, action: 'start' | 'pause' | 'complete') {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const [item] = await db.select().from(workItems).where(eq(workItems.id, id)).limit(1)
  if (!item) throw new Error(`Work item not found: ${id}`)
  await closeOpenSessions(action === 'start' ? 'switched' : action === 'complete' ? 'completed' : 'paused', now)
  if (action === 'start') {
    await db.update(workItems).set({ state: 'active', updatedAt: now }).where(eq(workItems.id, id))
    await db.insert(executionSessions).values({
      id: `session-${Date.now()}-${nanoid(6)}`, workItemId: id, startedAt: now,
      endedAt: null, endReason: null, note: '',
    })
    if (item.sourceType === 'todo') {
      await updateTodo(item.sourceId, { status: 'active' })
    }
  } else {
    const state = action === 'complete' ? 'done' : 'paused'
    await db.update(workItems).set({ state: state as WorkItemState, updatedAt: now }).where(eq(workItems.id, id))
    if (action === 'complete' && item.sourceType === 'todo') {
      await updateTodo(item.sourceId, { status: 'done' })
    }
  }
  return getToday()
}

export async function promoteTodo(todoId: string) {
  const db = await getDatabase()
  const [todo] = await db.select().from(todos).where(eq(todos.id, todoId)).limit(1)
  if (!todo) throw new Error(`Todo not found: ${todoId}`)
  const date = key()
  const now = new Date().toISOString()
  await linkTodoTime(todoId, 'day', date)
  await db.insert(workItems).values({
    id: `work-todo-${todo.id}-${date}`, sourceType: 'todo', sourceId: todo.id,
    title: todo.title, description: todo.description, scheduledDate: date,
    queueOrder: -1, priority: 'high', state: 'ready', plannedMinutes: todo.estimatedMinutes,
    createdAt: now, updatedAt: now,
  }).onConflictDoUpdate({
    target: [workItems.sourceType, workItems.sourceId, workItems.scheduledDate],
    set: { queueOrder: -1, priority: 'high', state: 'ready', updatedAt: now },
  })
  return getToday()
}

export async function startTodoNow(todoId: string) {
  const data = await promoteTodo(todoId)
  const item = data.items.find((candidate) => candidate.sourceType === 'todo' && candidate.sourceId === todoId)
  if (!item) throw new Error('Promoted Todo work item not found')
  return act(item.id, 'start')
}

export async function removeFromToday(todoId: string) {
  const db = await getDatabase()
  const date = key()
  const now = new Date().toISOString()
  const [todo] = await db.select({ id: todos.id, status: todos.status }).from(todos).where(eq(todos.id, todoId)).limit(1)
  if (!todo) throw new Error(`Todo not found: ${todoId}`)
  await db.delete(todoTimeLinks)
    .where(and(
      eq(todoTimeLinks.todoId, todoId),
      eq(todoTimeLinks.grain, 'day'),
      lte(todoTimeLinks.date, date),
    ))
  const [item] = await db.select().from(workItems)
    .where(and(
      eq(workItems.sourceType, 'todo'),
      eq(workItems.sourceId, todoId),
      eq(workItems.scheduledDate, date),
    ))
    .limit(1)
  if (item) {
    const open = await db.select().from(executionSessions)
      .where(and(eq(executionSessions.workItemId, item.id), isNull(executionSessions.endedAt)))
    for (const session of open) {
      await db.update(executionSessions).set({ endedAt: now, endReason: 'interrupted' }).where(eq(executionSessions.id, session.id))
    }
    await db.update(workItems).set({ state: 'skipped', updatedAt: now }).where(eq(workItems.id, item.id))
  }
  if (todo.status === 'active') await updateTodo(todo.id, { status: 'pending' })
  return getToday()
}

export async function listExecutionActivity(from?: string): Promise<ExecutionActivity[]> {
  const db = await getDatabase()
  const filters = [eq(workItems.sourceType, 'todo')]
  if (from) filters.push(gte(executionSessions.startedAt, from))
  return await db.select({
    sessionId: executionSessions.id,
    workItemId: executionSessions.workItemId,
    startedAt: executionSessions.startedAt,
    endedAt: executionSessions.endedAt,
    endReason: executionSessions.endReason,
    todoId: workItems.sourceId,
    title: workItems.title,
  }).from(executionSessions)
    .innerJoin(workItems, eq(workItems.id, executionSessions.workItemId))
    .where(and(...filters))
    .orderBy(asc(executionSessions.startedAt)) as ExecutionActivity[]
}

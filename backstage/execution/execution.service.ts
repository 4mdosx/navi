import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import { linkTodoTime, updateTodo } from '@/backstage/todo/todo.service'
import type { TodayExecution, WorkItemState, ExecutionActivity } from '@/types/execution'

const key = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export async function syncToday(date = key()) {
  const db = await getDatabase()
  const links = await db.selectFrom('todo_time_links').selectAll()
    .where('grain', '=', 'day').where('date', '=', date).execute()
  const now = new Date().toISOString()
  for (const link of links) {
    const todo = await db.selectFrom('todos').selectAll().where('id', '=', link.todoId).executeTakeFirst()
    if (!todo || todo.status === 'done' || todo.status === 'cancelled') continue
    await db.insertInto('work_items').values({
      id: `work-todo-${todo.id}-${date}`, sourceType: 'todo', sourceId: todo.id,
      title: todo.title, description: todo.description, scheduledDate: date,
      queueOrder: todo.sortOrder, priority: 'normal', state: todo.status === 'active' ? 'paused' : 'ready',
      plannedMinutes: todo.estimatedMinutes, createdAt: now, updatedAt: now,
    }).onConflict((conflict) => conflict.columns(['sourceType', 'sourceId', 'scheduledDate']).doNothing()).execute()
  }
}

export async function getToday(date = key()): Promise<TodayExecution> {
  await syncToday(date)
  const db = await getDatabase()
  const items = await db.selectFrom('work_items').selectAll()
    .where('scheduledDate', '=', date).where('sourceType', '=', 'todo').orderBy('queueOrder').execute() as TodayExecution['items']
  const ids = new Set(items.map((item) => item.id))
  const sessions = (await db.selectFrom('execution_sessions').selectAll()
    .where('startedAt', '>=', `${date}T00:00:00`).orderBy('startedAt').execute() as TodayExecution['sessions'])
    .filter((session) => ids.has(session.workItemId))
  return { items, sessions }
}

async function closeOpenSessions(endReason: 'paused' | 'switched' | 'completed' | 'interrupted', now: string) {
  const db = await getDatabase()
  const open = await db.selectFrom('execution_sessions').selectAll().where('endedAt', 'is', null).execute()
  for (const session of open) {
    await db.updateTable('execution_sessions').set({ endedAt: now, endReason }).where('id', '=', session.id).execute()
    await db.updateTable('work_items').set({ state: 'paused', updatedAt: now }).where('id', '=', session.workItemId).execute()
  }
}

export async function act(id: string, action: 'start' | 'pause' | 'complete') {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const item = await db.selectFrom('work_items').selectAll().where('id', '=', id).executeTakeFirstOrThrow()
  await closeOpenSessions(action === 'start' ? 'switched' : action === 'complete' ? 'completed' : 'paused', now)
  if (action === 'start') {
    await db.updateTable('work_items').set({ state: 'active', updatedAt: now }).where('id', '=', id).execute()
    await db.insertInto('execution_sessions').values({
      id: `session-${Date.now()}-${nanoid(6)}`, workItemId: id, startedAt: now,
      endedAt: null, endReason: null, note: '',
    }).execute()
    if (item.sourceType === 'todo') {
      await updateTodo(item.sourceId, { status: 'active' })
    }
  } else {
    const state = action === 'complete' ? 'done' : 'paused'
    await db.updateTable('work_items').set({ state: state as WorkItemState, updatedAt: now }).where('id', '=', id).execute()
    if (action === 'complete' && item.sourceType === 'todo') {
      await updateTodo(item.sourceId, { status: 'done' })
    }
  }
  return getToday()
}

export async function promoteTodo(todoId: string) {
  const db = await getDatabase()
  const todo = await db.selectFrom('todos').selectAll().where('id', '=', todoId).executeTakeFirstOrThrow()
  const date = key()
  const now = new Date().toISOString()
  await linkTodoTime(todoId, 'day', date)
  await db.insertInto('work_items').values({
    id: `work-todo-${todo.id}-${date}`, sourceType: 'todo', sourceId: todo.id,
    title: todo.title, description: todo.description, scheduledDate: date,
    queueOrder: -1, priority: 'high', state: 'ready', plannedMinutes: todo.estimatedMinutes,
    createdAt: now, updatedAt: now,
  }).onConflict((conflict) => conflict.columns(['sourceType', 'sourceId', 'scheduledDate'])
    .doUpdateSet({ queueOrder: -1, priority: 'high', state: 'ready', updatedAt: now })).execute()
  return getToday()
}

export async function startTodoNow(todoId: string) {
  const data = await promoteTodo(todoId)
  const item = data.items.find((candidate) => candidate.sourceType === 'todo' && candidate.sourceId === todoId)
  if (!item) throw new Error('Promoted Todo work item not found')
  return act(item.id, 'start')
}

export async function removeFromToday(id: string) {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const item = await db.selectFrom('work_items').selectAll().where('id', '=', id).executeTakeFirstOrThrow()
  const open = await db.selectFrom('execution_sessions').selectAll()
    .where('workItemId', '=', id).where('endedAt', 'is', null).execute()
  for (const session of open) {
    await db.updateTable('execution_sessions').set({ endedAt: now, endReason: 'interrupted' }).where('id', '=', session.id).execute()
  }
  await db.updateTable('work_items').set({ state: 'skipped', updatedAt: now }).where('id', '=', id).execute()
  if (item.sourceType === 'todo') {
    const todo = await db.selectFrom('todos').select(['id', 'status']).where('id', '=', item.sourceId).executeTakeFirst()
    if (todo?.status === 'active') await updateTodo(todo.id, { status: 'pending' })
  }
  return getToday()
}

export async function listExecutionActivity(from?: string): Promise<ExecutionActivity[]> {
  const db = await getDatabase()
  let query = db.selectFrom('execution_sessions').innerJoin('work_items', 'work_items.id', 'execution_sessions.workItemId')
    .select([
      'execution_sessions.id as sessionId', 'execution_sessions.workItemId',
      'execution_sessions.startedAt', 'execution_sessions.endedAt', 'execution_sessions.endReason',
      'work_items.sourceId as todoId', 'work_items.title',
    ]).where('work_items.sourceType', '=', 'todo')
  if (from) query = query.where('execution_sessions.startedAt', '>=', from)
  return await query.orderBy('execution_sessions.startedAt', 'asc').execute() as ExecutionActivity[]
}

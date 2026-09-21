import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import type { TodoTimeSpan } from '@/types/todo'

export async function startTodoTimeSpan(todoId: string): Promise<TodoTimeSpan> {
  const db = await getDatabase()
  const open = await db.selectFrom('todo_time_spans').selectAll()
    .where('todoId', '=', todoId)
    .where('endedAt', 'is', null)
    .executeTakeFirst()
  if (open) return open
  const now = new Date().toISOString()
  const span: TodoTimeSpan = {
    id: `span-${Date.now()}-${nanoid(6)}`,
    todoId,
    startedAt: now,
    endedAt: null,
    createdAt: now,
  }
  await db.insertInto('todo_time_spans').values(span).execute()
  return span
}

export async function stopTodoTimeSpan(todoId: string): Promise<void> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db.updateTable('todo_time_spans')
    .set({ endedAt: now })
    .where('todoId', '=', todoId)
    .where('endedAt', 'is', null)
    .execute()
}

export async function listTodoTimeSpans(input: {
  from?: string
  to?: string
} = {}): Promise<TodoTimeSpan[]> {
  const db = await getDatabase()
  let query = db.selectFrom('todo_time_spans').selectAll()
  if (input.from) {
    query = query.where((eb) => eb.or([
      eb('endedAt', 'is', null),
      eb('endedAt', '>', input.from!),
    ]))
  }
  if (input.to) {
    query = query.where('startedAt', '<', input.to)
  }
  return await query.orderBy('startedAt', 'asc').execute()
}

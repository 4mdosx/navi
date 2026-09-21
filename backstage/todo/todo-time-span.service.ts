import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import { isTodoKind, type TodoTimeSpan } from '@/types/todo'
import { sessionLimitMs } from '@/lib/todo-session'

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
  const open = await db.selectFrom('todo_time_spans').selectAll()
    .where('todoId', '=', todoId)
    .where('endedAt', 'is', null)
    .executeTakeFirst()
  if (!open) return
  const row = await db.selectFrom('todos').select('kind').where('id', '=', todoId).executeTakeFirst()
  const kind = row && isTodoKind(row.kind) ? row.kind : 'action'
  const startedAt = Date.parse(open.startedAt)
  const endedAt = new Date(Math.min(Date.now(), startedAt + sessionLimitMs(kind))).toISOString()
  await db.updateTable('todo_time_spans')
    .set({ endedAt })
    .where('id', '=', open.id)
    .execute()
}

export async function listOpenTodoTimeSpans(): Promise<TodoTimeSpan[]> {
  const db = await getDatabase()
  return await db.selectFrom('todo_time_spans').selectAll()
    .where('endedAt', 'is', null)
    .orderBy('startedAt', 'asc')
    .execute()
}

export async function listTodoTimeSpans(input: {
  from?: string
  to?: string
  todoId?: string
} = {}): Promise<TodoTimeSpan[]> {
  const db = await getDatabase()
  let query = db.selectFrom('todo_time_spans').selectAll()
  if (input.todoId) query = query.where('todoId', '=', input.todoId)
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

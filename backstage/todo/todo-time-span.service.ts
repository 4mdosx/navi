import 'server-only'
import { nanoid } from 'nanoid'
import { and, asc, eq, gt, isNull, lt, or } from 'drizzle-orm'
import { getDatabase } from '@/backstage/db/database'
import { todoTimeSpans, todos } from '@/backstage/db/schema'
import { isTodoKind, type TodoTimeSpan } from '@/types/todo'
import { sessionLimitMs } from '@/lib/todo-session'

export async function startTodoTimeSpan(todoId: string): Promise<TodoTimeSpan> {
  const db = await getDatabase()
  const [open] = await db.select().from(todoTimeSpans)
    .where(and(eq(todoTimeSpans.todoId, todoId), isNull(todoTimeSpans.endedAt)))
    .limit(1)
  if (open) return open
  const now = new Date().toISOString()
  const span: TodoTimeSpan = {
    id: `span-${Date.now()}-${nanoid(6)}`,
    todoId,
    startedAt: now,
    endedAt: null,
    createdAt: now,
  }
  await db.insert(todoTimeSpans).values(span)
  return span
}

export async function stopTodoTimeSpan(todoId: string): Promise<void> {
  const db = await getDatabase()
  const [open] = await db.select().from(todoTimeSpans)
    .where(and(eq(todoTimeSpans.todoId, todoId), isNull(todoTimeSpans.endedAt)))
    .limit(1)
  if (!open) return
  const [row] = await db.select({ kind: todos.kind }).from(todos).where(eq(todos.id, todoId)).limit(1)
  const kind = row && isTodoKind(row.kind) ? row.kind : 'action'
  const startedAt = Date.parse(open.startedAt)
  const endedAt = new Date(Math.min(Date.now(), startedAt + sessionLimitMs(kind))).toISOString()
  await db.update(todoTimeSpans)
    .set({ endedAt })
    .where(eq(todoTimeSpans.id, open.id))
}

export async function listOpenTodoTimeSpans(): Promise<TodoTimeSpan[]> {
  const db = await getDatabase()
  return await db.select().from(todoTimeSpans)
    .where(isNull(todoTimeSpans.endedAt))
    .orderBy(asc(todoTimeSpans.startedAt))
}

export async function listTodoTimeSpans(input: {
  from?: string
  to?: string
  todoId?: string
} = {}): Promise<TodoTimeSpan[]> {
  const db = await getDatabase()
  const filters = []
  if (input.todoId) filters.push(eq(todoTimeSpans.todoId, input.todoId))
  if (input.from) {
    const openOrAfter = or(isNull(todoTimeSpans.endedAt), gt(todoTimeSpans.endedAt, input.from))
    if (openOrAfter) filters.push(openOrAfter)
  }
  if (input.to) filters.push(lt(todoTimeSpans.startedAt, input.to))
  return await db.select().from(todoTimeSpans)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(todoTimeSpans.startedAt))
}

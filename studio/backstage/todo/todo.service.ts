import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import type { CreateTodoInput, Todo, TodoPlacement, TodoStatus, UpdateTodoInput } from '@/types/todo'

const STATUSES = new Set<TodoStatus>(['active', 'pending', 'blocked', 'done', 'cancelled'])
const PLACEMENTS = new Set<TodoPlacement>(['backlog', 'week_plan'])

function mapTodo(row: {
  id: string; parentId: string | null; sortOrder: number; depth: number
  title: string; description: string; content: string; status: string
  estimatedMinutes: number; placement: string; hour: number
  dayIndex: number | null; weekStart: string | null; version: number
  startedAt: string | null; completedAt: string | null
  createdAt: string; updatedAt: string
}): Todo {
  return {
    ...row,
    status: STATUSES.has(row.status as TodoStatus) ? row.status as TodoStatus : 'pending',
    placement: PLACEMENTS.has(row.placement as TodoPlacement)
      ? row.placement as TodoPlacement : 'backlog',
  }
}

async function requireParent(parentId: string) {
  const db = await getDatabase()
  const parent = await db.selectFrom('todos').select(['id', 'depth']).where('id', '=', parentId).executeTakeFirst()
  if (!parent) throw new Error(`Todo parent not found: ${parentId}`)
  if (parent.depth >= 4) throw new Error('Todo maximum depth exceeded')
  return parent
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const title = input.title.trim()
  if (!title) throw new Error('Todo title is required')
  const db = await getDatabase()
  const parent = input.parentId ? await requireParent(input.parentId) : null
  const now = new Date().toISOString()
  const id = `todo-${Date.now()}-${nanoid(8)}`
  const status = input.status && STATUSES.has(input.status) ? input.status : 'pending'
  await db.insertInto('todos').values({
    id,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder ?? 0,
    depth: parent ? parent.depth + 1 : 0,
    title,
    description: input.description?.trim() ?? '',
    content: input.content ?? '',
    status,
    estimatedMinutes: Math.max(15, Math.round(input.estimatedMinutes ?? 60)),
    placement: input.placement ?? 'backlog',
    hour: Math.max(1, Math.round(input.hour ?? 1)),
    dayIndex: input.dayIndex ?? null,
    weekStart: input.weekStart ?? null,
    version: 1,
    startedAt: status === 'active' ? now : null,
    completedAt: status === 'done' ? now : null,
    createdAt: now,
    updatedAt: now,
  }).execute()
  return getTodo(id)
}

export async function getTodo(id: string): Promise<Todo> {
  const db = await getDatabase()
  const row = await db.selectFrom('todos').selectAll().where('id', '=', id).executeTakeFirst()
  if (!row) throw new Error(`Todo not found: ${id}`)
  return mapTodo(row)
}

export async function listTodos(input: {
  placement?: TodoPlacement; weekStart?: string; parentId?: string | null
  status?: TodoStatus; query?: string
} = {}): Promise<Todo[]> {
  const db = await getDatabase()
  let query = db.selectFrom('todos').selectAll()
  if (input.placement) query = query.where('placement', '=', input.placement)
  if (input.weekStart) query = query.where('weekStart', '=', input.weekStart)
  if (input.parentId !== undefined) query = input.parentId === null
    ? query.where('parentId', 'is', null) : query.where('parentId', '=', input.parentId)
  if (input.status) query = query.where('status', '=', input.status)
  if (input.query) query = query.where((eb) => eb.or([
    eb('title', 'like', `%${input.query}%`),
    eb('description', 'like', `%${input.query}%`),
    eb('content', 'like', `%${input.query}%`),
  ]))
  return (await query.orderBy('sortOrder').orderBy('createdAt', 'desc').execute()).map(mapTodo)
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  const current = await getTodo(id)
  if (input.version != null && input.version !== current.version) {
    throw new Error(`Todo version conflict: expected ${input.version}, actual ${current.version}`)
  }
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updatedAt: now, version: current.version + 1 }
  if (input.title != null) {
    if (!input.title.trim()) throw new Error('Todo title is required')
    updates.title = input.title.trim()
  }
  if (input.description != null) updates.description = input.description
  if (input.content != null) updates.content = input.content
  if (input.estimatedMinutes != null) updates.estimatedMinutes = Math.max(15, Math.round(input.estimatedMinutes))
  if (input.placement != null) updates.placement = input.placement
  if (input.hour != null) updates.hour = Math.max(1, Math.round(input.hour))
  if (input.dayIndex !== undefined) updates.dayIndex = input.dayIndex
  if (input.weekStart !== undefined) updates.weekStart = input.weekStart
  if (input.sortOrder != null) updates.sortOrder = input.sortOrder
  if (input.status != null) {
    updates.status = input.status
    if (input.status === 'active' && !current.startedAt) updates.startedAt = now
    if (input.status === 'done') updates.completedAt = now
    else if (current.status === 'done') updates.completedAt = null
  }
  const db = await getDatabase()
  await db.updateTable('todos').set(updates).where('id', '=', id).where('version', '=', current.version).execute()
  return getTodo(id)
}

export async function updateTodoContent(id: string, input: {
  content: string; mode?: 'replace' | 'append'; version?: number
}): Promise<Todo> {
  const current = await getTodo(id)
  const content = input.mode === 'append' && current.content
    ? `${current.content.trimEnd()}\n\n${input.content}` : input.content
  return updateTodo(id, { content, version: input.version })
}

export async function moveTodo(id: string, input: {
  parentId: string | null; sortOrder?: number; version?: number
}): Promise<Todo> {
  const current = await getTodo(id)
  if (input.version != null && input.version !== current.version) throw new Error('Todo version conflict')
  if (input.parentId === id) throw new Error('Todo cannot be its own parent')
  let depth = 0
  if (input.parentId) {
    let cursor: string | null = input.parentId
    const parent = await requireParent(input.parentId)
    depth = parent.depth + 1
    while (cursor) {
      if (cursor === id) throw new Error('Todo parent cycle detected')
      const row = await getTodo(cursor)
      cursor = row.parentId
    }
  }
  const db = await getDatabase()
  await db.updateTable('todos').set({
    parentId: input.parentId, depth, sortOrder: input.sortOrder ?? 0,
    version: current.version + 1, updatedAt: new Date().toISOString(),
  }).where('id', '=', id).execute()
  return getTodo(id)
}

export async function deleteTodo(id: string, cascade = false): Promise<void> {
  await getTodo(id)
  const db = await getDatabase()
  const child = await db.selectFrom('todos').select('id').where('parentId', '=', id).executeTakeFirst()
  if (child && !cascade) throw new Error('Todo has children; cascade is required')
  await db.transaction().execute(async (trx) => {
    if (cascade) await trx.deleteFrom('todos').where('parentId', '=', id).execute()
    await trx.deleteFrom('todos').where('id', '=', id).execute()
  })
}

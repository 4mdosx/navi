import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import { parseOutline, type OutlineDraft } from '@/lib/todo-outline'
import type {
  CreateTodoInput, TimeGrain, Todo, TodoKind, TodoNoteType, TodoStatus, TodoTimeLink, UpdateTodoInput,
} from '@/types/todo'
import { isTodoKind, isTimeGrain, isTodoNoteType, TODO_STATUS_LABEL } from '@/types/todo'

const STATUSES = new Set<TodoStatus>(['active', 'pending', 'blocked', 'done', 'cancelled'])
const NOTE_TYPES = new Set<TodoNoteType>(['user', 'status_change'])
const MAX_DEPTH = 6

type TodoRow = {
  id: string; parentId: string | null; sortOrder: number; depth: number
  title: string; description: string; content: string; status: string
  estimatedMinutes: number; kind: string; version: number
  startedAt: string | null; completedAt: string | null
  createdAt: string; updatedAt: string; noteType?: string
}

function mapTodo(row: TodoRow, timeLinks: TodoTimeLink[] = []): Todo {
  return {
    ...row,
    status: STATUSES.has(row.status as TodoStatus) ? row.status as TodoStatus : 'pending',
    kind: isTodoKind(row.kind) ? row.kind : 'action',
    noteType: isTodoNoteType(row.noteType ?? '') ? row.noteType as TodoNoteType : 'user',
    timeLinks,
  }
}

async function loadTimeLinks(ids: string[]): Promise<Map<string, TodoTimeLink[]>> {
  const grouped = new Map<string, TodoTimeLink[]>()
  if (ids.length === 0) return grouped
  const db = await getDatabase()
  const rows = await db.selectFrom('todo_time_links').selectAll().where('todoId', 'in', ids).execute()
  for (const row of rows) {
    if (!isTimeGrain(row.grain)) continue
    const links = grouped.get(row.todoId) ?? []
    links.push({ id: row.id, todoId: row.todoId, grain: row.grain, date: row.date })
    grouped.set(row.todoId, links)
  }
  return grouped
}

async function withTimeLinks(rows: TodoRow[]): Promise<Todo[]> {
  const grouped = await loadTimeLinks(rows.map((row) => row.id))
  return rows.map((row) => mapTodo(row, grouped.get(row.id) ?? []))
}

async function requireParent(parentId: string) {
  const db = await getDatabase()
  const parent = await db.selectFrom('todos').select(['id', 'depth']).where('id', '=', parentId).executeTakeFirst()
  if (!parent) throw new Error(`Todo parent not found: ${parentId}`)
  if (parent.depth >= MAX_DEPTH) throw new Error('Todo maximum depth exceeded')
  return parent
}

function normalizeTimeInput(input: CreateTodoInput): Array<{ grain: TimeGrain; date: string }> {
  const links: Array<{ grain: TimeGrain; date: string }> = []
  const seen = new Set<string>()
  for (const link of input.time ?? []) {
    if (!isTimeGrain(link.grain) || !link.date.trim()) continue
    const key = `${link.grain}:${link.date.trim()}`
    if (seen.has(key)) continue
    seen.add(key)
    links.push({ grain: link.grain, date: link.date.trim() })
  }
  return links
}

export async function linkTodoTime(todoId: string, grain: TimeGrain, date: string): Promise<Todo> {
  if (!isTimeGrain(grain)) throw new Error(`Invalid time grain: ${grain}`)
  const trimmed = date.trim()
  if (!trimmed) throw new Error('Time link date is required')
  await getTodo(todoId)
  const db = await getDatabase()
  await db.insertInto('todo_time_links').values({
    id: `time-${grain}-${Date.now()}-${nanoid(6)}`,
    todoId,
    grain,
    date: trimmed,
  }).onConflict((conflict) => conflict.columns(['todoId', 'grain', 'date']).doNothing()).execute()
  return getTodo(todoId)
}

export async function unlinkTodoTime(todoId: string, grain: TimeGrain, date?: string): Promise<Todo> {
  if (!isTimeGrain(grain)) throw new Error(`Invalid time grain: ${grain}`)
  await getTodo(todoId)
  const db = await getDatabase()
  let query = db.deleteFrom('todo_time_links').where('todoId', '=', todoId).where('grain', '=', grain)
  if (date) query = query.where('date', '=', date)
  await query.execute()
  return getTodo(todoId)
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const title = input.title.trim()
  if (!title) throw new Error('Todo title is required')
  const db = await getDatabase()
  const parent = input.parentId ? await requireParent(input.parentId) : null
  const now = new Date().toISOString()
  const id = `todo-${Date.now()}-${nanoid(8)}`
  const status = input.status && STATUSES.has(input.status) ? input.status : 'pending'
  if (input.kind != null && !isTodoKind(input.kind)) throw new Error(`Invalid Todo kind: ${input.kind}`)
  const kind: TodoKind = input.kind ?? 'action'
  const noteType = kind === 'note' && input.noteType && NOTE_TYPES.has(input.noteType) ? input.noteType : 'user'
  const parentTodo = input.parentId ? await getTodo(input.parentId) : null
  const time = normalizeTimeInput(input)
  if (parentTodo && kind !== 'note') {
    for (const link of parentTodo.timeLinks ?? []) {
      if (!time.some((item) => item.grain === link.grain && item.date === link.date)) {
        time.push({ grain: link.grain, date: link.date })
      }
    }
  }
  await db.insertInto('todos').values({
    id,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder ?? 0,
    depth: parent ? parent.depth + 1 : 0,
    title,
    description: input.description?.trim() ?? '',
    content: input.content ?? '',
    status,
    estimatedMinutes: Math.max(0, Math.round(input.estimatedMinutes ?? 0)),
    kind,
    noteType,
    version: 1,
    startedAt: status === 'active' ? now : null,
    completedAt: status === 'done' ? now : null,
    createdAt: now,
    updatedAt: now,
  }).execute()
  for (const link of time) {
    await db.insertInto('todo_time_links').values({
      id: `time-${link.grain}-${Date.now()}-${nanoid(6)}`,
      todoId: id,
      grain: link.grain,
      date: link.date,
    }).onConflict((conflict) => conflict.columns(['todoId', 'grain', 'date']).doNothing()).execute()
  }
  return getTodo(id)
}

export async function getTodo(id: string): Promise<Todo> {
  const db = await getDatabase()
  const row = await db.selectFrom('todos').selectAll().where('id', '=', id).executeTakeFirst()
  if (!row) throw new Error(`Todo not found: ${id}`)
  const [todo] = await withTimeLinks([row])
  return todo
}

export async function listTodos(input: {
  parentId?: string | null
  status?: TodoStatus; kind?: TodoKind; query?: string
  grain?: TimeGrain; date?: string
} = {}): Promise<Todo[]> {
  const db = await getDatabase()
  let query = db.selectFrom('todos').selectAll()
  if (input.parentId !== undefined) query = input.parentId === null
    ? query.where('parentId', 'is', null) : query.where('parentId', '=', input.parentId)
  if (input.status) query = query.where('status', '=', input.status)
  if (input.kind) query = query.where('kind', '=', input.kind)
  if (input.query) query = query.where((eb) => eb.or([
    eb('title', 'like', `%${input.query}%`),
    eb('description', 'like', `%${input.query}%`),
    eb('content', 'like', `%${input.query}%`),
  ]))
  const rows = await query.orderBy('sortOrder').orderBy('createdAt', 'desc').execute()
  const todos = await withTimeLinks(rows)
  if (!input.grain) return todos
  return todos.filter((todo) => (todo.timeLinks ?? []).some((link) => (
    link.grain === input.grain && (input.date == null || link.date === input.date)
  )))
}

export async function updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
  const current = await getTodo(id)
  if (input.version != null && input.version !== current.version) {
    throw new Error(`Todo version conflict: expected ${input.version}, actual ${current.version}`)
  }
  if (current.kind === 'note' && current.noteType === 'status_change') {
    const locked = ['title', 'description', 'content', 'status', 'kind', 'noteType'] as const
    if (locked.some((field) => input[field] != null && input[field] !== current[field])) {
      throw new Error('Status change notes cannot be edited')
    }
  }
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updatedAt: now, version: current.version + 1 }
  if (input.title != null) {
    if (!input.title.trim()) throw new Error('Todo title is required')
    updates.title = input.title.trim()
  }
  if (input.description != null) updates.description = input.description
  if (input.content != null) updates.content = input.content
  if (input.estimatedMinutes != null) updates.estimatedMinutes = Math.max(0, Math.round(input.estimatedMinutes))
  if (input.kind != null) {
    if (!isTodoKind(input.kind)) throw new Error(`Invalid Todo kind: ${input.kind}`)
    updates.kind = input.kind
  }
  if (input.sortOrder != null) updates.sortOrder = input.sortOrder
  if (input.noteType != null) {
    if (!NOTE_TYPES.has(input.noteType)) throw new Error(`Invalid note type: ${input.noteType}`)
    updates.noteType = input.noteType
  }
  const nextStatus = input.status != null && STATUSES.has(input.status) ? input.status : null
  const statusChanged = nextStatus != null && nextStatus !== current.status
  if (nextStatus != null) {
    updates.status = nextStatus
    if (nextStatus === 'active' && !current.startedAt) updates.startedAt = now
    if (nextStatus === 'done') updates.completedAt = now
    else if (current.status === 'done') updates.completedAt = null
  }
  const db = await getDatabase()
  await db.updateTable('todos').set(updates).where('id', '=', id).where('version', '=', current.version).execute()
  if (statusChanged && current.kind !== 'note' && current.depth < MAX_DEPTH) {
    await createTodo({
      title: `状态变更：${TODO_STATUS_LABEL[current.status]} → ${TODO_STATUS_LABEL[nextStatus!]}`,
      parentId: id,
      kind: 'note',
      noteType: 'status_change',
      estimatedMinutes: 0,
      sortOrder: await nextSortOrder(id),
    })
  }
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
  const descendants: Array<{ id: string; depth: number }> = []
  const collectDescendants = async (parentId: string, parentDepth: number) => {
    const children = await db.selectFrom('todos').select('id').where('parentId', '=', parentId).execute()
    for (const child of children) {
      const childDepth = parentDepth + 1
      if (childDepth > MAX_DEPTH) throw new Error('Todo maximum depth exceeded')
      descendants.push({ id: child.id, depth: childDepth })
      await collectDescendants(child.id, childDepth)
    }
  }
  await collectDescendants(id, depth)
  const now = new Date().toISOString()
  await db.transaction().execute(async (trx) => {
    await trx.updateTable('todos').set({
      parentId: input.parentId, depth, sortOrder: input.sortOrder ?? 0,
      version: current.version + 1, updatedAt: now,
    }).where('id', '=', id).execute()
    for (const descendant of descendants) {
      await trx.updateTable('todos').set({ depth: descendant.depth, updatedAt: now })
        .where('id', '=', descendant.id).execute()
    }
  })
  return getTodo(id)
}

export async function deleteTodo(id: string, cascade = false): Promise<void> {
  const current = await getTodo(id)
  if (current.kind === 'note' && current.noteType === 'status_change') {
    throw new Error('Status change notes cannot be deleted')
  }
  const db = await getDatabase()
  const child = await db.selectFrom('todos').select('id').where('parentId', '=', id).executeTakeFirst()
  if (child && !cascade) throw new Error('Todo has children; cascade is required')
  await db.transaction().execute(async (trx) => {
    if (cascade) await trx.deleteFrom('todos').where('parentId', '=', id).execute()
    await trx.deleteFrom('todos').where('id', '=', id).execute()
  })
}

async function nextSortOrder(parentId: string | null): Promise<number> {
  const siblings = await listTodos({ parentId })
  return siblings.length === 0 ? 0 : Math.max(...siblings.map((todo) => todo.sortOrder)) + 1
}

async function createOutlineNodes(
  nodes: OutlineDraft[],
  input: { parentId: string | null; time: Array<{ grain: TimeGrain; date: string }> },
  created: Todo[],
): Promise<void> {
  for (const node of nodes) {
    const todo = await createTodo({
      title: node.title,
      parentId: input.parentId,
      kind: node.kind,
      status: node.status,
      time: input.time,
      estimatedMinutes: 0,
      sortOrder: await nextSortOrder(input.parentId),
    })
    created.push(todo)
    if (node.children.length > 0) {
      await createOutlineNodes(node.children, { ...input, parentId: todo.id }, created)
    }
  }
}

export async function importOutline(input: {
  text: string
  weekStart?: string
  parentId?: string | null
  time?: Array<{ grain: TimeGrain; date: string }>
}): Promise<{ created: Todo[]; roots: OutlineDraft[] }> {
  const roots = parseOutline(input.text)
  if (roots.length === 0) throw new Error('大纲为空，没有可导入的条目')
  const time = input.time?.filter((link) => isTimeGrain(link.grain) && link.date.trim())
    ?? (input.weekStart ? [{ grain: 'week' as const, date: input.weekStart }] : [])
  const created: Todo[] = []
  await createOutlineNodes(
    roots,
    {
      parentId: input.parentId ?? null,
      time,
    },
    created,
  )
  return { created, roots }
}

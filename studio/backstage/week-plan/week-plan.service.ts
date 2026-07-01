import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import type {
  WeekPlanData,
  WeekPlanPendingActivity,
  WeekPlanTodo,
  TodoStatus,
} from '@/types/week-plan'

const VALID_STATUSES = new Set<TodoStatus>(['active', 'pending', 'done'])

function parseIsoMs(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? undefined : ms
}

function toIsoOrNull(ms: number | null | undefined): string | null {
  if (ms == null) return null
  return new Date(ms).toISOString()
}

function mapPendingRow(row: {
  id: string
  title: string
  estimatedHours: number
  hour: number
}): WeekPlanPendingActivity {
  return {
    id: row.id,
    title: row.title,
    day: row.estimatedHours,
    hour: row.hour,
  }
}

function mapTodoRow(row: {
  id: string
  title: string
  content: string
  status: string
  estimatedHours: number
  hour: number
  dayIndex: number
  weekStart: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}): WeekPlanTodo {
  const status = VALID_STATUSES.has(row.status as TodoStatus)
    ? (row.status as TodoStatus)
    : 'pending'
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? '',
    status,
    estimatedHours: row.estimatedHours,
    hour: row.hour,
    dayIndex: row.dayIndex,
    weekStart: row.weekStart,
    startedAtMs: parseIsoMs(row.startedAt),
    completedAtMs: parseIsoMs(row.completedAt),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getWeekPlanData(weekStart: string): Promise<WeekPlanData> {
  const db = await getDatabase()

  const pendingRows = await db
    .selectFrom('week_plan_pending')
    .selectAll()
    .orderBy('sortOrder', 'asc')
    .orderBy('createdAt', 'asc')
    .execute()

  const todoRows = await db
    .selectFrom('week_plan_todos')
    .selectAll()
    .where('weekStart', '=', weekStart)
    .orderBy('createdAt', 'desc')
    .execute()

  return {
    weekStart,
    pending: pendingRows.map(mapPendingRow),
    todos: todoRows.map(mapTodoRow),
  }
}

export async function createWeekPlanTodo(input: {
  title: string
  dayIndex: number
  weekStart: string
  estimatedHours?: number
  hour?: number
  status?: TodoStatus
  startedAtMs?: number
}): Promise<WeekPlanTodo> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const id = `todo-${Date.now()}-${nanoid(8)}`
  const estimatedHours = Math.max(1, Math.round(input.estimatedHours ?? 1))
  const hour = Math.max(1, Math.round(input.hour ?? 1))
  const status = input.status ?? 'pending'

  await db
    .insertInto('week_plan_todos')
    .values({
      id,
      title: input.title.trim(),
      content: '',
      status,
      estimatedHours,
      hour,
      dayIndex: input.dayIndex,
      weekStart: input.weekStart,
      startedAt: toIsoOrNull(input.startedAtMs),
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .execute()

  const row = await db
    .selectFrom('week_plan_todos')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirstOrThrow()

  return mapTodoRow(row)
}

export async function addTodoFromPendingActivity(input: {
  id: string
  title: string
  day: number
  hour: number
  dayIndex: number
  weekStart: string
}): Promise<{ todo: WeekPlanTodo; pending: WeekPlanPendingActivity[] }> {
  const db = await getDatabase()
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  const existing = await db
    .selectFrom('week_plan_todos')
    .selectAll()
    .where('id', '=', input.id)
    .executeTakeFirst()

  await db
    .updateTable('week_plan_todos')
    .set({ status: 'pending', startedAt: null, updatedAt: nowIso })
    .where('weekStart', '=', input.weekStart)
    .where('status', '=', 'active')
    .execute()

  if (existing) {
    await db
      .updateTable('week_plan_todos')
      .set({
        title: input.title,
        status: 'active',
        estimatedHours: Math.max(1, Math.round(input.day)),
        hour: Math.max(1, Math.round(input.hour)),
        dayIndex: input.dayIndex,
        weekStart: input.weekStart,
        startedAt: nowIso,
        completedAt: null,
        updatedAt: nowIso,
      })
      .where('id', '=', input.id)
      .execute()
  } else {
    await db
      .insertInto('week_plan_todos')
      .values({
        id: input.id,
        title: input.title.trim(),
        content: '',
        status: 'active',
        estimatedHours: Math.max(1, Math.round(input.day)),
        hour: Math.max(1, Math.round(input.hour)),
        dayIndex: input.dayIndex,
        weekStart: input.weekStart,
        startedAt: nowIso,
        completedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .execute()
  }

  await db.deleteFrom('week_plan_pending').where('id', '=', input.id).execute()

  const todoRow = await db
    .selectFrom('week_plan_todos')
    .selectAll()
    .where('id', '=', input.id)
    .executeTakeFirstOrThrow()

  const pendingRows = await db
    .selectFrom('week_plan_pending')
    .selectAll()
    .orderBy('sortOrder', 'asc')
    .orderBy('createdAt', 'asc')
    .execute()

  return {
    todo: mapTodoRow(todoRow),
    pending: pendingRows.map(mapPendingRow),
  }
}

export async function moveTodoToPending(
  id: string
): Promise<{ pending: WeekPlanPendingActivity[]; todos: WeekPlanTodo[] }> {
  const db = await getDatabase()
  const now = new Date().toISOString()

  const todo = await db
    .selectFrom('week_plan_todos')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!todo) {
    throw new Error(`Todo not found: ${id}`)
  }

  const pendingExists = await db
    .selectFrom('week_plan_pending')
    .select('id')
    .where('id', '=', id)
    .executeTakeFirst()

  if (!pendingExists) {
    const maxSort = await db
      .selectFrom('week_plan_pending')
      .select((eb) => eb.fn.max('sortOrder').as('maxSort'))
      .executeTakeFirst()
    const sortOrder = (maxSort?.maxSort ?? -1) + 1

    await db
      .insertInto('week_plan_pending')
      .values({
        id: todo.id,
        title: todo.title,
        estimatedHours: todo.estimatedHours,
        hour: todo.hour,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .execute()
  }

  await db.deleteFrom('week_plan_todos').where('id', '=', id).execute()

  const pendingRows = await db
    .selectFrom('week_plan_pending')
    .selectAll()
    .orderBy('sortOrder', 'asc')
    .orderBy('createdAt', 'asc')
    .execute()

  const remainingTodos = await db
    .selectFrom('week_plan_todos')
    .selectAll()
    .where('weekStart', '=', todo.weekStart)
    .orderBy('createdAt', 'desc')
    .execute()

  return {
    pending: pendingRows.map(mapPendingRow),
    todos: remainingTodos.map(mapTodoRow),
  }
}

export async function startWeekPlanTodo(
  id: string,
  weekStart: string
): Promise<WeekPlanTodo> {
  const db = await getDatabase()
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  await db
    .updateTable('week_plan_todos')
    .set({ status: 'pending', startedAt: null, updatedAt: nowIso })
    .where('weekStart', '=', weekStart)
    .where('status', '=', 'active')
    .execute()

  await db
    .updateTable('week_plan_todos')
    .set({
      status: 'active',
      startedAt: nowIso,
      completedAt: null,
      updatedAt: nowIso,
    })
    .where('id', '=', id)
    .execute()

  const row = await db
    .selectFrom('week_plan_todos')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!row) throw new Error(`Todo not found: ${id}`)
  return mapTodoRow(row)
}

export async function completeWeekPlanTodo(id: string): Promise<WeekPlanTodo> {
  const db = await getDatabase()
  const nowIso = new Date().toISOString()

  await db
    .updateTable('week_plan_todos')
    .set({
      status: 'done',
      completedAt: nowIso,
      updatedAt: nowIso,
    })
    .where('id', '=', id)
    .execute()

  const row = await db
    .selectFrom('week_plan_todos')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!row) throw new Error(`Todo not found: ${id}`)
  return mapTodoRow(row)
}

export async function deleteWeekPlanTodo(id: string): Promise<void> {
  const db = await getDatabase()
  const result = await db
    .deleteFrom('week_plan_todos')
    .where('id', '=', id)
    .executeTakeFirst()
  if (Number(result.numDeletedRows) === 0) {
    throw new Error(`Todo not found: ${id}`)
  }
}

export async function createPendingActivity(input: {
  title: string
  estimatedHours?: number
  hour?: number
}): Promise<WeekPlanPendingActivity> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const id = `pending-${Date.now()}-${nanoid(8)}`
  const estimatedHours = Math.max(1, Math.round(input.estimatedHours ?? 1))
  const hour = Math.max(1, Math.round(input.hour ?? 1))

  const maxSort = await db
    .selectFrom('week_plan_pending')
    .select((eb) => eb.fn.max('sortOrder').as('maxSort'))
    .executeTakeFirst()
  const sortOrder = (maxSort?.maxSort ?? -1) + 1

  await db
    .insertInto('week_plan_pending')
    .values({
      id,
      title: input.title.trim(),
      estimatedHours,
      hour,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .execute()

  const row = await db
    .selectFrom('week_plan_pending')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirstOrThrow()

  return mapPendingRow(row)
}

export async function updatePendingActivity(
  id: string,
  input: { title?: string; estimatedHours?: number; hour?: number }
): Promise<WeekPlanPendingActivity> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updatedAt: now }

  if (input.title != null) updates.title = input.title.trim()
  if (input.estimatedHours != null) {
    updates.estimatedHours = Math.max(1, Math.round(input.estimatedHours))
  }
  if (input.hour != null) updates.hour = Math.max(1, Math.round(input.hour))

  await db
    .updateTable('week_plan_pending')
    .set(updates)
    .where('id', '=', id)
    .execute()

  const row = await db
    .selectFrom('week_plan_pending')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!row) throw new Error(`Pending activity not found: ${id}`)
  return mapPendingRow(row)
}

export async function deletePendingActivity(id: string): Promise<void> {
  const db = await getDatabase()
  const result = await db
    .deleteFrom('week_plan_pending')
    .where('id', '=', id)
    .executeTakeFirst()
  if (Number(result.numDeletedRows) === 0) {
    throw new Error(`Pending activity not found: ${id}`)
  }
}

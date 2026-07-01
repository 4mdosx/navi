import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import { createPendingActivity } from '@/backstage/week-plan/week-plan.service'
import type {
  TrackerCadence,
  TrackerItem,
  TrackerKind,
  TrackerStatus,
} from '@/types/tracker'

const VALID_KINDS = new Set<TrackerKind>([
  'experiment',
  'inspiration',
  'long_task',
  'reminder',
])
const VALID_STATUSES = new Set<TrackerStatus>(['active', 'paused', 'done'])
const VALID_CADENCES = new Set<string>(['weekly', 'monthly'])

function mapRow(row: {
  id: string
  title: string
  kind: string
  status: string
  cadence: string | null
  lastTouchedAt: string | null
  notes: string
  createdAt: string
  updatedAt: string
}): TrackerItem {
  const kind = VALID_KINDS.has(row.kind as TrackerKind)
    ? (row.kind as TrackerKind)
    : 'long_task'
  const status = VALID_STATUSES.has(row.status as TrackerStatus)
    ? (row.status as TrackerStatus)
    : 'active'
  const cadence =
    row.cadence && VALID_CADENCES.has(row.cadence)
      ? (row.cadence as TrackerCadence)
      : null
  return {
    id: row.id,
    title: row.title,
    kind,
    status,
    cadence,
    lastTouchedAt: row.lastTouchedAt,
    notes: row.notes ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function isDueForCadence(item: TrackerItem, now: Date): boolean {
  if (item.status !== 'active' || !item.cadence) return false
  if (!item.lastTouchedAt) return true
  const last = new Date(item.lastTouchedAt)
  const daysSince = Math.floor((now.getTime() - last.getTime()) / 86400000)
  if (item.cadence === 'weekly') return daysSince >= 7
  if (item.cadence === 'monthly') return daysSince >= 30
  return false
}

export async function listTrackerItems(): Promise<TrackerItem[]> {
  const db = await getDatabase()
  const rows = await db
    .selectFrom('tracker_items')
    .selectAll()
    .orderBy('updatedAt', 'desc')
    .execute()
  return rows.map(mapRow)
}

export async function listDueTrackerItems(): Promise<TrackerItem[]> {
  const items = await listTrackerItems()
  const now = new Date()
  return items.filter((item) => isDueForCadence(item, now))
}

export async function createTrackerItem(input: {
  title: string
  kind?: TrackerKind
  cadence?: TrackerCadence
  notes?: string
}): Promise<TrackerItem> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const id = `tracker-${Date.now()}-${nanoid(8)}`
  const kind =
    input.kind && VALID_KINDS.has(input.kind) ? input.kind : 'long_task'

  await db
    .insertInto('tracker_items')
    .values({
      id,
      title: input.title.trim(),
      kind,
      status: 'active',
      cadence: input.cadence ?? null,
      lastTouchedAt: null,
      notes: input.notes?.trim() ?? '',
      createdAt: now,
      updatedAt: now,
    })
    .execute()

  const row = await db
    .selectFrom('tracker_items')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirstOrThrow()

  return mapRow(row)
}

export async function updateTrackerItem(
  id: string,
  input: {
    title?: string
    kind?: TrackerKind
    status?: TrackerStatus
    cadence?: TrackerCadence
    notes?: string
    touch?: boolean
  }
): Promise<TrackerItem> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updatedAt: now }

  if (input.title != null) updates.title = input.title.trim()
  if (input.kind != null && VALID_KINDS.has(input.kind)) updates.kind = input.kind
  if (input.status != null && VALID_STATUSES.has(input.status)) {
    updates.status = input.status
  }
  if (input.cadence !== undefined) updates.cadence = input.cadence
  if (input.notes != null) updates.notes = input.notes.trim()
  if (input.touch) updates.lastTouchedAt = now

  await db.updateTable('tracker_items').set(updates).where('id', '=', id).execute()

  const row = await db
    .selectFrom('tracker_items')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!row) throw new Error(`Tracker item not found: ${id}`)
  return mapRow(row)
}

export async function deleteTrackerItem(id: string): Promise<void> {
  const db = await getDatabase()
  const result = await db
    .deleteFrom('tracker_items')
    .where('id', '=', id)
    .executeTakeFirst()
  if (Number(result.numDeletedRows) === 0) {
    throw new Error(`Tracker item not found: ${id}`)
  }
}

export async function addTrackerToWeekPending(id: string): Promise<{
  tracker: TrackerItem
  pendingId: string
}> {
  const db = await getDatabase()
  const row = await db
    .selectFrom('tracker_items')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!row) throw new Error(`Tracker item not found: ${id}`)

  const pending = await createPendingActivity({
    title: row.title,
    estimatedHours: 1,
    hour: 1,
  })

  const now = new Date().toISOString()
  await db
    .updateTable('tracker_items')
    .set({ lastTouchedAt: now, updatedAt: now })
    .where('id', '=', id)
    .execute()

  const updated = await db
    .selectFrom('tracker_items')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirstOrThrow()

  return { tracker: mapRow(updated), pendingId: pending.id }
}

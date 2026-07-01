import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import type { InboxItem, InboxItemStatus, InboxSource } from '@/types/inbox'

const VALID_SOURCES = new Set<InboxSource>(['manual', 'bookmark', 'obsidian', 'other'])
const VALID_STATUSES = new Set<InboxItemStatus>(['inbox', 'archived', 'processed'])

function mapRow(row: {
  id: string
  title: string
  url: string | null
  source: string
  status: string
  tags: string
  notes: string
  createdAt: string
  updatedAt: string
}): InboxItem {
  let tags: string[] = []
  try {
    const parsed = JSON.parse(row.tags)
    tags = Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    tags = []
  }
  const source = VALID_SOURCES.has(row.source as InboxSource)
    ? (row.source as InboxSource)
    : 'manual'
  const status = VALID_STATUSES.has(row.status as InboxItemStatus)
    ? (row.status as InboxItemStatus)
    : 'inbox'
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source,
    status,
    tags,
    notes: row.notes ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listInboxItems(status?: InboxItemStatus): Promise<InboxItem[]> {
  const db = await getDatabase()
  let query = db.selectFrom('inbox_items').selectAll()
  if (status) {
    query = query.where('status', '=', status)
  }
  const rows = await query.orderBy('createdAt', 'desc').execute()
  return rows.map(mapRow)
}

export async function createInboxItem(input: {
  title: string
  url?: string | null
  source?: InboxSource
  notes?: string
  tags?: string[]
}): Promise<InboxItem> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const id = `inbox-${Date.now()}-${nanoid(8)}`
  const source =
    input.source && VALID_SOURCES.has(input.source) ? input.source : 'manual'

  await db
    .insertInto('inbox_items')
    .values({
      id,
      title: input.title.trim(),
      url: input.url?.trim() || null,
      source,
      status: 'inbox',
      tags: JSON.stringify(input.tags ?? []),
      notes: input.notes?.trim() ?? '',
      createdAt: now,
      updatedAt: now,
    })
    .execute()

  const row = await db
    .selectFrom('inbox_items')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirstOrThrow()

  return mapRow(row)
}

export async function updateInboxItem(
  id: string,
  input: {
    title?: string
    url?: string | null
    status?: InboxItemStatus
    notes?: string
    tags?: string[]
  }
): Promise<InboxItem> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { updatedAt: now }

  if (input.title != null) updates.title = input.title.trim()
  if (input.url !== undefined) updates.url = input.url?.trim() || null
  if (input.status != null && VALID_STATUSES.has(input.status)) {
    updates.status = input.status
  }
  if (input.notes != null) updates.notes = input.notes.trim()
  if (input.tags != null) updates.tags = JSON.stringify(input.tags)

  await db.updateTable('inbox_items').set(updates).where('id', '=', id).execute()

  const row = await db
    .selectFrom('inbox_items')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  if (!row) throw new Error(`Inbox item not found: ${id}`)
  return mapRow(row)
}

export async function deleteInboxItem(id: string): Promise<void> {
  const db = await getDatabase()
  const result = await db
    .deleteFrom('inbox_items')
    .where('id', '=', id)
    .executeTakeFirst()
  if (Number(result.numDeletedRows) === 0) {
    throw new Error(`Inbox item not found: ${id}`)
  }
}

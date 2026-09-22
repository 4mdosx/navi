import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import {
  INCLUDE_ALL,
  type CreateFocusModeInput,
  type FocusMode,
  type UpdateFocusModeInput,
} from '@/types/tag'

function parseIdArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    const trimmed = id.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }
  return result
}

function normalizeInclude(ids: string[] | undefined, fallback: string[] = [INCLUDE_ALL]): string[] {
  if (ids == null) return fallback
  const unique = uniqueIds(ids)
  if (unique.includes(INCLUDE_ALL)) return [INCLUDE_ALL]
  return unique
}

function normalizeExclude(ids: string[] | undefined, fallback: string[] = []): string[] {
  if (ids == null) return fallback
  return uniqueIds(ids).filter((id) => id !== INCLUDE_ALL)
}

async function assertTagIds(ids: string[]): Promise<void> {
  const tagIds = ids.filter((id) => id !== INCLUDE_ALL)
  if (tagIds.length === 0) return
  const db = await getDatabase()
  const rows = await db.selectFrom('tags').select('id').where('id', 'in', tagIds).execute()
  if (rows.length !== tagIds.length) throw new Error('标签不存在')
}

function mapFocusMode(row: {
  id: string
  name: string
  includeTags: string
  excludeTags: string
  createdAt: string
  updatedAt: string
}): FocusMode {
  return {
    id: row.id,
    name: row.name,
    includeTags: normalizeInclude(parseIdArray(row.includeTags)),
    excludeTags: normalizeExclude(parseIdArray(row.excludeTags)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function normalizeName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('情景名称不能为空')
  if (trimmed.length > 40) throw new Error('情景名称过长')
  return trimmed
}

export async function listFocusModes(): Promise<FocusMode[]> {
  const db = await getDatabase()
  const rows = await db.selectFrom('focus_modes').selectAll().orderBy('createdAt').execute()
  return rows.map(mapFocusMode)
}

export async function getFocusMode(id: string): Promise<FocusMode> {
  const db = await getDatabase()
  const row = await db.selectFrom('focus_modes').selectAll().where('id', '=', id).executeTakeFirst()
  if (!row) throw new Error('情景模式不存在')
  return mapFocusMode(row)
}

export async function createFocusMode(input: CreateFocusModeInput): Promise<FocusMode> {
  const name = normalizeName(input.name)
  const includeTags = normalizeInclude(input.includeTags)
  const excludeTags = normalizeExclude(input.excludeTags)
  await assertTagIds([...includeTags, ...excludeTags])
  const db = await getDatabase()
  const now = new Date().toISOString()
  const row = {
    id: `focus-${Date.now()}-${nanoid(6)}`,
    name,
    includeTags: JSON.stringify(includeTags),
    excludeTags: JSON.stringify(excludeTags),
    createdAt: now,
    updatedAt: now,
  }
  await db.insertInto('focus_modes').values(row).execute()
  return mapFocusMode(row)
}

export async function updateFocusMode(id: string, input: UpdateFocusModeInput): Promise<FocusMode> {
  const current = await getFocusMode(id)
  const name = input.name != null ? normalizeName(input.name) : current.name
  const includeTags = normalizeInclude(input.includeTags, current.includeTags)
  const excludeTags = normalizeExclude(input.excludeTags, current.excludeTags)
  await assertTagIds([...includeTags, ...excludeTags])
  const db = await getDatabase()
  const now = new Date().toISOString()
  await db.updateTable('focus_modes').set({
    name,
    includeTags: JSON.stringify(includeTags),
    excludeTags: JSON.stringify(excludeTags),
    updatedAt: now,
  }).where('id', '=', id).execute()
  return getFocusMode(id)
}

export async function deleteFocusMode(id: string): Promise<void> {
  await getFocusMode(id)
  const db = await getDatabase()
  await db.deleteFrom('focus_modes').where('id', '=', id).execute()
}

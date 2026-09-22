import 'server-only'
import { nanoid } from 'nanoid'
import { getDatabase } from '@/backstage/db/database'
import { INCLUDE_ALL, normalizeTagName, type Tag } from '@/types/tag'

function mapTag(row: Tag): Tag {
  return row
}

function isUniqueError(error: unknown) {
  return error instanceof Error && /UNIQUE constraint failed: tags\.name/i.test(error.message)
}

export async function listTags(): Promise<Tag[]> {
  const db = await getDatabase()
  const rows = await db.selectFrom('tags').selectAll().orderBy('name').execute()
  return rows.map(mapTag)
}

export async function getTag(id: string): Promise<Tag> {
  const db = await getDatabase()
  const row = await db.selectFrom('tags').selectAll().where('id', '=', id).executeTakeFirst()
  if (!row) throw new Error('标签不存在')
  return mapTag(row)
}

export async function findTagByName(name: string): Promise<Tag | null> {
  const normalized = normalizeTagName(name)
  const tags = await listTags()
  return tags.find((tag) => tag.name.toLowerCase() === normalized.toLowerCase()) ?? null
}

export async function createTag(name: string): Promise<Tag> {
  const normalized = normalizeTagName(name)
  const existing = await findTagByName(normalized)
  if (existing) throw new Error('标签已存在')
  const db = await getDatabase()
  const now = new Date().toISOString()
  const row: Tag = {
    id: `tag-${Date.now()}-${nanoid(6)}`,
    name: normalized,
    createdAt: now,
    updatedAt: now,
  }
  try {
    await db.insertInto('tags').values(row).execute()
  } catch (error) {
    if (isUniqueError(error)) throw new Error('标签已存在')
    throw error
  }
  return row
}

export async function findOrCreateTag(name: string): Promise<Tag> {
  const existing = await findTagByName(name)
  if (existing) return existing
  try {
    return await createTag(name)
  } catch (error) {
    if (error instanceof Error && error.message === '标签已存在') {
      const again = await findTagByName(name)
      if (again) return again
    }
    throw error
  }
}

export async function updateTag(id: string, name: string): Promise<Tag> {
  await getTag(id)
  const normalized = normalizeTagName(name)
  const conflict = await findTagByName(normalized)
  if (conflict && conflict.id !== id) throw new Error('标签已存在')
  const db = await getDatabase()
  const now = new Date().toISOString()
  try {
    await db.updateTable('tags').set({ name: normalized, updatedAt: now }).where('id', '=', id).execute()
  } catch (error) {
    if (isUniqueError(error)) throw new Error('标签已存在')
    throw error
  }
  return getTag(id)
}

function parseIdArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export async function deleteTag(id: string): Promise<void> {
  await getTag(id)
  const db = await getDatabase()
  const modes = await db.selectFrom('focus_modes').selectAll().execute()
  for (const mode of modes) {
    const includeTags = parseIdArray(mode.includeTags).filter((item) => item !== id)
    const excludeTags = parseIdArray(mode.excludeTags).filter((item) => item !== id)
    if (
      includeTags.length === parseIdArray(mode.includeTags).length
      && excludeTags.length === parseIdArray(mode.excludeTags).length
    ) continue
    await db.updateTable('focus_modes').set({
      includeTags: JSON.stringify(includeTags.length > 0 ? includeTags : [INCLUDE_ALL]),
      excludeTags: JSON.stringify(excludeTags),
      updatedAt: new Date().toISOString(),
    }).where('id', '=', mode.id).execute()
  }
  await db.deleteFrom('tags').where('id', '=', id).execute()
}

export async function tagsForTodos(ids: string[]): Promise<Map<string, Tag[]>> {
  const grouped = new Map<string, Tag[]>()
  if (ids.length === 0) return grouped
  const db = await getDatabase()
  const rows = await db.selectFrom('todo_tags')
    .innerJoin('tags', 'tags.id', 'todo_tags.tagId')
    .select([
      'todo_tags.todoId as todoId',
      'tags.id as id',
      'tags.name as name',
      'tags.createdAt as createdAt',
      'tags.updatedAt as updatedAt',
    ])
    .where('todo_tags.todoId', 'in', ids)
    .orderBy('tags.name')
    .execute()
  for (const row of rows) {
    const list = grouped.get(row.todoId) ?? []
    list.push({ id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt })
    grouped.set(row.todoId, list)
  }
  return grouped
}

async function requireTodo(todoId: string) {
  const db = await getDatabase()
  const todo = await db.selectFrom('todos').select('id').where('id', '=', todoId).executeTakeFirst()
  if (!todo) throw new Error(`Todo not found: ${todoId}`)
}

export async function setTodoTags(todoId: string, tagIds: string[]): Promise<void> {
  await requireTodo(todoId)
  const unique = [...new Set(tagIds.filter((id) => id.trim()))]
  const db = await getDatabase()
  if (unique.length > 0) {
    const tags = await db.selectFrom('tags').select('id').where('id', 'in', unique).execute()
    if (tags.length !== unique.length) throw new Error('标签不存在')
  }
  const now = new Date().toISOString()
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('todo_tags').where('todoId', '=', todoId).execute()
    for (const tagId of unique) {
      await trx.insertInto('todo_tags').values({ todoId, tagId, createdAt: now }).execute()
    }
  })
}

export async function attachTodoTagByName(todoId: string, name: string): Promise<void> {
  const tag = await findOrCreateTag(name)
  const current = (await tagsForTodos([todoId])).get(todoId) ?? []
  if (current.some((item) => item.id === tag.id)) return
  await setTodoTags(todoId, [...current.map((item) => item.id), tag.id])
}

export async function detachTodoTag(todoId: string, tagId: string): Promise<void> {
  const current = (await tagsForTodos([todoId])).get(todoId) ?? []
  await setTodoTags(todoId, current.filter((tag) => tag.id !== tagId).map((tag) => tag.id))
}

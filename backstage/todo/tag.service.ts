import 'server-only'
import { nanoid } from 'nanoid'
import { asc, eq, inArray } from 'drizzle-orm'
import { getDatabase } from '@/backstage/db/database'
import { focusModes, tags, todoTags, todos } from '@/backstage/db/schema'
import { INCLUDE_ALL, normalizeTagName, type Tag } from '@/types/tag'

function mapTag(row: Tag): Tag {
  return row
}

function isUniqueError(error: unknown) {
  return error instanceof Error && /UNIQUE constraint failed: tags\.name/i.test(error.message)
}

export async function listTags(): Promise<Tag[]> {
  const db = await getDatabase()
  const rows = await db.select().from(tags).orderBy(asc(tags.name))
  return rows.map(mapTag)
}

export async function getTag(id: string): Promise<Tag> {
  const db = await getDatabase()
  const [row] = await db.select().from(tags).where(eq(tags.id, id)).limit(1)
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
    await db.insert(tags).values(row)
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
    await db.update(tags).set({ name: normalized, updatedAt: now }).where(eq(tags.id, id))
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
  const modes = await db.select().from(focusModes)
  for (const mode of modes) {
    const includeTags = parseIdArray(mode.includeTags).filter((item) => item !== id)
    const excludeTags = parseIdArray(mode.excludeTags).filter((item) => item !== id)
    if (
      includeTags.length === parseIdArray(mode.includeTags).length
      && excludeTags.length === parseIdArray(mode.excludeTags).length
    ) continue
    await db.update(focusModes).set({
      includeTags: JSON.stringify(includeTags.length > 0 ? includeTags : [INCLUDE_ALL]),
      excludeTags: JSON.stringify(excludeTags),
      updatedAt: new Date().toISOString(),
    }).where(eq(focusModes.id, mode.id))
  }
  await db.delete(tags).where(eq(tags.id, id))
}

export async function tagsForTodos(ids: string[]): Promise<Map<string, Tag[]>> {
  const grouped = new Map<string, Tag[]>()
  if (ids.length === 0) return grouped
  const db = await getDatabase()
  const rows = await db.select({
    todoId: todoTags.todoId,
    id: tags.id,
    name: tags.name,
    createdAt: tags.createdAt,
    updatedAt: tags.updatedAt,
  }).from(todoTags)
    .innerJoin(tags, eq(tags.id, todoTags.tagId))
    .where(inArray(todoTags.todoId, ids))
    .orderBy(asc(tags.name))
  for (const row of rows) {
    const list = grouped.get(row.todoId) ?? []
    list.push({ id: row.id, name: row.name, createdAt: row.createdAt, updatedAt: row.updatedAt })
    grouped.set(row.todoId, list)
  }
  return grouped
}

async function requireTodo(todoId: string) {
  const db = await getDatabase()
  const [todo] = await db.select({ id: todos.id }).from(todos).where(eq(todos.id, todoId)).limit(1)
  if (!todo) throw new Error(`Todo not found: ${todoId}`)
}

export async function setTodoTags(todoId: string, tagIds: string[]): Promise<void> {
  await requireTodo(todoId)
  const unique = [...new Set(tagIds.filter((id) => id.trim()))]
  const db = await getDatabase()
  if (unique.length > 0) {
    const found = await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, unique))
    if (found.length !== unique.length) throw new Error('标签不存在')
  }
  const now = new Date().toISOString()
  db.transaction((trx) => {
    trx.delete(todoTags).where(eq(todoTags.todoId, todoId)).run()
    for (const tagId of unique) {
      trx.insert(todoTags).values({ todoId, tagId, createdAt: now }).run()
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

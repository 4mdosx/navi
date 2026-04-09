'use server'
import 'server-only'
import { nanoid } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '@/backstage/db/database'
import type { Project, WeekItem, WeekCommentRecord } from '@/types/projects'

function parseComment(commentStr: string): WeekCommentRecord[] {
  if (!commentStr || commentStr === '[]') return []
  try {
    const parsed = JSON.parse(commentStr)
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    return arr.map((item: any) => ({
      content: String(item?.content ?? ''),
      updateAt: String(item?.updateAt ?? new Date().toISOString()),
      goal: typeof item?.goal === 'number' && !Number.isNaN(item.goal) ? item.goal : 0,
    }))
  } catch {
    return []
  }
}

function buildProject(
  row: { id: string; title: string; goal: number; createdAt: string; updatedAt: string },
  todoRows: Array<{ id: string; content: string; comment: string }>
): Project {
  const week: WeekItem[] = todoRows.map((r) => ({
    id: r.id,
    content: r.content ?? '',
    comment: parseComment(r.comment),
  }))
  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    week,
  }
}

export async function readProjectsFromFiles(): Promise<Project[]> {
  const db = await getDatabase()

  const rows = await db
    .selectFrom('projects')
    .selectAll()
    .orderBy('createdAt', 'desc')
    .execute()

  const projects: Project[] = []

  for (const t of rows) {
    const todoRows = await db
      .selectFrom('project_todos')
      .selectAll()
      .where('projectId', '=', t.id)
      .orderBy('weekItemIndex', 'asc')
      .execute()

    projects.push(
      buildProject(
        {
          id: t.id,
          title: t.title,
          goal: t.goal,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        },
        todoRows
      )
    )
  }

  return projects
}

export interface CreateProjectOptions {
  goal?: number
  initialWeeks?: Array<{ content: string }>
}

export async function createProjectFile(
  title: string,
  options?: CreateProjectOptions
): Promise<string> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const projectId = `project-${Date.now()}-${nanoid(8)}`
  const goal = options?.goal ?? 0

  await db
    .insertInto('projects')
    .values({
      id: projectId,
      title,
      progress: 0,
      goal,
      createdAt: now,
      updatedAt: now,
    })
    .execute()

  const initialWeeks = options?.initialWeeks ?? []
  for (let i = 0; i < initialWeeks.length; i++) {
    const row = initialWeeks[i]
    await db
      .insertInto('project_todos')
      .values({
        projectId,
        weekItemIndex: i,
        id: uuidv4(),
        content: row.content ?? '',
        comment: '[]',
      })
      .execute()
  }

  return projectId
}

export async function updateProject(
  projectId: string,
  data: { title?: string; goal?: number }
): Promise<Project> {
  const db = await getDatabase()
  const projectRow = await db
    .selectFrom('projects')
    .selectAll()
    .where('id', '=', projectId)
    .executeTakeFirst()

  if (!projectRow) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const now = new Date().toISOString()
  const updates: { title?: string; goal?: number; updatedAt: string } = {
    updatedAt: now,
  }
  if (data.title !== undefined) updates.title = data.title
  if (data.goal !== undefined) updates.goal = data.goal

  await db
    .updateTable('projects')
    .set(updates)
    .where('id', '=', projectId)
    .execute()

  const updated = await db
    .selectFrom('projects')
    .selectAll()
    .where('id', '=', projectId)
    .executeTakeFirst()
  if (!updated) throw new Error(`Project not found: ${projectId}`)

  const todoRows = await db
    .selectFrom('project_todos')
    .selectAll()
    .where('projectId', '=', projectId)
    .orderBy('weekItemIndex', 'asc')
    .execute()

  return buildProject(
    {
      id: updated.id,
      title: updated.title,
      goal: updated.goal,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
    todoRows
  )
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getDatabase()
  const row = await db
    .selectFrom('projects')
    .select('id')
    .where('id', '=', projectId)
    .executeTakeFirst()
  if (!row) {
    throw new Error(`Project not found: ${projectId}`)
  }
  await db.deleteFrom('project_todos').where('projectId', '=', projectId).execute()
  await db.deleteFrom('projects').where('id', '=', projectId).execute()
}

export async function updateWeekItemCompleted(
  projectId: string,
  _weekItemIndex: number,
  _completed: boolean
): Promise<Project> {
  const db = await getDatabase()

  const projectRow = await db
    .selectFrom('projects')
    .selectAll()
    .where('id', '=', projectId)
    .executeTakeFirst()

  if (!projectRow) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const todoRows = await db
    .selectFrom('project_todos')
    .selectAll()
    .where('projectId', '=', projectId)
    .orderBy('weekItemIndex', 'asc')
    .execute()

  return buildProject(
    {
      id: projectRow.id,
      title: projectRow.title,
      goal: projectRow.goal,
      createdAt: projectRow.createdAt,
      updatedAt: projectRow.updatedAt,
    },
    todoRows
  )
}

export async function addWeekCommentRecord(
  projectId: string,
  weekItemIndex: number,
  recordContent: string,
  goal: number = 0
): Promise<Project> {
  const db = await getDatabase()

  const todoRow = await db
    .selectFrom('project_todos')
    .selectAll()
    .where('projectId', '=', projectId)
    .where('weekItemIndex', '=', weekItemIndex)
    .executeTakeFirst()

  if (!todoRow) {
    throw new Error(`Week item index out of range: ${weekItemIndex}`)
  }

  const commentArray = parseComment(todoRow.comment)
  commentArray.push({
    content: recordContent,
    updateAt: new Date().toISOString(),
    goal: Number(goal) || 0,
  })
  const newComment = JSON.stringify(commentArray)

  await db
    .updateTable('project_todos')
    .set({ comment: newComment })
    .where('projectId', '=', projectId)
    .where('weekItemIndex', '=', weekItemIndex)
    .execute()

  const now = new Date().toISOString()
  await db
    .updateTable('projects')
    .set({ updatedAt: now })
    .where('id', '=', projectId)
    .execute()

  const row = await db
    .selectFrom('projects')
    .selectAll()
    .where('id', '=', projectId)
    .executeTakeFirst()
  if (!row) throw new Error(`Project not found: ${projectId}`)

  const todoRows = await db
    .selectFrom('project_todos')
    .selectAll()
    .where('projectId', '=', projectId)
    .orderBy('weekItemIndex', 'asc')
    .execute()

  return buildProject(
    {
      id: row.id,
      title: row.title,
      goal: row.goal,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    todoRows
  )
}

export async function deleteWeekCommentRecord(
  projectId: string,
  weekItemIndex: number,
  recordIndex: number
): Promise<Project> {
  const db = await getDatabase()

  const todoRow = await db
    .selectFrom('project_todos')
    .selectAll()
    .where('projectId', '=', projectId)
    .where('weekItemIndex', '=', weekItemIndex)
    .executeTakeFirst()

  if (!todoRow) {
    throw new Error(`Week item index out of range: ${weekItemIndex}`)
  }

  const commentArray = parseComment(todoRow.comment)
  if (recordIndex < 0 || recordIndex >= commentArray.length) {
    throw new Error(`Record index out of range: ${recordIndex}`)
  }
  commentArray.splice(recordIndex, 1)
  const newComment = commentArray.length > 0 ? JSON.stringify(commentArray) : '[]'

  await db
    .updateTable('project_todos')
    .set({ comment: newComment })
    .where('projectId', '=', projectId)
    .where('weekItemIndex', '=', weekItemIndex)
    .execute()

  const now = new Date().toISOString()
  await db
    .updateTable('projects')
    .set({ updatedAt: now })
    .where('id', '=', projectId)
    .execute()

  const row = await db
    .selectFrom('projects')
    .selectAll()
    .where('id', '=', projectId)
    .executeTakeFirst()
  if (!row) throw new Error(`Project not found: ${projectId}`)

  const todoRows = await db
    .selectFrom('project_todos')
    .selectAll()
    .where('projectId', '=', projectId)
    .orderBy('weekItemIndex', 'asc')
    .execute()

  return buildProject(
    {
      id: row.id,
      title: row.title,
      goal: row.goal,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    todoRows
  )
}

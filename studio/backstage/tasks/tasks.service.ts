'use server'
import 'server-only'
import { nanoid } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '@/backstage/db/database'
import type { Task, WeekItem, WeekCommentRecord } from '@/types/tasks'

/**
 * 解析 comment JSON，保证每项含 content, updateAt, goal
 */
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

/**
 * 从 DB 行组装为 Task 类型（week 每项：id, content, comment[]）
 */
function buildTask(
  taskRow: { id: string; title: string; goal: number; createdAt: string; updatedAt: string },
  todoRows: Array<{ id: string; content: string; comment: string }>
): Task {
  const week: WeekItem[] = todoRows.map((row) => ({
    id: row.id,
    content: row.content ?? '',
    comment: parseComment(row.comment),
  }))
  return {
    id: taskRow.id,
    title: taskRow.title,
    goal: taskRow.goal,
    createdAt: taskRow.createdAt,
    updatedAt: taskRow.updatedAt,
    week,
  }
}

/**
 * 读取所有任务（从 SQLite）
 */
export async function readTasksFromFiles(): Promise<Task[]> {
  const db = await getDatabase()

  const taskRows = await db
    .selectFrom('tasks')
    .selectAll()
    .orderBy('createdAt', 'desc')
    .execute()

  const tasks: Task[] = []

  for (const t of taskRows) {
    const todoRows = await db
      .selectFrom('task_todos')
      .selectAll()
      .where('taskId', '=', t.id)
      .orderBy('todoIndex', 'asc')
      .execute()

    tasks.push(
      buildTask(
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

  return tasks
}

export interface CreateTaskOptions {
  goal?: number
  initialWeeks?: Array<{ content: string }>
}

/**
 * 创建任务（写入 SQLite）
 * @returns 任务 ID（兼容原 API 返回 filePath 的语义，调用方可用作标识）
 */
export async function createTaskFile(
  title: string,
  options?: CreateTaskOptions
): Promise<string> {
  const db = await getDatabase()
  const now = new Date().toISOString()
  const taskId = `task-${Date.now()}-${nanoid(8)}`
  const goal = options?.goal ?? 0

  await db
    .insertInto('tasks')
    .values({
      id: taskId,
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
      .insertInto('task_todos')
      .values({
        taskId,
        todoIndex: i,
        id: uuidv4(),
        content: row.content ?? '',
        comment: '[]',
      })
      .execute()
  }

  return taskId
}

/**
 * 更新任务基本信息（标题、每周目标分数）
 */
export async function updateTask(
  taskId: string,
  data: { title?: string; goal?: number }
): Promise<Task> {
  const db = await getDatabase()
  const taskRow = await db
    .selectFrom('tasks')
    .selectAll()
    .where('id', '=', taskId)
    .executeTakeFirst()

  if (!taskRow) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const now = new Date().toISOString()
  const updates: { title?: string; goal?: number; updatedAt: string } = {
    updatedAt: now,
  }
  if (data.title !== undefined) updates.title = data.title
  if (data.goal !== undefined) updates.goal = data.goal

  await db
    .updateTable('tasks')
    .set(updates)
    .where('id', '=', taskId)
    .execute()

  const updated = await db
    .selectFrom('tasks')
    .selectAll()
    .where('id', '=', taskId)
    .executeTakeFirst()
  if (!updated) throw new Error(`Task not found: ${taskId}`)

  const todoRows = await db
    .selectFrom('task_todos')
    .selectAll()
    .where('taskId', '=', taskId)
    .orderBy('todoIndex', 'asc')
    .execute()

  return buildTask(
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

/**
 * 删除任务（会级联删除 task_todos）
 */
export async function deleteTask(taskId: string): Promise<void> {
  const db = await getDatabase()
  const row = await db
    .selectFrom('tasks')
    .select('id')
    .where('id', '=', taskId)
    .executeTakeFirst()
  if (!row) {
    throw new Error(`Task not found: ${taskId}`)
  }
  await db.deleteFrom('task_todos').where('taskId', '=', taskId).execute()
  await db.deleteFrom('tasks').where('id', '=', taskId).execute()
}

/**
 * 新版格式无 completed 列，此接口仅重新读取并返回任务，不修改存储。
 */
export async function updateTodoCompleted(
  taskId: string,
  _todoIndex: number,
  _completed: boolean
): Promise<Task> {
  const db = await getDatabase()

  const taskRow = await db
    .selectFrom('tasks')
    .selectAll()
    .where('id', '=', taskId)
    .executeTakeFirst()

  if (!taskRow) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const todoRows = await db
    .selectFrom('task_todos')
    .selectAll()
    .where('taskId', '=', taskId)
    .orderBy('todoIndex', 'asc')
    .execute()

  return buildTask(
    {
      id: taskRow.id,
      title: taskRow.title,
      goal: taskRow.goal,
      createdAt: taskRow.createdAt,
      updatedAt: taskRow.updatedAt,
    },
    todoRows
  )
}

/**
 * 添加记录到任务的 week 项的 comment（每条可带 goal）
 */
export async function addTodoCommentRecord(
  taskId: string,
  todoIndex: number,
  recordContent: string,
  goal: number = 0
): Promise<Task> {
  const db = await getDatabase()

  const todoRow = await db
    .selectFrom('task_todos')
    .selectAll()
    .where('taskId', '=', taskId)
    .where('todoIndex', '=', todoIndex)
    .executeTakeFirst()

  if (!todoRow) {
    throw new Error(`Todo index out of range: ${todoIndex}`)
  }

  const commentArray = parseComment(todoRow.comment)
  commentArray.push({
    content: recordContent,
    updateAt: new Date().toISOString(),
    goal: Number(goal) || 0,
  })
  const newComment = JSON.stringify(commentArray)

  await db
    .updateTable('task_todos')
    .set({ comment: newComment })
    .where('taskId', '=', taskId)
    .where('todoIndex', '=', todoIndex)
    .execute()

  const now = new Date().toISOString()
  await db
    .updateTable('tasks')
    .set({ updatedAt: now })
    .where('id', '=', taskId)
    .execute()

  const taskRow = await db
    .selectFrom('tasks')
    .selectAll()
    .where('id', '=', taskId)
    .executeTakeFirst()
  if (!taskRow) throw new Error(`Task not found: ${taskId}`)

  const todoRows = await db
    .selectFrom('task_todos')
    .selectAll()
    .where('taskId', '=', taskId)
    .orderBy('todoIndex', 'asc')
    .execute()

  return buildTask(
    {
      id: taskRow.id,
      title: taskRow.title,
      goal: taskRow.goal,
      createdAt: taskRow.createdAt,
      updatedAt: taskRow.updatedAt,
    },
    todoRows
  )
}

/**
 * 删除任务的 todo 项的 comment 中的记录
 */
export async function deleteTodoCommentRecord(
  taskId: string,
  todoIndex: number,
  recordIndex: number
): Promise<Task> {
  const db = await getDatabase()

  const todoRow = await db
    .selectFrom('task_todos')
    .selectAll()
    .where('taskId', '=', taskId)
    .where('todoIndex', '=', todoIndex)
    .executeTakeFirst()

  if (!todoRow) {
    throw new Error(`Todo index out of range: ${todoIndex}`)
  }

  const commentArray = parseComment(todoRow.comment)
  if (recordIndex < 0 || recordIndex >= commentArray.length) {
    throw new Error(`Record index out of range: ${recordIndex}`)
  }
  commentArray.splice(recordIndex, 1)
  const newComment = commentArray.length > 0 ? JSON.stringify(commentArray) : '[]'

  await db
    .updateTable('task_todos')
    .set({ comment: newComment })
    .where('taskId', '=', taskId)
    .where('todoIndex', '=', todoIndex)
    .execute()

  const now = new Date().toISOString()
  await db
    .updateTable('tasks')
    .set({ updatedAt: now })
    .where('id', '=', taskId)
    .execute()

  const taskRow = await db
    .selectFrom('tasks')
    .selectAll()
    .where('id', '=', taskId)
    .executeTakeFirst()
  if (!taskRow) throw new Error(`Task not found: ${taskId}`)

  const todoRows = await db
    .selectFrom('task_todos')
    .selectAll()
    .where('taskId', '=', taskId)
    .orderBy('todoIndex', 'asc')
    .execute()

  return buildTask(
    {
      id: taskRow.id,
      title: taskRow.title,
      goal: taskRow.goal,
      createdAt: taskRow.createdAt,
      updatedAt: taskRow.updatedAt,
    },
    todoRows
  )
}

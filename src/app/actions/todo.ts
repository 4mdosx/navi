'use server'

import { db } from '@/modules/database/service'
import { todoTable } from '@/modules/database/schema'
import { eq, isNull, not } from 'drizzle-orm'
import { verifySessionGuard } from '@/modules/auth/service'
import { v4 as uuidv4 } from 'uuid'
import { TodoCommit } from '@/types/todo'

export async function createTodo(title: string, description?: string) {
  await verifySessionGuard()
  const now = new Date().toISOString()

  const result = await db.insert(todoTable).values({
    title,
    description: description || '',
    completed: 0,
    createdAt: now,
    updatedAt: now,
    commit: [{
      id: uuidv4(),
      message: title,
      timestamp: now,
      type: 'user',
      action: 'create',
    }],
  }).returning()

  return result[0]
}

export async function getTodos() {
  await verifySessionGuard()
  const todos = await db
    .select()
    .from(todoTable)
    .where(isNull(todoTable.deletedAt))
    .orderBy(todoTable.createdAt)
  return todos
}

export async function getTodo(id: number) {
  await verifySessionGuard()
  const todos = await db
    .select()
    .from(todoTable)
    .where(eq(todoTable.id, id))
    .limit(1)
  return todos[0] || null
}

export async function updateTodo(id: number, updates: { title?: string; description?: string; completed?: boolean }) {
  await verifySessionGuard()
  const now = new Date().toISOString()

  const result = await db
    .update(todoTable)
    .set({
      ...updates,
      completed: updates.completed ? 1 : 0,
      updatedAt: now,
    })
    .where(eq(todoTable.id, id))
    .returning()

  return result[0]
}

export async function deleteTodo(id: number) {
  await verifySessionGuard()
  const now = new Date().toISOString()

  const result = await db
    .update(todoTable)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(todoTable.id, id))
    .returning()

  return { success: true, deletedTodo: result[0] }
}

export async function restoreTodo(id: number) {
  await verifySessionGuard()
  const now = new Date().toISOString()

  const result = await db
    .update(todoTable)
    .set({
      deletedAt: null,
      updatedAt: now,
    })
    .where(eq(todoTable.id, id))
    .returning()

  return result[0]
}

export async function getDeletedTodos() {
  await verifySessionGuard()
  const todos = await db
    .select()
    .from(todoTable)
    .where(not(isNull(todoTable.deletedAt)))
    .orderBy(todoTable.deletedAt)
  return todos
}

export async function toggleTodo(id: number) {
  await verifySessionGuard()
  const todo = await db.select().from(todoTable).where(eq(todoTable.id, id)).limit(1)

  if (todo.length === 0) {
    throw new Error('Todo not found')
  }

  const newCompleted = todo[0].completed === 0 ? 1 : 0
  const now = new Date().toISOString()

  const result = await db
    .update(todoTable)
    .set({
      completed: newCompleted,
      updatedAt: now,
    })
    .where(eq(todoTable.id, id))
    .returning()

  return result[0]
}

export async function addCommitToTodo(id: number, commit: TodoCommit) {
  await verifySessionGuard()

  const todo = await db.select().from(todoTable).where(eq(todoTable.id, id)).limit(1)

  if (todo.length === 0) {
    throw new Error('Todo not found')
  }

  const existingCommits = todo[0].commit as TodoCommit[]
  const updatedCommits = [...existingCommits, commit]
  const now = new Date().toISOString()

  const result = await db
    .update(todoTable)
    .set({
      commit: updatedCommits,
      updatedAt: now,
    })
    .where(eq(todoTable.id, id))
    .returning()

  return result[0]
}

export async function getTodoCommits(id: number): Promise<TodoCommit[]> {
  await verifySessionGuard()

  const todo = await db.select().from(todoTable).where(eq(todoTable.id, id)).limit(1)

  if (todo.length === 0) {
    throw new Error('Todo not found')
  }

  return todo[0].commit as TodoCommit[]
}

'use server'

import { db } from '@/modules/database/service'
import { todoTable } from '@/modules/database/schema'
import { eq } from 'drizzle-orm'
import { verifySessionGuard } from '@/modules/auth/service'


export async function createTodo(title: string, description?: string) {
  await verifySessionGuard()
  const now = new Date().toISOString()

  const result = await db.insert(todoTable).values({
    title,
    description: description || '',
    completed: 0,
    createdAt: now,
    updatedAt: now,
  }).returning()

  return result[0]
}

export async function getTodos() {
  await verifySessionGuard()
  const todos = await db.select().from(todoTable).orderBy(todoTable.createdAt)
  return todos
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
  await db.delete(todoTable).where(eq(todoTable.id, id))
  return { success: true }
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

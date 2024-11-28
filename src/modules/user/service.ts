'use server'
import 'server-only'
import { cache } from 'react'
import db from '@/modules/database/service'
import { usersTable } from '@/modules/database/schema'
import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import { createUserDto } from './definitions'

export const getUser = cache(async (userId: number) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId))
  return user[0]
})

export const getUserByEmail = cache(async (email: string) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.email, email))
  return user[0]
})

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10)
}

export async function createUser(user: createUserDto) {
  const result = await db.insert(usersTable).values({
    name: user.name,
    email: user.email,
    password: await hashPassword(user.password),
  })

  const userResult = await db.select().from(usersTable).where(eq(usersTable.id, Number(result.lastInsertRowid)))
  return userResult[0]
}

export async function resetPassword(userId: number, password: string) {
  const hashedPassword = await hashPassword(password)
  await db.update(usersTable).set({ password: hashedPassword }).where(eq(usersTable.id, userId))
}

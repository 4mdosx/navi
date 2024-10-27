'use server'
import 'server-only'
import db from '@/db'
import { usersTable, User } from '@/db/schema'
import { eq } from 'drizzle-orm'

export type createUserDto = Omit<User, 'id'>
export async function createUser(user: createUserDto) {
  const result = await db.insert(usersTable).values({
    name: user.name,
    email: user.email,
    password: user.password,
  })

  const userResult = await db.select().from(usersTable).where(eq(usersTable.id, Number(result.lastInsertRowid)))
  return userResult[0]
}

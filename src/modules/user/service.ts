'use server'
import 'server-only'

import { cache } from 'react'
import db from '@/modules/database/service'
import { usersTable } from '@/modules/database/schema'
import { eq } from 'drizzle-orm'

export const getUser = cache(async (userId: number) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId))
  return user[0]
})

export const getUserByEmail = cache(async (email: string) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.email, email))
  return user[0]
})

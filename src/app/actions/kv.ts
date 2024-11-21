'use server'
import 'server-only'
import db from '@/modules/database/service'
import { KV, kvTable } from '@/modules/database/schema'
import { eq, and } from 'drizzle-orm'
import { verifySessionGuard } from '@/modules/auth/service'

export async function getKv(key: string): Promise<KV | null> {
  const { userId } = await verifySessionGuard()

  const kv = await db.select().from(kvTable).where(and(eq(kvTable.key, key), eq(kvTable.userId, userId)))
  return kv[0]
}

export async function createKv(key: string, value: string, userId: number) {
  await db.insert(kvTable).values({ key, value, userId })
}

export async function updateKv(key: string, value: string) {
  const { userId } = await verifySessionGuard()

  const kv = await getKv(key)
  if (kv) {
    await db.update(kvTable).set({ value }).where(and(eq(kvTable.key, key), eq(kvTable.userId, userId)))
  } else {
    await createKv(key, value, userId)
  }
}

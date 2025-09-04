'use server'
import 'server-only'
import { db } from '@/modules/database/service'
import { KV, kvTable } from '@/modules/database/schema'
import { eq, and } from 'drizzle-orm'
import { verifySessionGuard } from '@/modules/auth/service'

export async function getKv(key: string): Promise<KV | null> {
  await verifySessionGuard()

  const kv = await db.select().from(kvTable).where(eq(kvTable.key, key))
  return kv[0]
}

export async function createKv(key: string, value: string) {
  await db.insert(kvTable).values({ key, value })
}

export async function updateKv(key: string, value: string) {
  await verifySessionGuard()

  const kv = await getKv(key)
  if (kv) {
    await db.update(kvTable).set({ value }).where(and(eq(kvTable.key, key)))
  } else {
    await createKv(key, value)
  }
}

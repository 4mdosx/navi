'use server'
import 'server-only'
import { eq } from 'drizzle-orm'
import { getDatabase } from '../db/database'
import { settings } from '../db/schema'

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase()
  const [result] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)

  return result?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase()
  const updatedAt = new Date().toISOString()
  await db
    .insert(settings)
    .values({ key, value, updatedAt })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt },
    })
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDatabase()
  await db.delete(settings).where(eq(settings.key, key))
}

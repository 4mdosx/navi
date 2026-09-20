'use server'
import 'server-only'
import { getDatabase } from '../db/database'
import type { Database } from '../db/types'

/**
 * 获取设置值
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase()
  const result = await db
    .selectFrom('settings')
    .select(['value'])
    .where('key', '=', key)
    .executeTakeFirst()

  return result?.value ?? null
}

/**
 * 设置值
 */
export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase()
  const now = new Date()
  // SQLite3 需要字符串格式的日期，而不是 Date 对象
  const updatedAtString = now.toISOString()
  await db
    .insertInto('settings')
    .values({
      key,
      value,
      updatedAt: updatedAtString as any, // SQLite 存储为 TEXT，Kysely 会处理转换
    })
    .onConflict((oc) => oc
      .column('key')
      .doUpdateSet({
        value,
        updatedAt: updatedAtString as any,
      })
    )
    .execute()
}

/**
 * 删除设置
 */
export async function deleteSetting(key: string): Promise<void> {
  const db = await getDatabase()
  await db
    .deleteFrom('settings')
    .where('key', '=', key)
    .execute()
}

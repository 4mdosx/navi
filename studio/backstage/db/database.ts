'use server'
import 'server-only'
import { Kysely } from 'kysely'
import { LibsqlDialect } from 'kysely-libsql'
import { createClient } from '@libsql/client'
import type { Database } from './types'

// 创建数据库客户端单例
let dbInstance: Kysely<Database> | null = null

/**
 * 获取数据库客户端实例
 * 使用单例模式确保整个应用只有一个数据库连接
 */
export function getDatabase(): Kysely<Database> {
  if (dbInstance) {
    return dbInstance
  }

  const dbUrl = process.env.DB_FILE_NAME || 'file:./local.db'
  
  // 使用 libsql (SQLite 兼容)
  // 如果需要切换到 better-sqlite3，可以在这里修改
  const client = createClient({
    url: dbUrl,
  })

  dbInstance = new Kysely<Database>({
    dialect: new LibsqlDialect({
      client,
    }),
  })

  return dbInstance
}

/**
 * 关闭数据库连接（用于测试或清理）
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy()
    dbInstance = null
  }
}

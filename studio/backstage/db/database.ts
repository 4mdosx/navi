import 'server-only'
import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import path from 'path'
import type { Database as DatabaseType } from './types'

// 数据库文件路径
const dbPath = process.env.DB_FILE_NAME
  ? process.env.DB_FILE_NAME.replace(/^file:/, '')
  : path.join(process.cwd(), 'local.db')

// 创建 SQLite 数据库连接
const sqlite = new Database(dbPath)

// 创建数据库客户端单例
const globalForDb = globalThis as unknown as {
  db: Kysely<DatabaseType> | undefined
}

/**
 * 获取数据库客户端实例
 * 使用单例模式确保整个应用只有一个数据库连接
 */
export async function getDatabase(): Promise<Kysely<DatabaseType>> {
  if (!globalForDb.db) {
    globalForDb.db = new Kysely<DatabaseType>({
      dialect: new SqliteDialect({
        database: sqlite,
      }),
    })
  }
  return globalForDb.db
}

/**
 * 关闭数据库连接（用于测试或清理）
 */
export async function closeDatabase(): Promise<void> {
  if (globalForDb.db) {
    await globalForDb.db.destroy()
    globalForDb.db = undefined
  }
  sqlite.close()
}

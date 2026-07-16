import 'server-only'
import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import path from 'path'
import type { Database as DatabaseType } from './types'
import { migrateWeekPlanSchema } from './week-plan-migrate'
import { migrateLlmInteractionLogs } from './llm-log-migrate'

// 数据库文件路径
const dbPath = process.env.DB_FILE_NAME
  ? process.env.DB_FILE_NAME.replace(/^file:/, '')
  : path.join(process.cwd(), 'local.db')

// 创建 SQLite 数据库连接
const sqlite = new Database(dbPath)

let schemaEnsured = false

function ensureSchema(): void {
  if (schemaEnsured) return
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tracker_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'long_task',
      status TEXT NOT NULL DEFAULT 'active',
      cadence TEXT,
      lastTouchedAt TEXT,
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_tracker_items_status
    ON tracker_items(status)
  `)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS inbox_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'inbox',
      tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_inbox_items_status
    ON inbox_items(status)
  `)
  migrateWeekPlanSchema(sqlite)
  migrateLlmInteractionLogs(sqlite)
  schemaEnsured = true
}

// 创建数据库客户端单例
const globalForDb = globalThis as unknown as {
  db: Kysely<DatabaseType> | undefined
}

/**
 * 获取数据库客户端实例
 * 使用单例模式确保整个应用只有一个数据库连接
 */
export async function getDatabase(): Promise<Kysely<DatabaseType>> {
  ensureSchema()
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

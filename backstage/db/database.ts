import 'server-only'
import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import path from 'path'
import type { Database as DatabaseType } from './types'
import { migrateTodoDomain } from './todo-migrate'
import { migrateLongTermPlanDomain } from './long-term-plan-migrate'
import { migrateExecutionDomain } from './execution-migrate'

const dbPath = process.env.DB_FILE_NAME
  ? process.env.DB_FILE_NAME.replace(/^file:/, '')
  : path.join(process.cwd(), 'local.db')

const sqlite = new Database(dbPath)

let schemaVersionApplied = 0
const SCHEMA_VERSION = 3

function ensureSchema(): void {
  if (schemaVersionApplied >= SCHEMA_VERSION) return
  sqlite.exec(`
    DROP TABLE IF EXISTS llm_interaction_logs;
    DROP TABLE IF EXISTS inbox_items;
    DROP TABLE IF EXISTS tracker_items;
    DROP TABLE IF EXISTS agent_sessions;
    DROP TABLE IF EXISTS agent_presets;
  `)
  migrateTodoDomain(sqlite)
  migrateLongTermPlanDomain(sqlite)
  migrateExecutionDomain(sqlite)
  schemaVersionApplied = SCHEMA_VERSION
}

const globalForDb = globalThis as unknown as {
  db: Kysely<DatabaseType> | undefined
}

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

export async function closeDatabase(): Promise<void> {
  if (globalForDb.db) {
    await globalForDb.db.destroy()
    globalForDb.db = undefined
  }
  sqlite.close()
}

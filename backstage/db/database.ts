import 'server-only'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import { drizzle, type NodeSQLiteDatabase } from 'drizzle-orm/node-sqlite'
import { migrateTodoDomain } from './todo-migrate'
import { migrateExecutionDomain } from './execution-migrate'

export type AppDatabase = NodeSQLiteDatabase

const dbPath = process.env.DB_FILE_NAME
  ? process.env.DB_FILE_NAME.replace(/^file:/, '')
  : path.join(process.cwd(), 'local.db')

const sqlite = new DatabaseSync(dbPath)

let schemaVersionApplied = 0
const SCHEMA_VERSION = 10

function ensureSchema(): void {
  if (schemaVersionApplied >= SCHEMA_VERSION) return
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    DROP TABLE IF EXISTS llm_interaction_logs;
    DROP TABLE IF EXISTS inbox_items;
    DROP TABLE IF EXISTS tracker_items;
    DROP TABLE IF EXISTS agent_sessions;
    DROP TABLE IF EXISTS agent_presets;
  `)
  migrateTodoDomain(sqlite)
  sqlite.exec(`
    DROP TABLE IF EXISTS plan_check_ins;
    DROP TABLE IF EXISTS plan_occurrences;
    DROP TABLE IF EXISTS long_term_plans;
  `)
  migrateExecutionDomain(sqlite)
  schemaVersionApplied = SCHEMA_VERSION
}

const globalForDb = globalThis as unknown as {
  db: AppDatabase | undefined
}

export async function getDatabase(): Promise<AppDatabase> {
  ensureSchema()
  if (!globalForDb.db) {
    globalForDb.db = drizzle({ client: sqlite })
  }
  return globalForDb.db
}

export async function closeDatabase(): Promise<void> {
  globalForDb.db = undefined
  sqlite.close()
}

#!/usr/bin/env node
/**
 * 数据库初始化脚本：创建 settings / todos / 今日执行表。
 *
 * 用法:
 *   npm run init-db
 *   或 DB_FILE_NAME=/path/to/new.db npm run init-db
 *   或 tsx backstage/db/init-db.ts
 */

import Database from 'better-sqlite3'
import path from 'path'
import { migrateTodoDomain } from './todo-migrate'
import { migrateExecutionDomain } from './execution-migrate'

const dbPath = process.env.DB_FILE_NAME
  ? process.env.DB_FILE_NAME.replace(/^file:/, '')
  : path.join(process.cwd(), 'local.db')

function initializeDatabase(): void {
  console.log(`Initializing database at: ${dbPath}`)

  const sqlite = new Database(dbPath)

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    sqlite.exec(`
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

    console.log('✓ Database initialized successfully')
  } catch (error) {
    console.error('✗ Failed to initialize database:', error)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

initializeDatabase()

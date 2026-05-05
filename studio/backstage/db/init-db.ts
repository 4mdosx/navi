#!/usr/bin/env node
/**
 * 数据库初始化脚本：创建 settings / projects / project_todos / agent_sessions。
 * `agent_sessions` 每次 init 会先 **DROP** 再建表（仅清空 Agent 会话；projects 等不受影响）。
 *
 * 用法:
 *   npm run init-db
 *   或 DB_FILE_NAME=/path/to/new.db npm run init-db
 *   或 tsx backstage/db/init-db.ts
 */

import Database from 'better-sqlite3'
import path from 'path'

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
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        goal INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `)

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS project_todos (
        projectId TEXT NOT NULL,
        weekItemIndex INTEGER NOT NULL,
        id TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        comment TEXT NOT NULL DEFAULT '[]',
        PRIMARY KEY (projectId, weekItemIndex),
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      )
    `)

    // agent_sessions：与 Cursor SDK 对齐；升级时整表丢弃重建（仅影响 Agent 会话数据）
    sqlite.exec(`DROP TABLE IF EXISTS agent_sessions`)

    sqlite.exec(`
      CREATE TABLE agent_sessions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        startedAt TEXT NOT NULL,
        endedAt TEXT,
        exitCode INTEGER,
        sdkRunId TEXT,
        sdkAgentId TEXT,
        sdkRuntime TEXT,
        taskParamsJson TEXT NOT NULL DEFAULT '{}',
        createdAt TEXT NOT NULL,
        logBlob TEXT NOT NULL DEFAULT ''
      )
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_agent_sessions_status
      ON agent_sessions(status)
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_agent_sessions_startedAt
      ON agent_sessions(startedAt DESC)
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_agent_sessions_sdkRunId
      ON agent_sessions(sdkRunId)
    `)

    console.log('✓ Database initialized successfully')
  } catch (error) {
    console.error('✗ Failed to initialize database:', error)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

initializeDatabase()

#!/usr/bin/env node
/**
 * 数据库初始化脚本：创建 settings / todos / agent_sessions / agent_presets。
 * `agent_sessions` 每次 init 会先 **DROP** 再建表（仅清空 Agent 会话）。
 *
 * 用法:
 *   npm run init-db
 *   或 DB_FILE_NAME=/path/to/new.db npm run init-db
 *   或 tsx backstage/db/init-db.ts
 */

import Database from 'better-sqlite3'
import path from 'path'
import { migrateTodoDomain } from './todo-migrate'

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

    // Import legacy week-plan task tables before creating the canonical views.
    migrateTodoDomain(sqlite)

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

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS agent_presets (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        runtime TEXT NOT NULL,
        promptPrefix TEXT NOT NULL DEFAULT '',
        localCwd TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `)

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        parentId TEXT REFERENCES todos(id) ON DELETE CASCADE,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        depth INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        estimatedMinutes INTEGER NOT NULL DEFAULT 60,
        placement TEXT NOT NULL DEFAULT 'backlog',
        hour INTEGER NOT NULL DEFAULT 1,
        dayIndex INTEGER,
        weekStart TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        startedAt TEXT,
        completedAt TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_placement_week
      ON todos(placement, weekStart, dayIndex)
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_parent_sort
      ON todos(parentId, sortOrder)
    `)

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

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS llm_interaction_logs (
        id TEXT PRIMARY KEY,
        feature TEXT NOT NULL,
        model TEXT NOT NULL,
        requestJson TEXT NOT NULL,
        responseText TEXT,
        error TEXT,
        createdAt TEXT NOT NULL
      )
    `)

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_llm_interaction_logs_feature_createdAt
      ON llm_interaction_logs(feature, createdAt DESC)
    `)

    const now = new Date().toISOString()
    const defaultPromptPrefix =
      'You are working in a Navi-managed notes repository.\nGit branch policy: do all edits on branch `agent-dev` only.'
    sqlite.exec(`
      INSERT INTO agent_presets (id, label, runtime, promptPrefix, localCwd, createdAt, updatedAt)
      SELECT
        'navi-local',
        'Navi Local',
        'local',
        '${defaultPromptPrefix.replaceAll("'", "''")}',
        '/Users/token/Workshop/navi',
        '${now}',
        '${now}'
      WHERE NOT EXISTS (SELECT 1 FROM agent_presets)
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

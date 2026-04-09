#!/usr/bin/env node
/**
 * 数据库初始化脚本：创建 settings / projects / project_todos
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

    console.log('✓ Database initialized successfully')
  } catch (error) {
    console.error('✗ Failed to initialize database:', error)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

initializeDatabase()

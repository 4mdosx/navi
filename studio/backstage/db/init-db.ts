#!/usr/bin/env node
/**
 * 数据库初始化脚本
 * 用于创建数据库表结构
 *
 * 使用方法:
 *   npm run init-db
 *   或
 *   tsx backstage/db/init-db.ts
 */

import Database from 'better-sqlite3'
import path from 'path'

// 数据库文件路径
const dbPath = process.env.DB_FILE_NAME
  ? process.env.DB_FILE_NAME.replace(/^file:/, '')
  : path.join(process.cwd(), 'local.db')

/**
 * 初始化数据库表（如果不存在则创建）
 */
function initializeDatabase(): void {
  console.log(`Initializing database at: ${dbPath}`)

  const sqlite = new Database(dbPath)

  try {
    // 创建 settings 表（如果不存在）
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建 repositories 表（如果不存在）
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建 tasks 表（如果不存在）
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        goal INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `)

    // 创建 task_todos 表（新结构：id, content, comment；无 title/goal，goal 在 comment 每条内）
    sqlite.exec(`DROP TABLE IF EXISTS task_todos`)
    sqlite.exec(`
      CREATE TABLE task_todos (
        taskId TEXT NOT NULL,
        todoIndex INTEGER NOT NULL,
        id TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        comment TEXT NOT NULL DEFAULT '[]',
        PRIMARY KEY (taskId, todoIndex),
        FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
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

// 执行初始化
initializeDatabase()

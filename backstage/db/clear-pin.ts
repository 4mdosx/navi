#!/usr/bin/env node
/**
 * 清除 SQLite 中保存的访问 PIN。下次打开应用需要重新设置。
 *
 * 用法:
 *   npm run clear-pin
 *   或 DB_FILE_NAME=/path/to/local.db npm run clear-pin
 */
import { config } from 'dotenv'
import Database from 'better-sqlite3'
import path from 'path'

config()

const dbPath = process.env.DB_FILE_NAME
  ? process.env.DB_FILE_NAME.replace(/^file:/, '')
  : path.join(process.cwd(), 'local.db')

const PIN_KEYS = ['pin.hash', 'pin.epoch', 'pin.updatedAt']

function clearPin(): void {
  console.log(`Using database: ${dbPath}`)
  const sqlite = new Database(dbPath)

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const result = sqlite
      .prepare(`DELETE FROM settings WHERE key IN (${PIN_KEYS.map(() => '?').join(', ')})`)
      .run(...PIN_KEYS)

    if (result.changes > 0) {
      console.log('PIN 已清除。下次进入页面需要重新设置。')
    } else {
      console.log('当前没有设置 PIN。')
    }
  } catch (error) {
    console.error('清除 PIN 失败:', error)
    process.exit(1)
  } finally {
    sqlite.close()
  }
}

clearPin()

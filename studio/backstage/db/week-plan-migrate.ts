import type Database from 'better-sqlite3'

type ColumnInfo = { name: string }

export function migrateWeekPlanSchema(sqlite: Database.Database): void {
  const tableExists = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='week_plan_todos'"
    )
    .get()
  if (!tableExists) return

  const columns = sqlite
    .prepare('PRAGMA table_info(week_plan_todos)')
    .all() as ColumnInfo[]
  const names = new Set(columns.map((c) => c.name))

  if (!names.has('parentId')) {
    sqlite.exec('ALTER TABLE week_plan_todos ADD COLUMN parentId TEXT')
  }
  if (!names.has('sortOrder')) {
    sqlite.exec(
      'ALTER TABLE week_plan_todos ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0'
    )
  }
  if (!names.has('estimatedMinutes')) {
    sqlite.exec(
      'ALTER TABLE week_plan_todos ADD COLUMN estimatedMinutes INTEGER NOT NULL DEFAULT 60'
    )
    sqlite.exec(
      'UPDATE week_plan_todos SET estimatedMinutes = estimatedHours * 60'
    )
  }

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_week_plan_todos_parentId
    ON week_plan_todos(parentId)
  `)
}

import type Database from 'better-sqlite3'

type TableRow = { name: string }
type ColumnRow = { name: string }

function tableExists(sqlite: Database.Database, name: string): boolean {
  return Boolean(
    sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(name) as TableRow | undefined
  )
}

/**
 * Creates the single Todo source of truth and imports legacy task data once.
 * Legacy tables are removed after a successful transactional import.
 */
export function migrateTodoDomain(sqlite: Database.Database): void {
  sqlite.pragma('foreign_keys = ON')
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
    );
    CREATE INDEX IF NOT EXISTS idx_todos_parent_sort ON todos(parentId, sortOrder);
    CREATE INDEX IF NOT EXISTS idx_todos_placement_week ON todos(placement, weekStart, dayIndex);
    CREATE INDEX IF NOT EXISTS idx_todos_status_updated ON todos(status, updatedAt DESC);
  `)

  sqlite.transaction(() => {
    if (tableExists(sqlite, 'week_plan_todos')) {
      const columns = new Set(
        (sqlite.prepare('PRAGMA table_info(week_plan_todos)').all() as ColumnRow[])
          .map((column) => column.name)
      )
      if (!columns.has('parentId')) sqlite.exec('ALTER TABLE week_plan_todos ADD COLUMN parentId TEXT')
      if (!columns.has('sortOrder')) sqlite.exec('ALTER TABLE week_plan_todos ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0')
      if (!columns.has('estimatedMinutes')) {
        sqlite.exec('ALTER TABLE week_plan_todos ADD COLUMN estimatedMinutes INTEGER NOT NULL DEFAULT 60')
        sqlite.exec('UPDATE week_plan_todos SET estimatedMinutes = estimatedHours * 60')
      }
      sqlite.exec(`
        INSERT OR IGNORE INTO todos (
          id, parentId, sortOrder, depth, title, description, content, status,
          estimatedMinutes, placement, hour, dayIndex, weekStart, version,
          startedAt, completedAt, createdAt, updatedAt
        )
        SELECT id, parentId, sortOrder, CASE WHEN parentId IS NULL THEN 0 ELSE 1 END,
          title, '', content, status, estimatedMinutes, 'week_plan', hour,
          dayIndex, weekStart, 1, startedAt, completedAt, createdAt, updatedAt
        FROM week_plan_todos;
        DROP TABLE week_plan_todos;
      `)
    }

    if (tableExists(sqlite, 'week_plan_pending')) {
      sqlite.exec(`
        INSERT OR IGNORE INTO todos (
          id, parentId, sortOrder, depth, title, description, content, status,
          estimatedMinutes, placement, hour, dayIndex, weekStart, version,
          startedAt, completedAt, createdAt, updatedAt
        )
        SELECT id, NULL, sortOrder, 0, title, '', '', 'pending',
          CAST(estimatedHours * 60 AS INTEGER), 'backlog', hour, NULL, NULL, 1,
          NULL, NULL, createdAt, updatedAt
        FROM week_plan_pending;
        DROP TABLE week_plan_pending;
      `)
    }
  })()
}

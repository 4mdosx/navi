import type { DatabaseSync } from 'node:sqlite'

type ColumnRow = { name: string }

function columnNames(sqlite: DatabaseSync, table: string): Set<string> {
  return new Set(
    (sqlite.prepare(`PRAGMA table_info(${table})`).all() as ColumnRow[])
      .map((column) => column.name)
  )
}

function dropColumnIfExists(sqlite: DatabaseSync, table: string, column: string): void {
  if (columnNames(sqlite, table).has(column)) {
    sqlite.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`)
  }
}

export function migrateTodoDomain(sqlite: DatabaseSync): void {
  sqlite.exec('PRAGMA foreign_keys = ON')
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
      estimatedMinutes INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'action',
      version INTEGER NOT NULL DEFAULT 1,
      startedAt TEXT,
      completedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      noteType TEXT NOT NULL DEFAULT 'user'
    );
    CREATE INDEX IF NOT EXISTS idx_todos_parent_sort ON todos(parentId, sortOrder);
    CREATE INDEX IF NOT EXISTS idx_todos_status_updated ON todos(status, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_todos_kind ON todos(kind);
  `)

  sqlite.exec('DROP INDEX IF EXISTS idx_todos_placement_week')
  sqlite.exec('DROP INDEX IF EXISTS idx_todos_kind_review')

  const columns = columnNames(sqlite, 'todos')
  if (!columns.has('noteType')) {
    sqlite.exec("ALTER TABLE todos ADD COLUMN noteType TEXT NOT NULL DEFAULT 'user'")
  }
  for (const column of ['hour', 'weekStart', 'dayIndex', 'reviewAt', 'activationCondition', 'placement']) {
    dropColumnIfExists(sqlite, 'todos', column)
  }
  sqlite.exec("UPDATE todos SET kind = 'action' WHERE kind NOT IN ('action', 'note', 'rest')")

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS todo_time_links (
      id TEXT PRIMARY KEY,
      todoId TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      grain TEXT NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT '',
      UNIQUE(todoId, grain, date)
    );
    CREATE INDEX IF NOT EXISTS idx_todo_time_links_lookup
    ON todo_time_links(grain, date, todoId);
  `)

  const timeLinkColumns = columnNames(sqlite, 'todo_time_links')
  if (!timeLinkColumns.has('createdAt')) {
    sqlite.exec("ALTER TABLE todo_time_links ADD COLUMN createdAt TEXT NOT NULL DEFAULT ''")
  }
  sqlite.exec(`
    UPDATE todo_time_links
    SET createdAt = date || 'T00:00:00.000Z'
    WHERE createdAt IS NULL OR createdAt = ''
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS todo_time_spans (
      id TEXT PRIMARY KEY,
      todoId TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      startedAt TEXT NOT NULL,
      endedAt TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_todo_time_spans_range
      ON todo_time_spans(startedAt, endedAt);
    CREATE INDEX IF NOT EXISTS idx_todo_time_spans_todo
      ON todo_time_spans(todoId, startedAt);
    CREATE INDEX IF NOT EXISTS idx_todo_time_spans_open
      ON todo_time_spans(todoId) WHERE endedAt IS NULL;
  `)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS todo_tags (
      todoId TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
      tagId TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (todoId, tagId)
    );
    CREATE INDEX IF NOT EXISTS idx_todo_tags_tag ON todo_tags(tagId);
    CREATE TABLE IF NOT EXISTS focus_modes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      includeTags TEXT NOT NULL DEFAULT '["*"]',
      excludeTags TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `)
}

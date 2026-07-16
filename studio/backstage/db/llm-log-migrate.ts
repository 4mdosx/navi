import type Database from 'better-sqlite3'

export function migrateLlmInteractionLogs(sqlite: Database.Database): void {
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
}

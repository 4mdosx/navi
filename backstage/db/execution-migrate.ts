import type { DatabaseSync } from 'node:sqlite'
export function migrateExecutionDomain(sqlite: DatabaseSync){sqlite.exec(`
CREATE TABLE IF NOT EXISTS work_items(id TEXT PRIMARY KEY,sourceType TEXT NOT NULL,sourceId TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',scheduledDate TEXT NOT NULL,queueOrder INTEGER NOT NULL DEFAULT 0,priority TEXT NOT NULL DEFAULT 'normal',state TEXT NOT NULL DEFAULT 'ready',plannedMinutes INTEGER NOT NULL,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,UNIQUE(sourceType,sourceId,scheduledDate));
CREATE TABLE IF NOT EXISTS execution_sessions(id TEXT PRIMARY KEY,workItemId TEXT NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,startedAt TEXT NOT NULL,endedAt TEXT,endReason TEXT,note TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS idx_work_items_today ON work_items(scheduledDate,queueOrder); CREATE INDEX IF NOT EXISTS idx_sessions_item ON execution_sessions(workItemId,startedAt);
`)}

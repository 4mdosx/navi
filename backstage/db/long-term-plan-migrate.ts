import type Database from 'better-sqlite3'

export function migrateLongTermPlanDomain(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS long_term_plans (
      id TEXT PRIMARY KEY,
      sourceTodoId TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      cadence TEXT NOT NULL DEFAULT 'weekly',
      scheduleMode TEXT NOT NULL DEFAULT 'weekly_quota',
      intervalWeeks INTEGER NOT NULL DEFAULT 1,
      targetCount INTEGER NOT NULL DEFAULT 1,
      stretchCount INTEGER,
      preferredDays TEXT NOT NULL DEFAULT '[]',
      estimatedMinutes INTEGER NOT NULL DEFAULT 30,
      startDate TEXT NOT NULL,
      endDate TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS plan_occurrences (
      id TEXT PRIMARY KEY,
      planId TEXT NOT NULL REFERENCES long_term_plans(id) ON DELETE CASCADE,
      scheduledDate TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      actualMinutes INTEGER,
      note TEXT NOT NULL DEFAULT '',
      completedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(planId, scheduledDate)
    );
    CREATE INDEX IF NOT EXISTS idx_plan_occurrences_date ON plan_occurrences(scheduledDate, status);
    CREATE INDEX IF NOT EXISTS idx_plan_occurrences_plan ON plan_occurrences(planId, scheduledDate);
    CREATE TABLE IF NOT EXISTS plan_check_ins (
      id TEXT PRIMARY KEY,
      planId TEXT NOT NULL REFERENCES long_term_plans(id) ON DELETE CASCADE,
      weekStart TEXT NOT NULL,
      checkedAt TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_plan_check_ins_week ON plan_check_ins(planId, weekStart, checkedAt);
    INSERT OR IGNORE INTO plan_check_ins (id, planId, weekStart, checkedAt, note)
    SELECT
      'legacy-' || id,
      planId,
      date(scheduledDate, '-' || CAST(strftime('%w', scheduledDate) AS INTEGER) || ' days'),
      COALESCE(completedAt, updatedAt),
      note
    FROM plan_occurrences
    WHERE status = 'done';
    UPDATE plan_check_ins
    SET weekStart = date(checkedAt, '-' || CAST(strftime('%w', checkedAt) AS INTEGER) || ' days')
    WHERE weekStart <> date(checkedAt, '-' || CAST(strftime('%w', checkedAt) AS INTEGER) || ' days');
  `)

  sqlite.exec(`
    INSERT OR IGNORE INTO todo_time_links (id, todoId, grain, date)
    SELECT 'time-horizon-plan-' || sourceTodoId, sourceTodoId, 'horizon', startDate
    FROM long_term_plans
    WHERE sourceTodoId IS NOT NULL
      AND EXISTS (SELECT 1 FROM todos WHERE todos.id = long_term_plans.sourceTodoId);
  `)
}

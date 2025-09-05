import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export type KV = typeof kvTable.$inferSelect
export const kvTable = sqliteTable('kv_table', {
  id: int().primaryKey({ autoIncrement: true }),
  key: text().notNull(),
  value: text().notNull(),
})

export type Todo = typeof todoTable.$inferSelect
export const todoTable = sqliteTable('todos', {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  description: text(),
  completed: int().default(0).notNull(), // 0 = false, 1 = true
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  deletedAt: text(), // null = not deleted, timestamp = deleted
  commit: text({ mode: 'json' }).notNull(),
})

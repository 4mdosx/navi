import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export type KV = typeof kvTable.$inferSelect
export const kvTable = sqliteTable('kv_table', {
  id: int().primaryKey({ autoIncrement: true }),
  key: text().notNull(),
  value: text().notNull(),
})

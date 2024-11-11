import { int, sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export type User = typeof usersTable.$inferSelect
export const usersTable = sqliteTable('users_table', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  active: integer().default(0),
})

export const kvTable = sqliteTable('kv_table', {
  id: int().primaryKey({ autoIncrement: true }),
  key: text().notNull(),
  value: text().notNull(),
  userId: int().references(() => usersTable.id),
})

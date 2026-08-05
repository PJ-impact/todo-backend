import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' })
    .notNull()
    .default(false),
});

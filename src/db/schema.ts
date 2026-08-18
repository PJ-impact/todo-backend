import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// 1. Users Table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  password: text('password').notNull(),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),

  // Soft-delete fields:
  // isActive = false means the user has requested account deletion.
  // deletedAt records when they clicked "delete my account."
  // The auto-wipe job uses deletedAt to permanently erase after 30 days.
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  deletedAt: text('deleted_at'),
});

// 2. Refresh Tokens Table
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
});

// 3. Todos Table
export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // The short title of the todo (required)
  title: text('title').notNull(),

  // Optional longer description — nullable because not every todo needs one
  description: text('description'),

  // Status as text instead of a boolean: allows more than just done/not-done.
  // Allowed values enforced at the DTO level: 'pending' | 'in_progress' | 'completed'
  status: text('status').notNull().default('in_progress'),

  // Auto-set by the database when the row is inserted — never passed manually
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),

  // Null until the todo is marked completed; set by the application when status → 'completed'
  completedAt: text('completed_at'),

  // Foreign key: every todo belongs to a user; cascades on user deletion
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// 4. Token Blacklist Table
// When a user logs out, their JWT is stored here so it cannot be reused
// even though it hasn't expired yet. The token's unique ID (jti) is stored
// to keep the table small — no need to store the full token string.
export const tokenBlacklist = sqliteTable('token_blacklist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // jti is the unique "JWT ID" claim we sign into every token
  jti: text('jti').notNull().unique(),
  // Store expiry so a cleanup job can prune expired entries automatically
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 5. Password Reset Tokens Table
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // We store a hash of the token, never the raw value — same principle as passwords
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

// 6. Table Relations
export const usersRelations = relations(users, ({ many }) => ({
  todos: many(todos),
  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
}));

export const todosRelations = relations(todos, ({ one }) => ({
  author: one(users, {
    fields: [todos.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);

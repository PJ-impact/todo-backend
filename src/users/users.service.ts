import { Inject, Injectable } from '@nestjs/common';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.provider';
import { users } from '../db/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ─── Lookups ───────────────────────────────────────────────────────────────

  async findByEmail(email: string) {
    return this.db.select().from(users).where(eq(users.email, email)).get();
  }

  async findByUsername(username: string) {
    return this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();
  }

  async findById(id: number) {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }

  // ─── Create / Update ──────────────────────────────────────────────────────

  async create(data: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    const result = await this.db.insert(users).values(data).returning();
    return result[0];
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  // ─── Soft Delete ──────────────────────────────────────────────────────────

  /**
   * Mark a user's account as inactive (soft delete).
   *
   * Sets isActive = false and records the timestamp in deletedAt.
   * The user row (and all their todos) still exist in the database.
   *
   * The 30-day cron job reads deletedAt to decide when to permanently remove them.
   */
  async softDelete(userId: number): Promise<void> {
    await this.db
      .update(users)
      .set({
        isActive: false,
        deletedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));
  }

  // ─── Cron Job Helpers ─────────────────────────────────────────────────────

  /**
   * Find all users who have been soft-deleted for longer than `days` days.
   * Used by the auto-wipe cron job.
   *
   * @param days  - Minimum number of days since deletedAt (default: 30)
   */
  async findInactiveOlderThan(days: number = 30): Promise<{ id: number }[]> {
    const cutoff = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    return this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.isActive, false), // must be deactivated
          isNotNull(users.deletedAt), // must have a deletion timestamp
          lt(users.deletedAt, cutoff), // deletion was more than `days` days ago
        ),
      )
      .all();
  }

  /**
   * Permanently delete a user and all their data.
   *
   * Because todos.userId has ON DELETE CASCADE, deleting the user row
   * automatically removes all their todos, refresh tokens, and reset tokens.
   *
   * Only called by the cron job after the grace period has passed.
   */
  async hardDelete(userId: number): Promise<void> {
    await this.db.delete(users).where(eq(users.id, userId));
  }
}

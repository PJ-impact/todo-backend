import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, like } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.provider';
import { todos } from '../db/schema';
import { CreateTodoDto, TodoStatus } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodoBackendService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ─── Create ────────────────────────────────────────────────────────────────

  // Create a new todo for the authenticated user
  async create(userId: number, dto: CreateTodoDto) {
    const result = await this.db
      .insert(todos)
      .values({
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ?? TodoStatus.IN_PROGRESS,
        userId,
      })
      .returning();
    return result[0];
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  /**
   * Get all todos for the authenticated user with optional filters.
   *
   * Privacy guarantee: userId is always applied — a user can never see
   * another user's tasks regardless of what filters they pass.
   *
   * @param userId   - The ID of the logged-in user (from JWT)
   * @param status   - Optional: 'in_progress' | 'completed'
   * @param search   - Optional: partial text search against the title
   */
  async findAll(userId: number, status?: TodoStatus, search?: string) {
    // Build the WHERE conditions dynamically.
    // The userId condition is always present — this is the privacy check.
    const conditions = [eq(todos.userId, userId)];

    // Only add a status filter if the caller provided one
    if (status) {
      conditions.push(eq(todos.status, status));
    }

    // Only add a search filter if the caller provided one.
    // LIKE '%search%' is case-insensitive in SQLite by default for ASCII.
    if (search) {
      conditions.push(like(todos.title, `%${search}%`));
    }

    // and(...conditions) merges all conditions with SQL AND
    return this.db
      .select()
      .from(todos)
      .where(and(...conditions))
      .all();
  }

  // Get a single todo by ID — only if it belongs to the authenticated user
  async findOne(userId: number, id: number) {
    const todo = await this.db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .get();

    if (!todo) {
      // Deliberately vague: we say "not found" rather than "not yours"
      // so an attacker cannot tell if a todo exists but belongs to someone else
      throw new NotFoundException(`Todo with id ${id} not found.`);
    }
    return todo;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  // Update a todo — automatically sets completedAt when status → 'completed'
  async update(userId: number, id: number, dto: UpdateTodoDto) {
    // Confirm the todo exists and belongs to this user before updating
    await this.findOne(userId, id);

    const completedAt =
      dto.status === TodoStatus.COMPLETED
        ? new Date().toISOString()
        : dto.status === TodoStatus.IN_PROGRESS
          ? null // clear completedAt when reverting to in_progress
          : undefined; // no change if status wasn't passed

    const result = await this.db
      .update(todos)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(completedAt !== undefined && { completedAt }),
      })
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();

    return result[0];
  }

  /**
   * Toggle a todo's status between 'in_progress' and 'completed'.
   *
   * Process:
   *   1. Load the todo (privacy check: must belong to this user)
   *   2. If current status is 'in_progress'  → set to 'completed', record completedAt
   *   3. If current status is 'completed'    → set to 'in_progress', clear completedAt
   *   4. Save and return the updated todo
   */
  async toggle(userId: number, id: number) {
    const todo = await this.findOne(userId, id);

    const isCompleting = todo.status !== TodoStatus.COMPLETED;
    const newStatus = isCompleting
      ? TodoStatus.COMPLETED
      : TodoStatus.IN_PROGRESS;
    const completedAt = isCompleting ? new Date().toISOString() : null;

    const result = await this.db
      .update(todos)
      .set({ status: newStatus, completedAt })
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();

    return result[0];
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  // Delete a single todo — only if it belongs to the authenticated user
  async remove(userId: number, id: number) {
    // Confirm the todo exists and belongs to this user before deleting
    await this.findOne(userId, id);

    await this.db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));

    return { message: `Todo ${id} deleted successfully.` };
  }

  /**
   * Delete ALL completed todos for the authenticated user in a single query.
   *
   * Privacy guarantee: userId is always part of the WHERE clause,
   * so only the logged-in user's completed tasks are affected.
   */
  async deleteCompleted(userId: number) {
    const deleted = await this.db
      .delete(todos)
      .where(
        and(eq(todos.userId, userId), eq(todos.status, TodoStatus.COMPLETED)),
      )
      .returning();

    return {
      message: `${deleted.length} completed todo(s) deleted.`,
      count: deleted.length,
    };
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.provider';
import { todos } from '../db/schema';
import { CreateTodoDto, TodoStatus } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodoBackendService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

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

  // Get all todos belonging to the authenticated user
  async findAll(userId: number) {
    return this.db.select().from(todos).where(eq(todos.userId, userId)).all();
  }

  // Get a single todo by ID — only if it belongs to the authenticated user
  async findOne(userId: number, id: number) {
    const todo = await this.db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .get();

    if (!todo) {
      throw new NotFoundException(`Todo with id ${id} not found.`);
    }
    return todo;
  }

  // Update a todo — automatically sets completedAt when status is set to 'completed'
  async update(userId: number, id: number, dto: UpdateTodoDto) {
    // Confirm the todo exists and belongs to this user before updating
    await this.findOne(userId, id);

    const completedAt =
      dto.status === TodoStatus.COMPLETED
        ? new Date().toISOString()
        : undefined;

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

  // Delete a todo — only if it belongs to the authenticated user
  async remove(userId: number, id: number) {
    // Confirm the todo exists and belongs to this user before deleting
    await this.findOne(userId, id);

    await this.db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));

    return { message: `Todo ${id} deleted successfully.` };
  }
}

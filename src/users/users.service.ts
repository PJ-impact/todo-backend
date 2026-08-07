import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.provider';
import { users } from '../db/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async findByEmail(email: string) {
    return this.db.select().from(users).where(eq(users.email, email)).get();
  }

  async findByUsername(username: string) {
    return this.db.select().from(users).where(eq(users.username, username)).get();
  }

  async findById(id: number) {
    return this.db.select().from(users).where(eq(users.id, id)).get();
  }

  async create(data: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    return this.db.insert(users).values(data).returning();
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }
}

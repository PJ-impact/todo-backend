import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../db/schema';

export const DRIZZLE = 'DRIZZLE';

export const databaseProvider = {
  provide: DRIZZLE,
  useFactory: () => {
    const sql = neon(process.env.DATABASE_URL!);
    return drizzle(sql, { schema });
  },
};

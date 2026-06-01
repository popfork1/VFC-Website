import * as schema from "@shared/schema";
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use postgres-js driver for both dev and production
// It works with both Neon and standard PostgreSQL connections
// CRITICAL: Transform undefined to null globally - postgres-js crashes on undefined values
const sql = postgres(connectionString, {
  transform: {
    undefined: null,
  },
});

export const db = drizzle({ client: sql, schema });
export const rawSql = sql;

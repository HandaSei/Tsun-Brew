import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString =
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error(
    "NEON_DATABASE_URL, DATABASE_URL, or POSTGRES_URL must be set. Did you forget to provision a database?",
  );
}

const sslDisabled = connectionString.includes("sslmode=disable");
const forceSsl =
  process.env.PGSSL === "true" ||
  process.env.VERCEL === "1" ||
  process.env.NODE_ENV === "production" ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require");

export const pool = new Pool({
  connectionString,
  ssl: !sslDisabled && forceSsl ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

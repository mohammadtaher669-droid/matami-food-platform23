import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = process.env.DATABASE_URL;

// Railway's public proxy and most managed Postgres hosts require SSL.
// We skip SSL only for plain localhost / 127.0.0.1 connections (local dev).
const isLocal =
  dbUrl.includes("localhost") ||
  dbUrl.includes("127.0.0.1") ||
  dbUrl.includes("@postgres:") || // Docker Compose service name
  dbUrl.includes("postgres.railway.internal"); // Railway internal private network (no SSL needed)

const sslConfig = isLocal ? undefined : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: sslConfig,
});

export const db = drizzle(pool, { schema });

export * from "./schema";

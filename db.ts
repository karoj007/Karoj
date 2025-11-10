import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Please check your environment variables.");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const sslConfig = process.env.NODE_ENV === "production"
  ? { rejectUnauthorized: false }
  : undefined;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});
export const db = drizzle(pool, { schema });

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log("🔍 Testing database connection...");
    await pool.query('SELECT 1');
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

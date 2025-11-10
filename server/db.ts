import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const serverDir = fileURLToPath(new URL(".", import.meta.url));
const dataDir = path.resolve(serverDir, "../data");
const dbPath = path.resolve(dataDir, "lab.db");

fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    normal_range TEXT,
    price REAL,
    test_type TEXT NOT NULL DEFAULT 'standard',
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
  );`,
  `CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    phone TEXT,
    source TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
  );`,
  `CREATE TABLE IF NOT EXISTS visits (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    total_cost REAL NOT NULL,
    test_ids TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS test_results (
    id TEXT PRIMARY KEY,
    visit_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    test_name TEXT NOT NULL,
    result TEXT,
    unit TEXT,
    normal_range TEXT,
    price REAL,
    test_type TEXT NOT NULL DEFAULT 'standard',
    urine_data TEXT,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000)
  );`,
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id TEXT PRIMARY KEY,
    section_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    color TEXT,
    route TEXT NOT NULL
  );`,
];

export function initializeDatabase() {
  for (const statement of createTableStatements) {
    sqlite.exec(statement);
  }
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    sqlite.prepare("SELECT 1").get();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const DB_PATH = path.join(process.cwd(), "data", "app.db");

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db | null = null;

// Lazy so that importing this module never touches the filesystem at build
// time; the connection opens on first query at runtime.
export function getDb(): Db {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const client = new Database(DB_PATH);
    client.pragma("journal_mode = WAL");
    client.pragma("foreign_keys = ON");
    db = drizzle(client, { schema });
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  }
  return db;
}

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { seedOwner, seedDemo } from "./seed";

function open() {
  const file = process.env.DATABASE_PATH ?? "./data/boc.db";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file, { timeout: 15000 });
  // busy_timeout 要在切换 WAL 之前设，否则 next build 的多个 worker 会同时抢锁
  sqlite.pragma("busy_timeout = 15000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  // 用 BEGIN IMMEDIATE 串行化，next build 会起多个 worker 同时打开这个库
  const seed = sqlite.transaction(() => {
    seedOwner(db);
    if (process.env.SEED_DEMO === "1") seedDemo(db);
  });
  seed.immediate();
  return db;
}

type DB = ReturnType<typeof open>;
const g = globalThis as unknown as { __bocDb?: DB };
export const db: DB = g.__bocDb ?? (g.__bocDb = open());
export { schema };

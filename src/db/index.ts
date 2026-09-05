import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { seedAchievements, seedOwner, seedDemo } from "./seed";

/** 同步睡 ms 毫秒，不占 CPU（这里全程是启动期的同步代码）。 */
function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * 迁移要能容忍并发：`next build` 会起多个 worker 同时打开同一个库，
 * 空库时它们会一起发现「没有跑过迁移」而抢着跑，输家报 `table ... already exists`。
 * drizzle 的 sqlite migrator 把所有迁移放在一个事务里，失败会整体回滚，
 * 所以直接重试是安全的：重试时已经能看到赢家写下的 __drizzle_migrations。
 */
function migrateWithRetry(db: ReturnType<typeof drizzle>, folder: string): void {
  for (let i = 0; ; i++) {
    try {
      migrate(db, { migrationsFolder: folder });
      return;
    } catch (e) {
      if (i >= 20) throw e;
      sleep(150);
    }
  }
}

function open() {
  const file = process.env.DATABASE_PATH ?? "./data/boc.db";
  // turbopackIgnore：数据目录来自环境变量，不需要被打包器 trace
  fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(/* turbopackIgnore: true */ file), { recursive: true });
  fs.mkdirSync(/* turbopackIgnore: true */ path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR ?? "./data/uploads"), {
    recursive: true,
  });
  const sqlite = new Database(file, { timeout: 15000 });
  // busy_timeout 要在切换 WAL 之前设，否则 next build 的多个 worker 会同时抢锁
  sqlite.pragma("busy_timeout = 15000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrateWithRetry(db, path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle"));
  // 用 BEGIN IMMEDIATE 串行化，next build 会起多个 worker 同时打开这个库
  const seed = sqlite.transaction(() => {
    seedOwner(db);
    seedAchievements(db); // 正式成就清单，不受 SEED_DEMO 控制
    if (process.env.SEED_DEMO === "1") seedDemo(db);
  });
  seed.immediate();
  return db;
}

type DB = ReturnType<typeof open>;
const g = globalThis as unknown as { __bocDb?: DB };
export const db: DB = g.__bocDb ?? (g.__bocDb = open());
export { schema };

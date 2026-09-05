@AGENTS.md

# BOC · 项目约定

苏黎世《血染钟楼》桌游群管理网站。Next.js 16（App Router）+ Drizzle + better-sqlite3。
界面简体中文、移动端优先（主要在微信内置浏览器里打开）。
**玩家不登录，昵称即身份；只有管理员登录。**

需求见 `docs/requirements.md`，架构见 `docs/architecture.md`。

## 命令

```bash
npm run dev              # 开发；SEED_DEMO=1 npm run dev 载入演示数据
npm run build            # 生产构建（output: standalone）
npm run lint             # eslint
npm test                 # vitest（接龙解析、日期）
npx tsc --noEmit         # 类型检查
npx drizzle-kit generate # 改完 schema 生成迁移
```

## 目录

| 路径 | 内容 |
|---|---|
| `src/app/` | 页面。公开页 + `admin/` 后台 |
| `src/actions/` | Server Actions，按领域分文件（polls / events / signups / games / achievements / admin / players） |
| `src/lib/` | `auth` 会话、`players` 昵称匹配、`jielong` 接龙解析（纯函数）、`dates`、`labels` 中文映射、`queries` 读查询、`rate-limit`、`form` FormData 工具 |
| `src/db/` | `schema.ts`（数据模型权威定义）、`index.ts`（连接 + 迁移 + seed）、`seed.ts` |
| `drizzle/` | 迁移文件，**要提交进 git** |
| `deploy/` | compose、nginx site、部署说明 |

## 规矩

- **改了 `src/db/schema.ts` 一定要跑 `npx drizzle-kit generate` 并提交 `drizzle/` 下的新文件**，
  容器启动时会自动执行迁移。迁移只增不减，保持向前兼容。
- 每个管理类 Server Action 首行 `await requireAdmin()`（owner 专属的用 `requireOwner()`）。
  `src/proxy.ts` 只负责把没 cookie 的 `/admin/*` 弹到登录页，不是权限校验。
- 公开写操作（报名、填时间、宣告成就、记录游戏）首行 `await assertWriteRate(...)`。
- 用户输入的昵称一律走 `findOrCreatePlayer()`：去空格、忽略大小写、匹配别名。
- 写完数据 `revalidatePath()`，出错用 `redirect(withMsg(path, 消息))` 回到页面顶部的提示条
  （页面用 `<Flash err={sp.err} ok={sp.ok} />` 渲染）。
- 所有用户可见文案用简体中文。
- `data/`、`.env` 不进 git。

## Next 16 注意点

- 页面的 `params` / `searchParams` 是 Promise，要 `await`；`cookies()` / `headers()` 是 async。
- 中间件文件是 `src/proxy.ts`，导出 `proxy` 函数（不是 `middleware.ts`）。中间件里**不要**
  import `@/lib/auth`，会把 better-sqlite3 带进去；cookie 名在那边是硬编码的常量。
- 根 layout 里 `export const dynamic = "force-dynamic"`，全站按需渲染（都要读数据库）。
- `next build` 会起多个 worker 同时打开 SQLite，所以 `src/db/index.ts` 里先设 `busy_timeout`
  再切 WAL，seed 用 `BEGIN IMMEDIATE` 事务串行化。
- eslint 的 `react-hooks/set-state-in-effect` 会拦 effect 里直接 setState：读 localStorage
  用 `src/components/useNickname.ts` 里的 `useSyncExternalStore` 封装。
- 不装 UI 组件库。样式是 Tailwind v4 + `src/app/globals.css` 里的 `.btn/.card/.input/.badge`。

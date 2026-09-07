@AGENTS.md

# BOC · 项目约定

苏黎世《血染钟楼》桌游群管理网站。Next.js 16（App Router）+ Drizzle + better-sqlite3。
界面简体中文、移动端优先（主要在微信内置浏览器里打开）。
**参加活动不需要账号，昵称即身份。** 注册是可选的：绑定玩家档案、看自己的记录、自助管理别名。
账号角色 `member` / `admin` / `owner` 都在 `users` 表里，member 没有任何管理权限。

需求见 `docs/requirements.md`，架构见 `docs/architecture.md`。

## 长期设计约束：仓库自包含

**目标状态**：在一台只装了 Docker 的干净机器上，`git clone` + 拷一份 `data/` 目录 +
`docker compose up -d`，整站（含 TLS）就能跑起来，**不需要任何手工的宿主机配置步骤**。
判断标准就这一句话，新写的东西都拿它衡量。

由此推出两条硬规矩：

1. **不要新增宿主机依赖。** 需要一个新组件（反代、定时任务、队列、缓存）时，
   在 `deploy/docker-compose.yml` 里加服务，配置文件放进仓库，而不是叫人去宿主机
   `apt install` 或手改 `/etc` 下的文件。定时任务同理——宁可在容器里跑，也不要写进宿主机 crontab。
2. **不要硬编码环境。** 路径、域名、端口一律走环境变量（见 `deploy/.env.example`）。
   代码里出现 `/opt/...`、具体域名或 IP，都是 bug。

**当前欠的债**（这几项还在宿主机上，换机器时要手工重做一遍）：

| 欠的东西 | 现在在哪 | 打算怎么还 |
|---|---|---|
| nginx 反向代理 | `/etc/nginx/sites-enabled/` | compose 里加 Caddy，自动申请与续期证书 |
| Let's Encrypt 证书与续期 | `/etc/letsencrypt/` | 同上，Caddy 接管后这块整个消失 |
| 续期后 reload nginx 的 hook | `/etc/letsencrypt/renewal-hooks/deploy/` | 同上 |
| 每日备份 | 宿主机 root crontab | 放进容器，或加一个只跑备份的 sidecar |

现网那台机器的 80/443 被既有 nginx 占着，还跑着别的服务，硬塞一层反代进去
风险大于收益，所以**暂时不动**，维持现状。等真要换机器时再切到自包含版本。
在那之前，别为了"跟现状一致"而给这四项之外再添新的宿主机依赖。


## 命令

```bash
npm run dev              # 开发；SEED_DEMO=1 npm run dev 载入演示数据
npm run build            # 生产构建（output: standalone）
npm run lint             # eslint
npm test                 # vitest（接龙解析、剧本 JSON 解析）
npx tsc --noEmit         # 类型检查
npx drizzle-kit generate # 改完 schema 生成迁移
npm run gen:achievements # 改完 docs/achievements.tsv 重新生成成就数据
```

## 目录

| 路径 | 内容 |
|---|---|
| `src/app/` | 页面。`(play)/` 功能站（公开页 + `admin/` 后台）、`www/` 社团主页，两站按 Host 分流 |
| `src/actions/` | Server Actions，按领域分文件（polls / events / signups / games / achievements / files / account / players） |
| `src/lib/` | `auth` 会话、`players` 昵称匹配、`jielong` 接龙解析（纯函数）、`dates`、`labels` 中文映射、角色 emoji、稀有度与鸽子判定、`queries` 读查询、`storage` 上传落盘、`script-json` 剧本解析、`rate-limit`、`form` FormData 工具、`hosts` 两站域名判定、`urls` 跨站链接 |
| `src/db/` | `schema.ts`（数据模型权威定义）、`index.ts`（连接 + 迁移 + seed）、`seed.ts`、`achievements-data.ts`（自动生成，别手改） |
| `scripts/` | `gen-achievements.ts`（TSV → 成就种子）、`backup.sh` / `restore.sh`（VPS 上跑） |
| `drizzle/` | 迁移文件，**要提交进 git** |
| `deploy/` | compose、nginx site、部署说明 |

## 规矩

- **改了 `src/db/schema.ts` 一定要跑 `npx drizzle-kit generate` 并提交 `drizzle/` 下的新文件**，
  容器启动时会自动执行迁移。迁移只增不减，保持向前兼容。
- **成就数据的权威是数据库，不是 TSV**。`docs/achievements.tsv` 和它生成的
  `src/db/achievements-data.ts` 只是**空库首次导入**用的种子（`seedAchievements()` 只在
  `achievements` 表为空时写入，不受 `SEED_DEMO` 控制）。库一旦有数据，改成就就走
  `/admin/achievements` 后台，或者在生产库上直接 SQL 改——改 TSV 对已有的库没有任何作用。
  仍然要维护 TSV 的场景只有一个：将来重建空库时种子得是对的。改了 TSV 记得跑
  `npm run gen:achievements` 并把生成的 TS 一起提交，生成的文件别手改。
- 上传的文件在 `UPLOAD_DIR`（默认 `./data/uploads`），路径是 `{活动 id}/{uuid}.{ext}`，
  永远不用用户给的文件名做路径。图片上传要过 sharp（去 EXIF + 缩略图），类型按 magic bytes 判断。
  改上传大小上限时，`next.config.ts` 的 `serverActions.bodySizeLimit` 和 nginx 的
  `client_max_body_size` 要一起改。
- 每个管理类 Server Action 首行 `await requireAdmin()`（owner 专属的用 `requireOwner()`）。
  `src/proxy.ts` 只负责按 Host 分流 + 把没 cookie 的 `/admin/*` 弹到登录页，不是权限校验。
- **两个域名跑同一个应用**：`www.zurich-boca.party` 是社团主页（`src/app/www/`，proxy 给它加
  `/www` 前缀，地址栏看不见），`play.zurich-boca.party` 是功能站（`src/app/(play)/`，路径原样）。
  跨站链接走 `src/lib/urls.ts` 的 `wwwUrl()` / `playUrl()`，别硬编码域名；域名常量在
  `src/lib/hosts.ts`。本地开发用 `www.localhost:3000` / `play.localhost:3000`。
- 公开写操作（报名、填时间、宣告成就、记录游戏）首行 `await assertWriteRate(...)`。
- 用户输入的昵称一律走 `findOrCreatePlayer()`：去空格、忽略大小写、匹配别名。
- 「鸽」的判定统一走 `src/lib/labels.ts` 的 `isNoShow(row)`，它接一整行报名记录
  （`signup` / `attended` / `status` / `noShowWaived`），不要在页面里自己拼条件。
  本人取消报名是 `status='cancelled'`，**记录保留、照样算鸽**，管理员可以 `no_show_waived=1` 免掉。
- 「剧本投票」（`script_polls` / `script_poll_options` / `script_poll_votes`）定的是**玩哪个本**，
  挂在活动下，入口在活动详情页；和「时间投票」是两回事，文案别混。多选、可改票
  （同一昵称再投覆盖上一次）、结果全程公开、管理员可锁定并标记最终选定。
- 「时间投票」是活动日期定下来之前的可用时段调查（旧文案叫「预填」，已废弃，别再用这个词）；
  日期定下来之后那一步才叫「报名」。
- 写完数据 `revalidatePath()`，出错用 `redirect(withMsg(path, 消息))` 回到页面顶部的提示条
  （页面用 `<Flash err={sp.err} ok={sp.ok} />` 渲染）。
- 所有用户可见文案用简体中文。
- `data/`、`.env` 不进 git。

## Next 16 注意点

- 页面的 `params` / `searchParams` 是 Promise，要 `await`；`cookies()` / `headers()` 是 async。
- 中间件文件是 `src/proxy.ts`，导出 `proxy` 函数（不是 `middleware.ts`）。中间件里**不要**
  import `@/lib/auth`，会把 better-sqlite3 带进去；cookie 名在那边是硬编码的常量。
  它只能 import `@/lib/hosts` 这种纯字符串逻辑的文件。
- 根 layout 里 `export const dynamic = "force-dynamic"`，全站按需渲染（都要读数据库）。
- `next build` 会起多个 worker 同时打开 SQLite，所以 `src/db/index.ts` 里先设 `busy_timeout`
  再切 WAL，seed 用 `BEGIN IMMEDIATE` 事务串行化。
- Turbopack 会对「路径来自环境变量」的 `fs` / `path` 调用报 *Dynamic filesystem access* 警告，
  而它的代码框高亮器碰到中文注释会 panic，直接把 `next build` 打挂。`src/lib/storage.ts` 和
  `src/db/index.ts` 里那些 `/* turbopackIgnore: true */` 就是为了这个，别删。
- 空库时多个 build worker 会抢着跑迁移，`src/db/index.ts` 的 `migrateWithRetry()` 负责兜底重试。
- eslint 的 `react-hooks/set-state-in-effect` 会拦 effect 里直接 setState：读 localStorage
  用 `src/components/useNickname.ts` 里的 `useSyncExternalStore` 封装。
- 不装 UI 组件库。样式是 Tailwind v4 + `src/app/globals.css` 里的 `.btn/.card/.input/.badge`。
- **功能站支持深浅色切换**（自动 / 深色 / 浅色，右上角 `ThemeToggle`，存 localStorage）；
  **社团主页固定深色**（hero 是暗色夜景）。根 layout 按 Host 在 `<html>` 上打
  `data-site="play|www"`，浅色的 CSS 变量只在 `data-site="play"` 下生效；
  手动选择由 `src/lib/theme.ts` 的 `THEME_INIT` 在 hydration 前写 `data-theme`，
  所以根 layout 的 `<html>` 上有 `suppressHydrationWarning`，别删。颜色一律用 `globals.css` 的语义 token：
  底 `bg-bg` / `bg-surface` / `bg-surface-2`，描边 `border-line` / `border-line-strong`，
  文字 `text-ink` / `text-ink-2` / `text-muted` / `text-faint`，血色 `text-brand-bright` /
  `bg-brand-soft` / `border-brand-line`，状态 `ok` / `warn` / `danger`，稀有度
  `rare` / `epic` / `legend`。**别再写 `bg-white`、`text-stone-*` 这类固定色**。
  标题用 `.display` / `.page-title`（系统衬线栈，不加载字体文件），配 `.eyebrow` 小字英文。
- 角色图标是官方美术，放在 `public/roles/<英文 id>.webp`（trim 掉留白后统一 128px）。
  中文角色名 → 英文 id 的映射在 `src/lib/roles.ts`，页面里用 `<RoleIcon role=... />`，
  别再往界面上写角色 emoji。导航图标用 `<NavIcon>` 的线图，同样不用 emoji。
- 成就卡（`src/components/AchievementCard.tsx`）的颜色全部来自卡片根节点上的
  `data-skin` / `data-rarity`，组件里不写死颜色。**加皮肤只要在 `globals.css` 里加一个
  `[data-skin="xxx"]` 块**，再往 `src/lib/skins.ts` 的 `SKINS` / `SKIN_LABEL` 各加一条，
  组件和页面都不用动。皮肤优先级：URL 的 `?skin=`（预览、分享）> 账号里的
  `users.card_skin`（个人中心里选）> 默认 `gothic`。
- 移动端底部 tab bar 是 `BottomNav`，桌面（`lg` 起）换成 `SideNav` 左侧栏，导航项在
  `src/components/nav-items.ts` 里共用一份。列表和成就墙在桌面上要铺成多列，别留大片空白。
- 首页 hero 图在 `public/hero/`（webp，三档尺寸，窄屏用 portrait 裁切）。`src/proxy.ts` 的
  matcher 排掉了带扩展名的路径，否则 www 上的静态资源会被 rewrite 成 `/www/...` 而 404。

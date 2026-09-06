# BOC · 苏黎世血染钟楼桌游群管理

> 一个给苏黎世《血染钟楼》（Blood on the Clocktower）桌游群用的小型管理网站：记录每周活动的出席情况、保存板子图片与剧本 JSON、维护成就墙。

站点部署在 `https://play.zurich-boca.party`。

**设计约束**：这个仓库的长期目标是**自包含**——在一台只装了 Docker 的干净机器上，
`git clone` + 拷一份 `data/` 目录 + `docker compose up -d` 就能把整站（含 TLS）跑起来，
不需要任何手工的宿主机配置。当前还差反向代理、证书和备份定时任务这几项，
详见 [docs/architecture.md](docs/architecture.md) 的第 0 节。

## 文档

| 文档 | 说明 |
|---|---|
| [docs/requirements.md](docs/requirements.md) | 需求文档（PRD）：用户角色、功能范围、验收标准、待澄清问题 |
| [docs/architecture.md](docs/architecture.md) | 技术架构：选型对比、技术栈、数据模型、部署与备份方案 |

## 当前状态

- [x] 需求与架构设计（v0.3）
- [x] 原型：时间预填 / 活动与报名 / 接龙导入 / 出席 / 游戏记录 / 成就墙 / 管理员
- [x] 文件上传：板子图片（sharp 去 EXIF + 缩略图）、剧本 JSON（解析剧本名 / 作者 / 角色数）
- [x] 成就真实清单：55 条，按角色分组，稀有度 1–5 星（数据源 `docs/achievements.tsv`）
- [ ] MVP 剩余：剧本角色字典、管理员申请审批、审计日志、备份脚本
- [ ] 第二期：游戏 log、统计（出勤率、鸽子榜、角色胜率）、成就自动判定

## 本地开发

```bash
cp .env.example .env
npm install
npm run dev              # http://localhost:3000
```

首次启动会自动建库（`./data/boc.db`）、跑迁移，并按 `.env` 里的
`OWNER_USERNAME` / `OWNER_PASSWORD` 创建初始管理员。

成就清单（`docs/achievements.tsv`）是正式数据，空库启动时自动写入。
想额外来一份演示数据（约 15 个玩家、一次进行中的预填、两场已结束的活动和几局游戏、两条待确认的成就宣告）：

```bash
SEED_DEMO=1 npm run dev
```

演示数据只在 `players` 表为空时写入；想重新来一次就删掉 `data/` 再启动。

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` / `npm start` | 生产构建与启动 |
| `npm run lint` | ESLint |
| `npm test` | Vitest（接龙解析、日期） |
| `npx drizzle-kit generate` | 改完 `src/db/schema.ts` 后生成迁移 |

部署到 VPS 见 [deploy/README.md](deploy/README.md)。

## 声明

本项目是玩家自发维护的非官方工具，与 The Pandemonium Institute 无关。《血染钟楼》及相关角色、图片版权归其所有者。

# 部署（VPS + Docker Compose + 宿主机 nginx）

目标：`https://boc.example.com`，经 Cloudflare 代理，复用 VPS 上已有的 nginx 和 Cloudflare Origin 证书。
应用容器只监听 `127.0.0.1:3100`，不直接对外。

## 一、首次部署

### 1. Cloudflare DNS

在 `example.com` 里加一条记录：

| 类型 | 名称 | 内容 | 代理状态 |
|---|---|---|---|
| A | `boc` | VPS 的 IP | **已代理（橙云）** |

必须开橙云，否则 Cloudflare Origin 证书不被浏览器信任。

### 2. 拉代码

```bash
sudo mkdir -p /opt/boc && sudo chown "$USER" /opt/boc
git clone https://github.com/guoyumin/boc.git /opt/boc
cd /opt/boc/deploy
cp .env.example .env
$EDITOR .env          # 至少改 OWNER_PASSWORD
mkdir -p data         # SQLite 和上传目录挂在这里
sudo chown -R 1000:1000 data   # 容器内以 node(uid 1000) 运行，否则报 unable to open database file
```

`.env` 里的 `OWNER_USERNAME` / `OWNER_PASSWORD` 只在**数据库里一个管理员都没有**的时候用来创建初始管理员，
之后改这两个值不会改密码（改密码在网站的 `/admin/password`）。

### 3. nginx

```bash
sudo cp /opt/boc/deploy/nginx/boc.example.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/boc.example.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

证书路径按现有站点：`/etc/ssl/cloudflare/example.com.pem` 和 `.key`。

### 4. 起容器

```bash
cd /opt/boc/deploy
docker compose up -d --build
docker compose logs -f app        # 第一次会打印「已创建初始管理员：xxx」
```

打开 `https://boc.example.com`，用 `/admin/login` 登录初始管理员，先去 `/admin/password` 改一次密码。

## 二、更新

```bash
cd /opt/boc && git pull
cd deploy && docker compose up -d --build
```

数据库迁移在容器启动时自动执行（`drizzle/` 目录跟着镜像走），只增不减，向前兼容。

回滚：

```bash
cd /opt/boc && git checkout <上一个 sha>
cd deploy && docker compose up -d --build
```

## 三、数据与备份

所有数据都在 `/opt/boc/deploy/data/`：

- `boc.db`（外加 `-wal` / `-shm`）
- `uploads/`（文件上传功能在 MVP 阶段补充）

最简单的备份：停容器 → `tar czf boc-$(date +%F).tgz data` → 传走。
不停容器的话用 SQLite 的在线备份：

```bash
cd /opt/boc/deploy
docker compose exec -T app node -e \
  "require('better-sqlite3')('/data/boc.db').backup('/data/backup.db')"
tar czf "backup-$(date +%F).tgz" -C data backup.db uploads
```

恢复：停容器 → 用备份文件覆盖 `data/boc.db` → `docker compose up -d`。

## 四、排查

| 现象 | 看这里 |
|---|---|
| 502 | `docker compose ps`、`docker compose logs app` |
| 证书报错 | Cloudflare 是不是关了橙云；SSL 模式要是 Full (strict) |
| 登录后马上退出 | 浏览器时间 / 容器 `TZ`；cookie 在生产是 `Secure`，必须走 https |
| 数据库锁 | 只跑一个容器实例；SQLite 单写 |

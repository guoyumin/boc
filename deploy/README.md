# 部署（VPS + Docker Compose + 宿主机 nginx）

目标：`https://play.zurich-boca.party`，经 Cloudflare 代理，复用 VPS 上已有的 nginx，证书用 Let's Encrypt。
应用容器只监听 `127.0.0.1:3100`，不直接对外。

## 一、首次部署

### 1. Cloudflare DNS

在 `example.com` 里加一条记录：

`zurich-boca.party` 这个 zone 里加一条记录：

| 类型 | 名称 | 内容 | 代理状态 |
|---|---|---|---|
| CNAME（或 A） | `play` | VPS（`203.0.113.10`） | 已代理（橙云） |

SSL/TLS 模式选 **Full (strict)**。源站是 Let's Encrypt 的真证书，strict 能过。

旧域名 `boc.example.com` 保留成 301 跳转，不要删——微信群里散出去的旧链接还指着它。

### 2. 拉代码

```bash
sudo mkdir -p /opt/boc && sudo chown "$USER" /opt/boc
git clone https://github.com/guoyumin/boc.git /opt/boc
cd /opt/boc/deploy
cp .env.example .env
$EDITOR .env          # 至少改 OWNER_PASSWORD
mkdir -p data/uploads # SQLite 和上传的图片 / 剧本都在这里
sudo chown -R 1000:1000 data   # 容器内以 node(uid 1000) 运行，否则报 unable to open database file
```

`.env` 里的 `OWNER_USERNAME` / `OWNER_PASSWORD` 只在**数据库里一个管理员都没有**的时候用来创建初始管理员，
之后改这两个值不会改密码（改密码在网站的 `/admin/password`）。

### 3. nginx

```bash
# 先放一个只有 HTTP 的临时站点，好让 ACME 校验能落地
sudo tee /etc/nginx/sites-available/play.zurich-boca.party >/dev/null <<'EOF'
server {
    listen 80;
    server_name play.zurich-boca.party;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 200 'bootstrap'; add_header Content-Type text/plain; }
}
EOF
sudo ln -sfn /etc/nginx/sites-available/play.zurich-boca.party /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 签证书（webroot 模式，certbot 会自己装好续期定时器）
sudo certbot certonly --webroot -w /var/www/html -d play.zurich-boca.party \
  --non-interactive --agree-tos --register-unsafely-without-email --no-eff-email

# 换成正式配置（带 443）
sudo cp /opt/boc/deploy/nginx/play.zurich-boca.party.conf /etc/nginx/sites-available/play.zurich-boca.party
sudo cp /opt/boc/deploy/nginx/boc.example.com.conf /etc/nginx/sites-available/boc.example.com
sudo nginx -t && sudo systemctl reload nginx
```

⚠️ **别用 `certbot --nginx`**。这台机器上还跑着 `example.com` 的 别的服务，
`--nginx` 插件会改写既有配置，有波及它的风险。只用 `certonly --webroot`。

证书在 `/etc/letsencrypt/live/play.zurich-boca.party/`，90 天有效，
certbot 的 systemd timer 会自动续。续期靠 80 端口的 `/.well-known/acme-challenge/`，
所以正式配置里那段 location 必须留在 301 跳转之前。

续期成功后还得让 nginx 重新读证书，装一个 deploy hook：

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo cp /opt/boc/deploy/letsencrypt-reload-nginx.sh \
        /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

不装的话 nginx 会一直捧着旧证书直到有人手动 reload，那时候证书早过期了。
验证整条链路：`sudo certbot renew --dry-run`。

### 4. 起容器

```bash
cd /opt/boc/deploy
docker compose up -d --build
docker compose logs -f app        # 第一次会打印「已创建初始管理员：xxx」
```

打开 `https://play.zurich-boca.party`，用 `/login` 登录初始管理员，先去 `/me/password` 改一次密码。

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

## 三、备份（正式运行请务必配上）

```bash
sudo crontab -e
# 加一行：每天 03:00 备份，保留 30 天
0 3 * * * /opt/boc/scripts/backup.sh >> /var/log/boc-backup.log 2>&1
```

恢复某一天的备份：`/opt/boc/scripts/restore.sh 2026-09-05`。
异地副本：装好 rclone 并配好 remote 之后，去掉 `scripts/backup.sh` 里 `rclone sync` 那行的注释。

健康检查：`curl -s localhost:3100/api/health` 应该返回 `{"ok":true,...}`。

## 四、数据目录

所有数据都在 `/opt/boc/deploy/data/`：

- `boc.db`（外加 `-wal` / `-shm`）
- `uploads/{活动 id}/{uuid}.{jpg|png|webp|json}`，图片另有一张 `.thumb.jpg` 缩略图

最简单的备份：停容器 → `tar czf boc-$(date +%F).tgz data` → 传走。
不停容器的话用 SQLite 的在线备份：

```bash
cd /opt/boc/deploy
docker compose exec -T app node -e \
  "require('better-sqlite3')('/data/boc.db').backup('/data/backup.db')"
tar czf "backup-$(date +%F).tgz" -C data backup.db uploads
```

恢复：停容器 → 用备份文件覆盖 `data/boc.db` → `docker compose up -d`。

## 五、排查

| 现象 | 看这里 |
|---|---|
| 502 | `docker compose ps`、`docker compose logs app` |
| 证书报错 | Cloudflare 是不是关了橙云；SSL 模式要是 Full (strict) |
| 登录后马上退出 | 浏览器时间 / 容器 `TZ`；cookie 在生产是 `Secure`，必须走 https |
| 数据库锁 | 只跑一个容器实例；SQLite 单写 |

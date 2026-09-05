#!/usr/bin/env bash
# BOC 每日备份。放在 VPS 上用 cron 跑：
#   0 3 * * * /opt/boc/scripts/backup.sh >> /var/log/boc-backup.log 2>&1
set -euo pipefail

APP_DIR="${BOC_DIR:-/opt/boc}"
DATA_DIR="$APP_DIR/deploy/data"
DEST_DIR="${BOC_BACKUP_DIR:-$APP_DIR/backups}"
KEEP_DAYS="${BOC_BACKUP_KEEP:-30}"
STAMP="$(date +%F)"
OUT="$DEST_DIR/$STAMP"

mkdir -p "$OUT"

# SQLite 在线备份：不停容器也能拿到一致的快照
docker compose -f "$APP_DIR/deploy/docker-compose.yml" exec -T app node -e "
  const db = require('better-sqlite3')('/data/boc.db', { readonly: true });
  Promise.resolve(db.backup('/data/backup.db')).then(
    () => process.exit(0),
    (e) => { console.error(e); process.exit(1); },
  );
"

cp "$DATA_DIR/backup.db" "$OUT/boc.db"
rm -f "$DATA_DIR/backup.db"

# 上传的板子图片和剧本 JSON
if [ -d "$DATA_DIR/uploads" ]; then
  tar czf "$OUT/uploads.tgz" -C "$DATA_DIR" uploads
fi

echo "[boc-backup] $STAMP -> $OUT ($(du -sh "$OUT" | cut -f1))"

# 异地：配好 rclone 之后取消下面这行的注释
# rclone sync "$DEST_DIR" "${BOC_RCLONE_REMOTE:-remote:boc-backups}"

# 清理过期备份
find "$DEST_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+$KEEP_DAYS" -exec rm -rf {} +

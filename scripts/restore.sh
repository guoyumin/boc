#!/usr/bin/env bash
# 从某天的备份恢复。用法：scripts/restore.sh 2026-09-05
set -euo pipefail
[ $# -eq 1 ] || { echo "用法：$0 YYYY-MM-DD"; exit 1; }

APP_DIR="${BOC_DIR:-/opt/boc}"
DATA_DIR="$APP_DIR/deploy/data"
SRC="${BOC_BACKUP_DIR:-$APP_DIR/backups}/$1"
[ -f "$SRC/boc.db" ] || { echo "找不到 $SRC/boc.db"; exit 1; }

read -r -p "会用 $1 的备份覆盖当前数据，确定？输入 yes 继续：" ans
[ "$ans" = "yes" ] || exit 1

docker compose -f "$APP_DIR/deploy/docker-compose.yml" down
rm -f "$DATA_DIR/boc.db" "$DATA_DIR/boc.db-wal" "$DATA_DIR/boc.db-shm"
cp "$SRC/boc.db" "$DATA_DIR/boc.db"
if [ -f "$SRC/uploads.tgz" ]; then
  rm -rf "$DATA_DIR/uploads"
  tar xzf "$SRC/uploads.tgz" -C "$DATA_DIR"
fi
chown -R 1000:1000 "$DATA_DIR"
docker compose -f "$APP_DIR/deploy/docker-compose.yml" up -d
echo "[boc-restore] 已从 $1 恢复"

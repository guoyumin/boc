#!/usr/bin/env bash
# 装到 VPS 的 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh（记得 chmod +x）。
# certbot 续期成功后会跑这个目录下的所有脚本。不加的话 nginx 会一直捧着旧证书，
# 直到有人手动 reload —— 那时候证书早过期了。
set -e
/usr/sbin/nginx -t && /bin/systemctl reload nginx

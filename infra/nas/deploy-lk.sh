#!/bin/sh
# deploy-lk.sh — Light Keepers NAS 端部署守門腳本（O2 / S·A4）
#
# 慣例比照 ST（ST/docs/NAS_OPERATIONS.md）：
#   - 部署副本住 /volume1/Docker/LK/（非 git；開發機 scp/rsync 上來）
#   - load_if_newer：tarball 比現役 image 新才 docker load（冪等、可重跑）
#   - 本腳本是 sudoers 唯一免密白名單候選：
#     NOPASSWD: /bin/sh /volume1/Docker/LK/infra/nas/deploy-lk.sh
#   - 絕不觸碰 st-*/openclaw-*/xxt-agent 既有容器
set -eu

LK_ROOT="${LK_ROOT:-/volume1/Docker/LK}"
COMPOSE="$LK_ROOT/infra/nas/docker-compose.nas.yml"
ENVFILE="$LK_ROOT/infra/nas/.env"
TARBALL="$LK_ROOT/lightkeepers-backend.tar.gz"
IMAGE="${BACKEND_IMAGE:-lightkeepers/backend:local}"

log() { echo "[deploy-lk] $(date '+%F %T') $*"; }

[ -f "$COMPOSE" ] || { log "FATAL: $COMPOSE 不存在"; exit 1; }
[ -f "$ENVFILE" ] || { log "FATAL: $ENVFILE 不存在（cp .env.nas.example 後填值）"; exit 1; }
grep -q "CHANGE_ME" "$ENVFILE" && { log "FATAL: .env 仍有 CHANGE_ME 未填"; exit 1; }

# load_if_newer：tarball 比 image 建立時間新才 load
if [ -f "$TARBALL" ]; then
    tar_time=$(date -r "$TARBALL" +%s)
    img_time=$(docker image inspect "$IMAGE" --format '{{.Created}}' 2>/dev/null \
        | xargs -I{} date -d {} +%s 2>/dev/null || echo 0)
    if [ "$tar_time" -gt "$img_time" ]; then
        log "tarball 較新（$tar_time > $img_time）→ docker load"
        gunzip -c "$TARBALL" | docker load
    else
        log "image 已是最新，跳過 load"
    fi
fi

# 共存防線：列出 LK 以外會佔用的 host port，衝突即擋（8080 為 LK nginx）
for port in 8080; do
    holder=$(docker ps --format '{{.Names}} {{.Ports}}' | grep -v '^lk-' | grep ":$port->" || true)
    [ -n "$holder" ] && { log "FATAL: port $port 被非 LK 容器占用：$holder"; exit 1; }
done

log "compose config 驗證"
docker compose -f "$COMPOSE" --env-file "$ENVFILE" config >/dev/null

log "up -d（只影響 lk-* 服務）"
docker compose -f "$COMPOSE" --env-file "$ENVFILE" up -d

log "完成。驗收：$LK_ROOT/infra/nas/scripts/verify-stack.sh"

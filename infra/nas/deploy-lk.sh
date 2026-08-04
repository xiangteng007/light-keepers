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
    # BusyBox 安全版：映像不存在→img_time=0；解析失敗→數字保底
    #（原寫法映像缺席時 img_time 為空 → [ -gt ] 吐 "sh: bad number" 且誤判已最新跳過 load）
    tar_time=$(date -r "$TARBALL" +%s 2>/dev/null || echo 1)
    img_time=0
    if docker image inspect "$IMAGE" >/dev/null 2>&1; then
        created=$(docker image inspect "$IMAGE" --format '{{.Created}}' 2>/dev/null)
        img_time=$(date -d "$created" +%s 2>/dev/null || echo 0)
    fi
    case "$tar_time" in ''|*[!0-9]*) tar_time=1;; esac
    case "$img_time" in ''|*[!0-9]*) img_time=0;; esac
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

# 資料目錄（root 身分冪等確保；A4 定案路徑）
NVME_ROOT="${NVME_DATA_ROOT:-/volume2/docker/lightkeepers}"
HDD_ROOT="${HDD_BACKUP_ROOT:-/volume1/backup/lightkeepers}"
mkdir -p "$NVME_ROOT/pgdata" "$NVME_ROOT/uploads" "$NVME_ROOT/web" "$HDD_ROOT/db" "$HDD_ROOT/uploads"
chown -R 1000:1000 "$NVME_ROOT/uploads"
chmod 755 "$NVME_ROOT/uploads"

# 前端靜態檔：開發機 scp 到 $LK_ROOT/web-dist，這裡以 root 同步進 web volume
if [ -d "$LK_ROOT/web-dist" ]; then
    log "同步前端靜態檔 → $NVME_ROOT/web"
    rsync -a --delete "$LK_ROOT/web-dist/" "$NVME_ROOT/web/"
fi

log "compose config 驗證"
docker compose -f "$COMPOSE" --env-file "$ENVFILE" config >/dev/null

# 核心棧：postgres → backend → nginx（cloudflared 等 zone Active、backup 等第二副本設定，皆延後）
log "up -d 核心服務（postgres backend nginx）"
docker compose -f "$COMPOSE" --env-file "$ENVFILE" up -d postgres backend nginx

# 自癒：ADM 環境下 dockerd 可能缺 LK bridge 的 MASQUERADE（O3 實測：容器
# 對外全超時、NAT 表無 172.23 規則）。冪等補上——只針對 LK 自己的網段。
NET_ID=$(docker network inspect lightkeepers-nas --format '{{.Id}}' 2>/dev/null | cut -c1-12)
NET_SUBNET=$(docker network inspect lightkeepers-nas --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null)
IPT=""
for c in iptables /usr/builtin/sbin/iptables /usr/sbin/iptables /sbin/iptables; do
    command -v "$c" >/dev/null 2>&1 && { IPT="$c"; break; }
done
if [ -n "$IPT" ] && [ -n "$NET_ID" ] && [ -n "$NET_SUBNET" ]; then
    if ! "$IPT" -t nat -C POSTROUTING -s "$NET_SUBNET" ! -o "br-$NET_ID" -j MASQUERADE 2>/dev/null; then
        "$IPT" -t nat -A POSTROUTING -s "$NET_SUBNET" ! -o "br-$NET_ID" -j MASQUERADE             && log "已補 MASQUERADE：$NET_SUBNET ! -o br-$NET_ID（dockerd 規則缺失自癒）"             || log "WARN: MASQUERADE 補寫失敗（$IPT）"
    fi
else
    [ -z "$IPT" ] && log "WARN: 找不到 iptables，跳過 MASQUERADE 自癒"
fi

log "等 postgres healthy…"
for i in $(seq 1 30); do
    st=$(docker inspect --format '{{.State.Health.Status}}' lk-postgres 2>/dev/null || echo none)
    [ "$st" = healthy ] && break
    sleep 2
done
[ "$st" = healthy ] || { log "FATAL: postgres 未達 healthy（狀態=$st）"; exit 1; }

# baseline migration（O1 產物；dist-only image → 走編譯後 CLI）
log "migration:run（dist/data-source.js）"
docker compose -f "$COMPOSE" --env-file "$ENVFILE" exec -T backend     node node_modules/typeorm/cli.js -d dist/data-source.js migration:run

# 內部煙霧測試
log "煙霧測試（輪詢至 60s——backend 冷啟動需時）"
live=0
for i in $(seq 1 12); do
    curl -sf http://127.0.0.1:8080/api/v1/health/live >/dev/null 2>&1 && { live=1; break; }
    sleep 5
done
[ "$live" = 1 ] && log "OK  health/live" || { log "FAIL health/live（60s 內未起）"; exit 1; }
curl -sf http://127.0.0.1:8080/api/v1/health/ready >/dev/null && log "OK  health/ready" || log "WARN health/ready 未過（看 backend logs）"
curl -sf -o /dev/null http://127.0.0.1:8080/ && log "OK  前端首頁" || log "WARN 前端首頁未過"
tables=$(docker exec lk-postgres psql -U "$(grep ^DB_USERNAME "$ENVFILE" | cut -d= -f2)" -d "$(grep ^DB_DATABASE "$ENVFILE" | cut -d= -f2)" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo 0)
log "schema 表數：$tables（baseline 預期 ≥123）"

# 診斷模式：touch $LK_ROOT/.diag 後重跑即輸出容器內網路實測（用畢自刪旗標）
if [ -f "$LK_ROOT/.diag" ]; then
    log "=== DIAG：容器內對外連通實測 ==="
    LLM_HOST=$(grep ^LLM_BASE_URL "$ENVFILE" | sed 's#.*//##; s#[:/].*##')
    log "LLM host: $LLM_HOST"
    docker compose -f "$COMPOSE" --env-file "$ENVFILE" exec -T backend sh -c "wget -qO- -T 4 http://$LLM_HOST:11434/v1/models 2>&1 | head -c 120; echo; echo exit=\$?" || true
    docker compose -f "$COMPOSE" --env-file "$ENVFILE" exec -T backend sh -c "wget -qO- -T 4 http://1.1.1.1 2>&1 | head -c 60; echo; echo inet-exit=\$?" || true
    iptables -t nat -S POSTROUTING 2>/dev/null | grep -E "172\.2[0-9]|MASQ" | head -6
    docker network inspect lightkeepers-nas --format "{{range .IPAM.Config}}{{.Subnet}}{{end}}" 2>/dev/null
    rm -f "$LK_ROOT/.diag"
fi

log "完成。完整驗收：$LK_ROOT/infra/nas/scripts/verify-stack.sh"

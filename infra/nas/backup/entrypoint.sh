#!/bin/sh
# =============================================================================
# 備份排程迴圈（INF-1 / 工作項 M.1）
#
# 為什麼不用 crond：ADM 的 host 排程與容器生命週期分離，容器被移除後排程會變
# 成打不到目標的孤兒。改用容器內常駐迴圈，排程與棧同生共死，狀態也能從
# `docker compose ps` / healthcheck 直接看到。
#
# 環境變數：
#   BACKUP_AT              每日執行時間 HH:MM（容器時區 = TZ），預設 03:30
#   BACKUP_RETENTION_DAYS  保留天數，預設 14
#   BACKUP_RUN_ON_START    設為 true 時啟動後先跑一次（首次部署／演練用）
#
# 手動觸發一次（不必等到排程時間）：
#   docker compose -f docker-compose.nas.yml exec backup /usr/local/bin/backup.sh
#
# 只補推第二副本（例：Mac mini 修好後）：
#   docker compose -f docker-compose.nas.yml exec backup /usr/local/bin/replicate.sh
# =============================================================================
set -eu

BACKUP_AT="${BACKUP_AT:-03:30}"
BACKUP_DIR="${BACKUP_DIR:-/backup}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [scheduler] $*"; }

case "$BACKUP_AT" in
    [0-2][0-9]:[0-5][0-9]) ;;
    *) log "FATAL: BACKUP_AT 格式錯誤（需為 HH:MM）：$BACKUP_AT"; exit 1 ;;
esac

mkdir -p "$BACKUP_DIR"

# 心跳檔先建起來，避免 healthcheck 在第一次備份前就把容器判成不健康
[ -f "$BACKUP_DIR/.heartbeat" ] || date > "$BACKUP_DIR/.heartbeat"

log "備份排程啟動：每日 $BACKUP_AT（TZ=${TZ:-UTC}），保留 ${BACKUP_RETENTION_DAYS:-14} 天"

if [ "${BACKUP_RUN_ON_START:-false}" = "true" ]; then
    log "BACKUP_RUN_ON_START=true，先執行一次"
    /usr/local/bin/backup.sh || log "WARN: 啟動時備份失敗，仍繼續排程"
fi

while true; do
    now_epoch=$(date +%s)
    # 今天的排程時刻
    target_epoch=$(date -d "$(date +%Y-%m-%d) $BACKUP_AT" +%s 2>/dev/null || echo "")
    if [ -z "$target_epoch" ]; then
        log "FATAL: 無法解析排程時刻，date 不支援 -d"
        exit 1
    fi
    # 已過今天的時刻就排到明天
    [ "$target_epoch" -le "$now_epoch" ] && target_epoch=$((target_epoch + 86400))

    sleep_sec=$((target_epoch - now_epoch))
    log "下次備份於 $(date -d "@$target_epoch" '+%Y-%m-%d %H:%M:%S')（${sleep_sec}s 後）"
    sleep "$sleep_sec"

    if /usr/local/bin/backup.sh; then
        log "備份完成（含第二副本）"
    else
        # 單日失敗不讓容器退出（否則 restart 迴圈會反覆重跑），
        # 由 healthcheck 的心跳過期偵測負責告警。
        #
        # 注意：非零退出可能來自兩件不同的事——本地 pg_dump 失敗，
        # 或本地成功但第二副本推不出去。兩者的心跳分開（.heartbeat /
        # .replica-heartbeat），跑 healthcheck.sh 會直接說是哪一條。
        log "ERROR: 備份流程有步驟失敗，等待下一個排程週期（跑 healthcheck.sh 看是哪一段）"
    fi
done

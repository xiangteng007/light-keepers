#!/bin/sh
# =============================================================================
# 每日備份：pg_dump + uploads rsync → HDD RAID 6（INF-1 / 工作項 M.1）
#
# 產出（皆位於 /backup，對應 host 的 ${HDD_BACKUP_ROOT}）：
#   /backup/db/lightkeepers-YYYYMMDD-HHMMSS.dump      pg_dump custom format
#   /backup/db/lightkeepers-YYYYMMDD-HHMMSS.dump.sha256
#   /backup/uploads/current/                          最新一份 uploads 鏡像
#   /backup/uploads/YYYYMMDD-HHMMSS/                  當日快照（硬連結，不佔額外空間）
#   /backup/backup.log                                累積日誌
#   /backup/.heartbeat                                成功時間戳（healthcheck 讀）
#
# 冪等性：同一天多次執行只會多產出以時間戳命名的檔案，不會破壞既有備份。
# 保留策略：超過 BACKUP_RETENTION_DAYS 天的 dump 與 uploads 快照會被刪除；
#           uploads/current 永遠保留（它是最新鏡像，不是快照）。
# =============================================================================
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backup}"
SOURCE_UPLOADS="${SOURCE_UPLOADS:-/source/uploads}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

DB_DIR="$BACKUP_DIR/db"
UPLOADS_DIR="$BACKUP_DIR/uploads"
LOG_FILE="$BACKUP_DIR/backup.log"
STAMP="$(date '+%Y%m%d-%H%M%S')"

log() {
    msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

fail() { log "ERROR: $*"; exit 1; }

mkdir -p "$DB_DIR" "$UPLOADS_DIR"

log "=== 備份開始（保留 ${RETENTION_DAYS} 天）==="

# --- 前置檢查：備份目的地必須真的是掛載進來的 HDD 池 ---------------------------
# 若 HDD 掛載失敗，容器仍會自己在 overlay 上建出 /backup，備份就會悄悄寫進
# 容器層並在重建時蒸發。用可寫性 + 剩餘空間當作最低限度的健全性檢查。
touch "$BACKUP_DIR/.writetest" 2>/dev/null || fail "備份目錄不可寫：$BACKUP_DIR"
rm -f "$BACKUP_DIR/.writetest"

avail_kb=$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print $4}')
if [ -n "$avail_kb" ] && [ "$avail_kb" -lt 5242880 ]; then
    log "WARN: 備份池剩餘空間不足 5GB（${avail_kb}KB），請儘速處理"
fi

# --- 1. 資料庫 ---------------------------------------------------------------
DUMP_FILE="$DB_DIR/${PGDATABASE:-lightkeepers}-${STAMP}.dump"
TMP_FILE="${DUMP_FILE}.partial"

log "pg_dump → $DUMP_FILE"
# custom format（-Fc）：可平行還原、可選擇性還原單表，且內建壓縮
if pg_dump --format=custom --compress=6 --no-owner --no-privileges --file="$TMP_FILE"; then
    mv "$TMP_FILE" "$DUMP_FILE"
else
    rm -f "$TMP_FILE"
    fail "pg_dump 失敗"
fi

# 還原前可用 sha256sum -c 驗證，避免還原到已損毀的 dump
sha256sum "$DUMP_FILE" > "${DUMP_FILE}.sha256"

dump_size=$(du -h "$DUMP_FILE" | cut -f1)
log "pg_dump 完成：$dump_size"

# 空 dump 幾乎必然代表出錯（權限或連錯 DB）
dump_bytes=$(stat -c %s "$DUMP_FILE")
[ "$dump_bytes" -gt 1024 ] || fail "dump 檔過小（${dump_bytes} bytes），疑似備份失敗"

# --- 2. uploads ---------------------------------------------------------------
if [ -d "$SOURCE_UPLOADS" ]; then
    log "rsync uploads → $UPLOADS_DIR/current"
    mkdir -p "$UPLOADS_DIR/current"

    # --delete：讓 current 是來源的忠實鏡像
    # --link-dest 由下方快照使用；current 本身走一般同步
    rsync -a --delete --human-readable \
        "$SOURCE_UPLOADS/" "$UPLOADS_DIR/current/" \
        || fail "uploads rsync 失敗"

    # 當日快照：以硬連結指向 current，未變動的檔案不佔額外空間
    SNAPSHOT="$UPLOADS_DIR/$STAMP"
    if [ ! -d "$SNAPSHOT" ]; then
        cp -al "$UPLOADS_DIR/current" "$SNAPSHOT" 2>/dev/null \
            || log "WARN: 硬連結快照失敗（檔案系統可能不支援），略過本次快照"
    fi

    uploads_size=$(du -sh "$UPLOADS_DIR/current" | cut -f1)
    log "uploads 同步完成：$uploads_size"
else
    log "WARN: 來源 uploads 目錄不存在，略過：$SOURCE_UPLOADS"
fi

# --- 3. 保留策略 --------------------------------------------------------------
log "清理超過 ${RETENTION_DAYS} 天的備份"

deleted_dumps=$(find "$DB_DIR" -maxdepth 1 -type f -name '*.dump*' -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)

deleted_snaps=0
for snap in "$UPLOADS_DIR"/*; do
    [ -d "$snap" ] || continue
    base=$(basename "$snap")
    [ "$base" = "current" ] && continue
    # 只動符合時間戳命名的目錄，避免誤刪人工放的東西
    case "$base" in
        [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]) ;;
        *) continue ;;
    esac
    if [ -n "$(find "$snap" -maxdepth 0 -mtime "+${RETENTION_DAYS}")" ]; then
        rm -rf "$snap"
        deleted_snaps=$((deleted_snaps + 1))
    fi
done

log "已刪除 ${deleted_dumps} 個過期 dump 檔、${deleted_snaps} 個過期快照"

# --- 4. 心跳 -----------------------------------------------------------------
date > "$BACKUP_DIR/.heartbeat"

remaining=$(find "$DB_DIR" -maxdepth 1 -type f -name '*.dump' | wc -l)
log "=== 備份完成，DB 備份份數：${remaining} ==="

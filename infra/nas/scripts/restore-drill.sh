#!/usr/bin/env bash
# =============================================================================
# 備份還原演練（INF-1 驗收項：「演練『從備份完整還原』一次」）
#
# 演練原則：**絕不動到生產資料庫**。
# 本腳本另起一個臨時 postgres 容器，把備份還原進去後做驗證，最後拆掉。
# 生產棧全程不受影響，因此可以在任何時間安全執行，建議每季一次。
#
# 檢查項目：
#   1. 備份檔存在且 sha256 通過
#   2. 能在乾淨的 PostGIS 容器上完整還原
#   3. 還原後的表數／row count 與線上一致（容許演練期間的自然增長）
#   4. uploads 備份的檔案數與線上一致
#   5. 記錄 RTO（實際還原耗時）
#
# 兩種來源（--source，CD-6 / 工作項 C1.3）：
#   primary   （預設）從 NAS 的 HDD RAID 6 池還原。驗證「備份本身是好的」。
#   secondary 從第二副本（Mac mini / 加密雲端冷儲存）拉回來再還原。
#             驗證的是完全不同的一件事：**當整台 NAS 不在了，你還救得回來嗎**。
#             primary 演練通過不代表 secondary 通過——金鑰輪換、crypt 密碼記錯、
#             遠端目錄被清空、保留策略誤刪，這些只有真的拉一次才會發現。
#             備份未經還原驗證等於不存在，第二副本尤其如此。
#
# 用法：
#   ./restore-drill.sh --dry-run                  # 只檢查備份存在與完整性
#   ./restore-drill.sh                            # 完整演練（本地最新備份）
#   ./restore-drill.sh --dump-file /backup/db/xxx.dump
#   ./restore-drill.sh --keep                     # 演練後保留臨時容器供人工查驗
#   ./restore-drill.sh --source=secondary         # 跨目標演練（預設走 REPLICA_MODE）
#   ./restore-drill.sh --source=secondary --secondary-mode=rclone
#   ./restore-drill.sh --source=secondary --dry-run   # 只拉回 + 驗 sha256，不還原（快、可常跑）
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$NAS_DIR/docker-compose.nas.yml"
ENV_FILE="$NAS_DIR/.env"

DRY_RUN=false
KEEP=false
DUMP_FILE=""
SOURCE="primary"
SECONDARY_MODE=""
DRILL_CONTAINER="lk-restore-drill"
DRILL_PORT="${DRILL_PORT:-55432}"
STAGE_DIR=""          # 第二副本拉回來的暫存（host 路徑，演練後清掉）

c_reset=$'\033[0m'; c_red=$'\033[31m'; c_yellow=$'\033[33m'; c_green=$'\033[32m'; c_dim=$'\033[2m'
log()  { echo "${c_dim}[$(date '+%H:%M:%S')]${c_reset} $*"; }
ok()   { echo "${c_green}[OK]${c_reset}   $*"; }
warn() { echo "${c_yellow}[WARN]${c_reset} $*"; }
die()  { echo "${c_red}[FAIL]${c_reset} $*" >&2; cleanup; exit 1; }
step() { echo; echo "=== $* ==="; }

cleanup() {
    if ! $KEEP && ! $DRY_RUN; then
        docker rm -f "$DRILL_CONTAINER" >/dev/null 2>&1 || true
    fi
    # 從第二副本拉回的暫存檔會佔掉一份 dump 的空間，演練完就該清掉；
    # --keep 時保留，讓人可以自己再驗一次或留作證據。
    if [[ -n "$STAGE_DIR" && -d "$STAGE_DIR" ]] && ! $KEEP; then
        rm -rf "$STAGE_DIR"
    fi
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)          DRY_RUN=true ;;
        --keep)             KEEP=true ;;
        --dump-file)        DUMP_FILE="${2:?}"; shift ;;
        --env-file)         ENV_FILE="${2:?}"; shift ;;
        --source)           SOURCE="${2:?}"; shift ;;
        --source=*)         SOURCE="${1#*=}" ;;
        --secondary-mode)   SECONDARY_MODE="${2:?}"; shift ;;
        --secondary-mode=*) SECONDARY_MODE="${1#*=}" ;;
        -h|--help)   sed -n '2,/^# ====/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) die "未知參數：$1" ;;
    esac
    shift
done

case "$SOURCE" in
    primary|secondary) ;;
    *) die "--source 需為 primary 或 secondary，收到：$SOURCE" ;;
esac

[[ -f "$ENV_FILE" ]] || die "找不到 $ENV_FILE"
set -a; # shellcheck disable=SC1090
source "$ENV_FILE"; set +a

: "${HDD_BACKUP_ROOT:?HDD_BACKUP_ROOT 未設定}"
: "${DB_DATABASE:?DB_DATABASE 未設定}"
: "${DB_USERNAME:?DB_USERNAME 未設定}"
: "${DB_PASSWORD:?DB_PASSWORD 未設定}"

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

DRILL_START=$(date +%s)
SECONDARY_UPLOADS=""

# --- 0. 第二副本：先拉回來（--source=secondary）--------------------------------
if [[ "$SOURCE" == "secondary" ]]; then
    step "0. 從第二副本拉回（CD-6 跨目標演練）"

    [[ "${REPLICA_ENABLED:-false}" == "true" ]] \
        || die "REPLICA_ENABLED 不是 true——第二副本尚未啟用，沒有東西可演練（見 .env §7.1）"

    mode="${SECONDARY_MODE:-${REPLICA_MODE:-rsync}}"
    [[ "$mode" == "both" ]] && mode="rsync"

    STAGE_DIR="$HDD_BACKUP_ROOT/.drill-stage"
    rm -rf "$STAGE_DIR"; mkdir -p "$STAGE_DIR"

    # 刻意透過 backup 容器執行，而不是在 host 上直接跑 rsync/rclone：
    #   1. 遠端存取邏輯只有一份（replicate.sh），host 與容器不會漂移
    #   2. SSH 私鑰與 rclone.conf 只掛在容器裡，host 上根本不該有第二份
    #   3. ADM 上不一定裝得到 rclone
    # 用 run --rm --no-deps：生產棧沒開也能演練（不會順手把 postgres 拉起來）。
    log "透過 backup 容器從第二副本拉取（mode=$mode）…"
    compose run --rm --no-deps \
        --entrypoint /usr/local/bin/replicate.sh \
        backup --pull /backup/.drill-stage --mode "$mode" \
        || die "第二副本拉取失敗——這代表災難當下你拿不回資料，請立即排查（Mac mini 是否關機／金鑰是否被輪換／雲端憑證是否過期）"

    DUMP_FILE=$(cat "$STAGE_DIR/.pulled-dump" 2>/dev/null | sed "s#^/backup/.drill-stage#$STAGE_DIR#")
    [[ -n "$DUMP_FILE" && -f "$DUMP_FILE" ]] || die "拉取回報成功但暫存目錄沒有 dump：$STAGE_DIR"
    SECONDARY_UPLOADS=$(cat "$STAGE_DIR/.secondary-uploads-count" 2>/dev/null || echo "?")

    ok "已從第二副本（$mode）取回 $(basename "$DUMP_FILE")，遠端 uploads 檔案數：${SECONDARY_UPLOADS}"
fi

# --- 1. 備份完整性 ------------------------------------------------------------
step "1. 備份檔完整性"

if [[ -z "$DUMP_FILE" ]]; then
    DUMP_FILE=$(find "$HDD_BACKUP_ROOT/db" -maxdepth 1 -name '*.dump' -print0 2>/dev/null \
        | xargs -0 ls -t 2>/dev/null | head -1)
fi
[[ -n "$DUMP_FILE" && -f "$DUMP_FILE" ]] || die "找不到備份檔（$HDD_BACKUP_ROOT/db）"

log "使用備份：$DUMP_FILE（$(du -h "$DUMP_FILE" | cut -f1)，$(date -r "$DUMP_FILE" '+%Y-%m-%d %H:%M')）"

if [[ -f "${DUMP_FILE}.sha256" ]]; then
    # 只比對雜湊值本身，不用 `sha256sum -c`：.sha256 內記的檔名可能是產生當下的
    # 容器路徑（/backup/db/...）或第二副本上的路徑，跟現在的位置對不起來，
    # `-c` 會直接報 "No such file or directory" 而不是真的去驗內容。
    expected=$(awk '{print $1; exit}' "${DUMP_FILE}.sha256")
    actual=$(sha256sum "$DUMP_FILE" | awk '{print $1}')
    [[ -n "$expected" ]] || die "${DUMP_FILE}.sha256 內容為空"
    [[ "$expected" == "$actual" ]] \
        || die "sha256 驗證失敗——這份備份已損毀，還原前務必找出原因（期望 $expected，實得 $actual）"
    ok "sha256 通過"
else
    warn "缺少 .sha256（舊備份可能沒有），略過完整性驗證"
fi

# --- 2. 線上基準 --------------------------------------------------------------
step "2. 取得線上基準（唯讀）"

ROWCOUNT_SQL="
SELECT table_name,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT COUNT(*) AS c FROM public.%I', table_name),
                           false, true, '')))[1]::text::bigint
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'spatial_ref_sys'
ORDER BY table_name;
"

LIVE_COUNTS="/tmp/lk-drill-live.tsv"
DRILL_COUNTS="/tmp/lk-drill-restored.tsv"

if compose exec -T postgres psql -U "$DB_USERNAME" -d "$DB_DATABASE" -AtF $'\t' -c "$ROWCOUNT_SQL" > "$LIVE_COUNTS" 2>/dev/null; then
    ok "線上：$(wc -l < "$LIVE_COUNTS") 張表、$(awk -F'\t' '{s+=$2} END {print s+0}' "$LIVE_COUNTS") 筆"
else
    warn "無法讀取線上基準（生產棧未執行？），將只驗證還原本身"
    : > "$LIVE_COUNTS"
fi

if $DRY_RUN; then
    echo
    if [[ "$SOURCE" == "secondary" ]]; then
        ok "dry-run（secondary）：第二副本可連線、可取回、sha256 完整，未執行實際還原"
        echo "   —— 這是最便宜的每月檢查；季度／戰備期的完整演練請拿掉 --dry-run"
    else
        ok "dry-run：備份檔存在且完整，未執行實際還原"
    fi
    exit 0
fi

# --- 3. 起臨時容器並還原 -------------------------------------------------------
step "3. 在臨時容器還原（不碰生產 DB）"

docker rm -f "$DRILL_CONTAINER" >/dev/null 2>&1 || true

log "啟動臨時 PostGIS 容器 $DRILL_CONTAINER（port ${DRILL_PORT}，僅綁 127.0.0.1）"
docker run -d --name "$DRILL_CONTAINER" \
    -e POSTGRES_USER="$DB_USERNAME" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_DATABASE" \
    -p "127.0.0.1:${DRILL_PORT}:5432" \
    postgis/postgis:15-3.3-alpine >/dev/null || die "無法啟動臨時容器"

log "等待容器就緒"
for _ in $(seq 1 60); do
    docker exec "$DRILL_CONTAINER" pg_isready -U "$DB_USERNAME" -d "$DB_DATABASE" >/dev/null 2>&1 && break
    sleep 2
done
docker exec "$DRILL_CONTAINER" pg_isready -U "$DB_USERNAME" -d "$DB_DATABASE" >/dev/null 2>&1 \
    || die "臨時容器 60 秒內未就緒"

RESTORE_START=$(date +%s)
log "pg_restore 中…"
docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DRILL_CONTAINER" \
    pg_restore -U "$DB_USERNAME" -d "$DB_DATABASE" \
    --no-owner --no-privileges --jobs=2 \
    < "$DUMP_FILE" > /tmp/lk-drill-restore.log 2>&1 \
    || warn "pg_restore 有非致命錯誤（詳見 /tmp/lk-drill-restore.log），由下方對帳判定"
RESTORE_SEC=$(( $(date +%s) - RESTORE_START ))
ok "還原耗時 ${RESTORE_SEC} 秒"

# --- 4. 對帳 ------------------------------------------------------------------
step "4. 還原結果對帳"

docker exec -e PGPASSWORD="$DB_PASSWORD" "$DRILL_CONTAINER" \
    psql -U "$DB_USERNAME" -d "$DB_DATABASE" -AtF $'\t' -c "$ROWCOUNT_SQL" > "$DRILL_COUNTS" \
    || die "無法讀取還原後資料"

restored_tables=$(wc -l < "$DRILL_COUNTS")
restored_rows=$(awk -F'\t' '{s+=$2} END {print s+0}' "$DRILL_COUNTS")
ok "還原後：${restored_tables} 張表、${restored_rows} 筆"

[[ "${restored_tables:-0}" -gt 0 ]] || die "還原後沒有任何資料表——這份備份不可用"

if [[ -s "$LIVE_COUNTS" ]]; then
    echo
    printf '%-40s %12s %12s   %s\n' "TABLE" "LIVE" "RESTORED" "DELTA"
    printf '%s\n' "--------------------------------------------------------------------------------"
    problems=0
    while IFS=$'\t' read -r tbl live_n; do
        r_n=$(awk -F'\t' -v t="$tbl" '$1==t {print $2}' "$DRILL_COUNTS")
        if [[ -z "$r_n" ]]; then
            printf '%-40s %12s %12s   %s\n' "$tbl" "$live_n" "-" "${c_red}MISSING${c_reset}"
            problems=$((problems+1))
        else
            delta=$(( live_n - r_n ))
            # 備份是過去某個時點的快照，線上比備份多屬正常；
            # 反過來（還原的比線上多）代表資料曾遺失或備份來源有問題。
            if [[ $delta -lt 0 ]]; then
                printf '%-40s %12s %12s   %s\n' "$tbl" "$live_n" "$r_n" "${c_yellow}+$(( -delta )) 還原較多${c_reset}"
            elif [[ $delta -gt 0 ]]; then
                printf '%-40s %12s %12s   %s\n' "$tbl" "$live_n" "$r_n" "${c_dim}-${delta}（備份後新增）${c_reset}"
            else
                printf '%-40s %12s %12s   %s\n' "$tbl" "$live_n" "$r_n" "${c_green}一致${c_reset}"
            fi
        fi
    done < "$LIVE_COUNTS"
    echo
    [[ $problems -eq 0 ]] && ok "無遺失資料表" || die "${problems} 張表未還原成功"
fi

# --- 5. uploads ---------------------------------------------------------------
step "5. uploads 備份"

if [[ "$SOURCE" == "secondary" && -n "$SECONDARY_UPLOADS" ]]; then
    # 第二副本的 uploads 只比檔案數（把幾十 GB 的附件全拉回來只為了數一次不划算）。
    # 逐檔內容的比對由每日推送後的 rsync --checksum 回驗負責（REPLICA_VERIFY_UPLOADS）。
    ok "第二副本 uploads 檔案數：${SECONDARY_UPLOADS}"
    if [[ -d "$HDD_BACKUP_ROOT/uploads/current" ]]; then
        pri_files=$(find "$HDD_BACKUP_ROOT/uploads/current" -type f | wc -l | tr -d '[:space:]')
        log "主副本 uploads 檔案數：${pri_files}"
        if [[ "${SECONDARY_UPLOADS}" =~ ^[0-9]+$ && "${SECONDARY_UPLOADS}" -lt "${pri_files}" ]]; then
            warn "第二副本比主副本少 $(( pri_files - SECONDARY_UPLOADS )) 個檔案——推送可能中斷過，請查 backup.log"
        fi
    fi
    [[ "${SECONDARY_UPLOADS}" != "0" ]] || warn "第二副本 uploads 為空（若系統本來就沒有附件則屬正常）"
elif [[ -d "$HDD_BACKUP_ROOT/uploads/current" ]]; then
    bak_files=$(find "$HDD_BACKUP_ROOT/uploads/current" -type f | wc -l | tr -d '[:space:]')
    ok "uploads 備份檔案數：${bak_files}"
    if [[ -n "${NVME_DATA_ROOT:-}" && -d "${NVME_DATA_ROOT}/uploads" ]]; then
        live_files=$(find "${NVME_DATA_ROOT}/uploads" -type f | wc -l | tr -d '[:space:]')
        log "線上檔案數：${live_files}（備份時點之後的新檔不在備份中屬正常）"
        [[ "${bak_files:-0}" -gt 0 ]] || die "uploads 備份為空"
    fi
    snaps=$(find "$HDD_BACKUP_ROOT/uploads" -maxdepth 1 -type d -name '20*' | wc -l | tr -d '[:space:]')
    ok "保留快照數：${snaps}（保留策略 ${BACKUP_RETENTION_DAYS:-14} 天）"
else
    warn "尚無 uploads 備份"
fi

# --- 彙總 --------------------------------------------------------------------
DRILL_SEC=$(( $(date +%s) - DRILL_START ))
if [[ "$SOURCE" == "secondary" ]]; then
    SRC_LABEL="第二副本（${SECONDARY_MODE:-${REPLICA_MODE:-rsync}}）—— 整台 NAS 消失也救得回"
else
    SRC_LABEL="主副本（NAS HDD RAID 6）"
fi
echo
echo "================================================"
echo "  ${c_green}還原演練通過${c_reset}"
echo "  來源       ：${SRC_LABEL}"
echo "  備份檔     ：$(basename "$DUMP_FILE")"
echo "  DB 還原 RTO：${RESTORE_SEC} 秒"
echo "  演練總耗時 ：${DRILL_SEC} 秒"
echo "================================================"
echo
echo "請把上述結果填進 docs/RUNBOOK.md §7.3 的演練紀錄表（日期／來源／RTO／執行人）。"
echo "注意：${DRILL_SEC} 秒只是「還原這一步」的時間，不等於 RTO——"
echo "      RTO 還要加上發現故障、決策、備援硬體上線與服務驗證。換算方式見 §7.2。"
if [[ "$SOURCE" == "primary" ]]; then
    echo
    echo "${c_yellow}提醒${c_reset}：本次只驗了主副本。CD-6 要求第二副本也必須經過還原驗證："
    echo "      ./restore-drill.sh --source=secondary"
fi
$KEEP && echo "臨時容器保留中：docker exec -it $DRILL_CONTAINER psql -U $DB_USERNAME -d $DB_DATABASE"
$KEEP || echo "臨時容器已清除。"

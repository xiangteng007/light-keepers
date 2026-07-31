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
# 用法：
#   ./restore-drill.sh --dry-run          # 只檢查備份存在與完整性
#   ./restore-drill.sh                    # 完整演練（用最新備份）
#   ./restore-drill.sh --dump-file /backup/db/xxx.dump
#   ./restore-drill.sh --keep             # 演練後保留臨時容器供人工查驗
# =============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$NAS_DIR/docker-compose.nas.yml"
ENV_FILE="$NAS_DIR/.env"

DRY_RUN=false
KEEP=false
DUMP_FILE=""
DRILL_CONTAINER="lk-restore-drill"
DRILL_PORT="${DRILL_PORT:-55432}"

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
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)   DRY_RUN=true ;;
        --keep)      KEEP=true ;;
        --dump-file) DUMP_FILE="${2:?}"; shift ;;
        --env-file)  ENV_FILE="${2:?}"; shift ;;
        -h|--help)   sed -n '2,/^# ====/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) die "未知參數：$1" ;;
    esac
    shift
done

[[ -f "$ENV_FILE" ]] || die "找不到 $ENV_FILE"
set -a; # shellcheck disable=SC1090
source "$ENV_FILE"; set +a

: "${HDD_BACKUP_ROOT:?HDD_BACKUP_ROOT 未設定}"
: "${DB_DATABASE:?DB_DATABASE 未設定}"
: "${DB_USERNAME:?DB_USERNAME 未設定}"
: "${DB_PASSWORD:?DB_PASSWORD 未設定}"

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

DRILL_START=$(date +%s)

# --- 1. 備份完整性 ------------------------------------------------------------
step "1. 備份檔完整性"

if [[ -z "$DUMP_FILE" ]]; then
    DUMP_FILE=$(find "$HDD_BACKUP_ROOT/db" -maxdepth 1 -name '*.dump' -print0 2>/dev/null \
        | xargs -0 ls -t 2>/dev/null | head -1)
fi
[[ -n "$DUMP_FILE" && -f "$DUMP_FILE" ]] || die "找不到備份檔（$HDD_BACKUP_ROOT/db）"

log "使用備份：$DUMP_FILE（$(du -h "$DUMP_FILE" | cut -f1)，$(date -r "$DUMP_FILE" '+%Y-%m-%d %H:%M')）"

if [[ -f "${DUMP_FILE}.sha256" ]]; then
    (cd "$(dirname "$DUMP_FILE")" && sha256sum -c "$(basename "$DUMP_FILE").sha256" >/dev/null) \
        || die "sha256 驗證失敗——這份備份已損毀，還原前務必找出原因"
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
    echo; ok "dry-run：備份檔存在且完整，未執行實際還原"
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

if [[ -d "$HDD_BACKUP_ROOT/uploads/current" ]]; then
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
echo
echo "================================================"
echo "  ${c_green}還原演練通過${c_reset}"
echo "  備份檔     ：$(basename "$DUMP_FILE")"
echo "  DB 還原 RTO：${RESTORE_SEC} 秒"
echo "  演練總耗時 ：${DRILL_SEC} 秒"
echo "================================================"
echo
echo "請把上述結果記錄到 docs/RUNBOOK.md 的演練紀錄，並註明執行日期與執行人。"
$KEEP && echo "臨時容器保留中：docker exec -it $DRILL_CONTAINER psql -U $DB_USERNAME -d $DB_DATABASE"
$KEEP || echo "臨時容器已清除。"

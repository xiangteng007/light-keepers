#!/usr/bin/env bash
# =============================================================================
# Cloud SQL → NAS PostGIS 資料庫搬遷（INF-1 / 工作項 M.3、M.4 前置）
#
# 流程：
#   1. 連來源（Cloud SQL）盤點各表 row count → 存成對帳基準
#   2. pg_dump（custom format）→ 落到 NAS 本機檔案
#   3. 還原到 NAS 的 PostGIS 容器
#   4. 重新盤點目標端 row count，與基準逐表比對，任何差異即視為失敗
#
# 冪等性：
#   - 同一個 --dump-file 已存在且 sha256 驗證通過時，預設略過 dump 直接還原
#     （加 --force-dump 可強制重抓）
#   - 還原前會確認目標 DB 是空的；非空時必須明確加 --allow-nonempty
#
# 用法：
#   ./migrate-db.sh --dry-run                  # 只印會做什麼，不動任何東西
#   ./migrate-db.sh --dump-only                # 只抓 dump，不還原（可先在離峰抓）
#   ./migrate-db.sh                            # 完整搬遷
#   ./migrate-db.sh --restore-only --dump-file /path/to.dump
#
# 憑證：全部從環境變數／--env-file 讀取，本腳本不含任何憑證。
#   來源：SRC_DB_HOST / SRC_DB_PORT / SRC_DB_USERNAME / SRC_DB_PASSWORD / SRC_DB_DATABASE
#   目標：DB_USERNAME / DB_PASSWORD / DB_DATABASE（透過 compose 的 postgres 容器）
#
# ⚠ Cloud SQL 建議透過 cloud-sql-proxy 連：
#     cloud-sql-proxy --port 5433 <PROJECT>:<REGION>:<INSTANCE>
#   然後 SRC_DB_HOST=127.0.0.1 SRC_DB_PORT=5433
# ⚠ 本腳本會停掉 backend 以避免搬遷期間寫入（--no-stop-backend 可略過）。
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$NAS_DIR/docker-compose.nas.yml"

DRY_RUN=false
DUMP_ONLY=false
RESTORE_ONLY=false
FORCE_DUMP=false
ALLOW_NONEMPTY=false
STOP_BACKEND=true
ENV_FILE="$NAS_DIR/.env"
WORK_DIR="${MIGRATE_WORK_DIR:-/tmp/lk-migrate}"
DUMP_FILE=""

# --- 輸出 --------------------------------------------------------------------
c_reset=$'\033[0m'; c_red=$'\033[31m'; c_yellow=$'\033[33m'; c_green=$'\033[32m'; c_dim=$'\033[2m'
log()  { echo "${c_dim}[$(date '+%H:%M:%S')]${c_reset} $*"; }
ok()   { echo "${c_green}[OK]${c_reset}   $*"; }
warn() { echo "${c_yellow}[WARN]${c_reset} $*"; }
die()  { echo "${c_red}[FAIL]${c_reset} $*" >&2; exit 1; }
step() { echo; echo "=== $* ==="; }

usage() {
    sed -n '2,/^# ====/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 0
}

# --- 參數 --------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)         DRY_RUN=true ;;
        --dump-only)       DUMP_ONLY=true ;;
        --restore-only)    RESTORE_ONLY=true ;;
        --force-dump)      FORCE_DUMP=true ;;
        --allow-nonempty)  ALLOW_NONEMPTY=true ;;
        --no-stop-backend) STOP_BACKEND=false ;;
        --env-file)        ENV_FILE="${2:?--env-file 需要參數}"; shift ;;
        --dump-file)       DUMP_FILE="${2:?--dump-file 需要參數}"; shift ;;
        --work-dir)        WORK_DIR="${2:?--work-dir 需要參數}"; shift ;;
        -h|--help)         usage ;;
        *) die "未知參數：$1（用 --help 看說明）" ;;
    esac
    shift
done

$DRY_RUN && warn "DRY-RUN 模式：不會實際修改任何資料"

# --- 載入設定 ----------------------------------------------------------------
step "0. 前置檢查"

if [[ -f "$ENV_FILE" ]]; then
    log "載入設定：$ENV_FILE"
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
else
    warn "找不到 $ENV_FILE，改用當前 shell 的環境變數"
fi

command -v docker  >/dev/null || die "找不到 docker"
$RESTORE_ONLY || command -v pg_dump >/dev/null || die "找不到 pg_dump（請安裝 postgresql-client 15）"
$RESTORE_ONLY || command -v psql    >/dev/null || die "找不到 psql"

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

: "${DB_DATABASE:?目標 DB_DATABASE 未設定}"
: "${DB_USERNAME:?目標 DB_USERNAME 未設定}"

mkdir -p "$WORK_DIR"
COUNTS_SRC="$WORK_DIR/rowcounts-source.tsv"
COUNTS_DST="$WORK_DIR/rowcounts-target.tsv"

# 盤點所有 public schema 的 table row count。
# 用 COUNT(*) 而非 pg_class.reltuples：後者是統計估計值，對帳會不準。
ROWCOUNT_SQL="
SELECT table_name,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT COUNT(*) AS c FROM public.%I', table_name),
                           false, true, '')))[1]::text::bigint AS row_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name NOT IN ('spatial_ref_sys')
ORDER BY table_name;
"

# --- 1. 來源盤點 --------------------------------------------------------------
if ! $RESTORE_ONLY; then
    step "1. 來源（Cloud SQL）盤點"

    : "${SRC_DB_HOST:?SRC_DB_HOST 未設定}"
    : "${SRC_DB_USERNAME:?SRC_DB_USERNAME 未設定}"
    : "${SRC_DB_PASSWORD:?SRC_DB_PASSWORD 未設定}"
    : "${SRC_DB_DATABASE:?SRC_DB_DATABASE 未設定}"
    SRC_DB_PORT="${SRC_DB_PORT:-5432}"

    export PGPASSWORD="$SRC_DB_PASSWORD"
    src_psql() {
        psql -h "$SRC_DB_HOST" -p "$SRC_DB_PORT" -U "$SRC_DB_USERNAME" -d "$SRC_DB_DATABASE" "$@"
    }

    log "連線 ${SRC_DB_USERNAME}@${SRC_DB_HOST}:${SRC_DB_PORT}/${SRC_DB_DATABASE}"
    src_psql -Atc 'SELECT version();' >/dev/null || die "無法連線來源資料庫"

    if $DRY_RUN; then
        echo "  ${c_dim}[dry-run]${c_reset} 將盤點來源 row count → $COUNTS_SRC"
    else
        src_psql -AtF $'\t' -c "$ROWCOUNT_SQL" > "$COUNTS_SRC"
        table_n=$(wc -l < "$COUNTS_SRC")
        total=$(awk -F'\t' '{s+=$2} END {print s+0}' "$COUNTS_SRC")
        ok "來源共 ${table_n} 張表、${total} 筆資料（明細：$COUNTS_SRC）"
    fi
fi

# --- 2. dump ------------------------------------------------------------------
if ! $RESTORE_ONLY; then
    step "2. pg_dump"

    [[ -n "$DUMP_FILE" ]] || DUMP_FILE="$WORK_DIR/cloudsql-$(date '+%Y%m%d-%H%M%S').dump"

    if [[ -f "$DUMP_FILE" ]] && ! $FORCE_DUMP; then
        warn "dump 已存在，略過重抓：$DUMP_FILE（--force-dump 可強制重抓）"
    else
        log "dump → $DUMP_FILE"
        if $DRY_RUN; then
            echo "  ${c_dim}[dry-run]${c_reset} pg_dump -Fc --no-owner --no-privileges → $DUMP_FILE"
        else
            # 寫到 .partial 再改名：中斷時不會留下看似完整的半套 dump
            pg_dump -h "$SRC_DB_HOST" -p "$SRC_DB_PORT" -U "$SRC_DB_USERNAME" -d "$SRC_DB_DATABASE" \
                --format=custom --compress=6 --no-owner --no-privileges \
                --file="${DUMP_FILE}.partial"
            mv "${DUMP_FILE}.partial" "$DUMP_FILE"
            sha256sum "$DUMP_FILE" > "${DUMP_FILE}.sha256"
            ok "dump 完成：$(du -h "$DUMP_FILE" | cut -f1)"
        fi
    fi
    unset PGPASSWORD
fi

if $DUMP_ONLY; then
    echo; ok "--dump-only：到此為止。dump 檔：$DUMP_FILE"
    exit 0
fi

# --- 3. 還原 ------------------------------------------------------------------
step "3. 還原到 NAS PostGIS"

if $RESTORE_ONLY; then
    [[ -n "$DUMP_FILE" ]] || die "--restore-only 必須搭配 --dump-file"
fi
[[ -f "$DUMP_FILE" ]] || $DRY_RUN || die "找不到 dump 檔：$DUMP_FILE"

# 驗證 dump 完整性，避免還原到傳輸過程中損毀的檔案
if [[ -f "${DUMP_FILE}.sha256" ]] && ! $DRY_RUN; then
    log "驗證 dump checksum"
    (cd "$(dirname "$DUMP_FILE")" && sha256sum -c "$(basename "$DUMP_FILE").sha256" >/dev/null) \
        || die "dump checksum 不符，檔案可能已損毀"
    ok "checksum 通過"
fi

log "確認 postgres 容器健康"
if ! $DRY_RUN; then
    compose ps postgres --format '{{.State}}' 2>/dev/null | grep -q running \
        || die "postgres 容器未執行，請先 docker compose -f $COMPOSE_FILE up -d postgres"
fi

# 還原期間若 backend 仍在寫入，會與還原中的資料互相踩踏，
# 對帳結果也會因為新寫入而失真。預設先停掉，結束後復原。
BACKEND_WAS_RUNNING=false
if $STOP_BACKEND; then
    if $DRY_RUN; then
        echo "  ${c_dim}[dry-run]${c_reset} 將停止 backend、backup，還原後再啟動"
    else
        if compose ps backend --format '{{.State}}' 2>/dev/null | grep -q running; then
            BACKEND_WAS_RUNNING=true
            log "停止 backend 與 backup（避免搬遷期間寫入）"
            compose stop backend backup >/dev/null 2>&1 || warn "停止服務時有錯誤，請自行確認"
        else
            log "backend 未執行，無需停止"
        fi
    fi
else
    warn "--no-stop-backend：backend 仍在執行，若期間有寫入，對帳可能失敗"
fi

# 無論成功失敗都要把服務放回去，不要讓中斷的搬遷把站台留在停機狀態
restore_services() {
    if $BACKEND_WAS_RUNNING; then
        log "重新啟動 backend 與 backup"
        compose start backend backup >/dev/null 2>&1 || warn "重新啟動服務失敗，請手動 docker compose start backend backup"
    fi
}
trap restore_services EXIT

dst_psql() { compose exec -T postgres psql -U "$DB_USERNAME" -d "$DB_DATABASE" "$@"; }

# 目標非空時停手：避免把資料倒進已在服務的 DB 造成主鍵衝突或重複資料
if ! $DRY_RUN; then
    existing=$(dst_psql -Atc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'spatial_ref_sys';" | tr -d '[:space:]')
    if [[ "${existing:-0}" -gt 0 ]] && ! $ALLOW_NONEMPTY; then
        die "目標資料庫已有 ${existing} 張表。確認要覆蓋請加 --allow-nonempty（會先 DROP SCHEMA public CASCADE）"
    fi
    if [[ "${existing:-0}" -gt 0 ]]; then
        warn "--allow-nonempty：清空目標 schema"
        dst_psql -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
        dst_psql -c 'CREATE EXTENSION IF NOT EXISTS postgis;'
    fi
fi

log "pg_restore（平行度 2，配合 N5105 4 核）"
if $DRY_RUN; then
    echo "  ${c_dim}[dry-run]${c_reset} pg_restore --no-owner --no-privileges -j2 < $DUMP_FILE"
else
    # --no-owner/--no-privileges：雲端的 role 名稱在 NAS 上不存在
    # 不用 --exit-on-error：PostGIS extension 物件常有可忽略的既存錯誤，
    # 真正的驗收標準是後面的 row count 對帳。
    if ! compose exec -T postgres pg_restore \
            -U "$DB_USERNAME" -d "$DB_DATABASE" \
            --no-owner --no-privileges --jobs=2 --verbose \
            < "$DUMP_FILE" 2> "$WORK_DIR/restore.log"; then
        warn "pg_restore 回報錯誤，詳見 $WORK_DIR/restore.log（下一步對帳會判定是否致命）"
    fi
    ok "還原程序結束"
fi

# --- 4. 對帳 ------------------------------------------------------------------
step "4. Row count 對帳"

if $DRY_RUN; then
    echo "  ${c_dim}[dry-run]${c_reset} 將盤點目標端並與 $COUNTS_SRC 逐表比對"
    echo; ok "dry-run 結束"
    exit 0
fi

dst_psql -AtF $'\t' -c "$ROWCOUNT_SQL" > "$COUNTS_DST"

if [[ ! -f "$COUNTS_SRC" ]]; then
    warn "找不到來源基準 $COUNTS_SRC（--restore-only 模式），略過對帳"
    dst_total=$(awk -F'\t' '{s+=$2} END {print s+0}' "$COUNTS_DST")
    ok "目標端共 $(wc -l < "$COUNTS_DST") 張表、${dst_total} 筆"
    exit 0
fi

mismatch=0
printf '%-40s %12s %12s   %s\n' "TABLE" "SOURCE" "TARGET" "RESULT"
printf '%s\n' "--------------------------------------------------------------------------------"

while IFS=$'\t' read -r tbl src_n; do
    dst_n=$(awk -F'\t' -v t="$tbl" '$1==t {print $2}' "$COUNTS_DST")
    if [[ -z "$dst_n" ]]; then
        printf '%-40s %12s %12s   %s\n' "$tbl" "$src_n" "-" "${c_red}MISSING${c_reset}"
        mismatch=$((mismatch + 1))
    elif [[ "$src_n" != "$dst_n" ]]; then
        printf '%-40s %12s %12s   %s\n' "$tbl" "$src_n" "$dst_n" "${c_red}MISMATCH${c_reset}"
        mismatch=$((mismatch + 1))
    else
        printf '%-40s %12s %12s   %s\n' "$tbl" "$src_n" "$dst_n" "${c_green}OK${c_reset}"
    fi
done < "$COUNTS_SRC"

# 目標端多出來的表也要抓：代表還原到了不該有的殘留資料
while IFS=$'\t' read -r tbl dst_n; do
    if ! awk -F'\t' -v t="$tbl" '$1==t {found=1} END {exit !found}' "$COUNTS_SRC"; then
        printf '%-40s %12s %12s   %s\n' "$tbl" "-" "$dst_n" "${c_yellow}EXTRA${c_reset}"
        mismatch=$((mismatch + 1))
    fi
done < "$COUNTS_DST"

echo
if [[ $mismatch -gt 0 ]]; then
    die "對帳失敗：${mismatch} 張表不一致。切勿在此狀態下切換流量；請檢查 $WORK_DIR/restore.log"
fi

ok "對帳通過：所有表 row count 一致"
echo
echo "下一步："
echo "  1. 執行 migration 對齊 schema 版本："
echo "     docker compose -f $COMPOSE_FILE exec backend npm run migration:run"
echo "  2. 檔案搬遷： ./migrate-gcs-files.sh"
echo "  3. 全棧驗證： ./verify-stack.sh"

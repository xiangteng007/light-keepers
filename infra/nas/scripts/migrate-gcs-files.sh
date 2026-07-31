#!/usr/bin/env bash
# =============================================================================
# GCS → NAS uploads 檔案搬遷（INF-1 / 工作項 M.3）
#
# 流程：
#   1. 盤點來源 bucket 物件數與總大小
#   2. gsutil rsync 逐 bucket 同步到 NAS 的 uploads volume
#   3. 物件數對帳 + checksum（MD5）抽驗
#
# 冪等性：gsutil rsync 本身即為冪等（只搬差異）；重跑安全，可先在離峰跑一輪
#         暖身，停機窗口內再跑一次追增量。
#
# 用法：
#   ./migrate-gcs-files.sh --dry-run                    # 只列出會搬什麼
#   ./migrate-gcs-files.sh                              # 實際搬遷
#   ./migrate-gcs-files.sh --buckets a,b --sample 50    # 指定 bucket、抽驗 50 個
#   ./migrate-gcs-files.sh --verify-only                # 只做對帳，不搬
#
# bucket 來源（backend 讀的三個 env key，見 README §7）：
#   GCS_BUCKET               field-reports        預設 lightkeepers-uploads
#   GCS_BUCKET_NAME          line-bot 災情回報／storage 抽象層
#   GCS_MAP_PACKAGES_BUCKET  離線地圖包           預設 lightkeepers-map-packages
#   → 於 .env 以 SRC_GCS_BUCKETS=bucket1,bucket2,... 逗號分隔列出
#
# 憑證：不含任何憑證。認證請先執行下列其一：
#   gcloud auth application-default login
#   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json   # 檔案權限 600
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
VERIFY_ONLY=false
ENV_FILE="$NAS_DIR/.env"
BUCKETS=""
DEST=""
SAMPLE_SIZE=20

c_reset=$'\033[0m'; c_red=$'\033[31m'; c_yellow=$'\033[33m'; c_green=$'\033[32m'; c_dim=$'\033[2m'
log()  { echo "${c_dim}[$(date '+%H:%M:%S')]${c_reset} $*"; }
ok()   { echo "${c_green}[OK]${c_reset}   $*"; }
warn() { echo "${c_yellow}[WARN]${c_reset} $*"; }
die()  { echo "${c_red}[FAIL]${c_reset} $*" >&2; exit 1; }
step() { echo; echo "=== $* ==="; }

usage() { sed -n '2,/^# ====/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)     DRY_RUN=true ;;
        --verify-only) VERIFY_ONLY=true ;;
        --env-file)    ENV_FILE="${2:?}"; shift ;;
        --buckets)     BUCKETS="${2:?}"; shift ;;
        --dest)        DEST="${2:?}"; shift ;;
        --sample)      SAMPLE_SIZE="${2:?}"; shift ;;
        -h|--help)     usage ;;
        *) die "未知參數：$1" ;;
    esac
    shift
done

$DRY_RUN && warn "DRY-RUN 模式：不會寫入任何檔案"

# --- 前置 --------------------------------------------------------------------
step "0. 前置檢查"

if [[ -f "$ENV_FILE" ]]; then
    log "載入設定：$ENV_FILE"
    set -a; # shellcheck disable=SC1090
    source "$ENV_FILE"; set +a
else
    warn "找不到 $ENV_FILE，改用當前 shell 的環境變數"
fi

command -v gsutil >/dev/null || die "找不到 gsutil（請安裝 Google Cloud SDK）"

[[ -n "$BUCKETS" ]] || BUCKETS="${SRC_GCS_BUCKETS:-}"
[[ -n "$BUCKETS" ]] || die "未指定來源 bucket：設定 SRC_GCS_BUCKETS 或用 --buckets"

# 目的地：NAS 上 uploads 的 host 路徑（= compose 掛給 backend 的 /app/uploads）
[[ -n "$DEST" ]] || DEST="${NVME_DATA_ROOT:?NVME_DATA_ROOT 未設定}/uploads"

log "來源 bucket：$BUCKETS"
log "目的地：$DEST"

if ! $DRY_RUN; then
    mkdir -p "$DEST"
    [[ -w "$DEST" ]] || die "目的地不可寫：$DEST"
fi

# 認證檢查：早點失敗，勝過搬到一半才發現沒權限
gsutil ls >/dev/null 2>&1 || die "gsutil 無法列出專案（請先 gcloud auth application-default login）"

IFS=',' read -ra BUCKET_LIST <<< "$BUCKETS"
WORK_DIR="${MIGRATE_WORK_DIR:-/tmp/lk-migrate}"
mkdir -p "$WORK_DIR"

total_mismatch=0

for bucket in "${BUCKET_LIST[@]}"; do
    bucket="$(echo "$bucket" | tr -d '[:space:]')"
    [[ -n "$bucket" ]] || continue
    bucket="${bucket#gs://}"

    step "bucket: gs://${bucket}"

    gsutil ls "gs://${bucket}" >/dev/null 2>&1 || { warn "bucket 不存在或無權限，略過：$bucket"; continue; }

    # 每個 bucket 落在 uploads 下自己的子目錄，避免不同 bucket 的同名物件互蓋
    bucket_dest="${DEST}/${bucket}"
    manifest="${WORK_DIR}/${bucket}.manifest"

    # --- 1. 來源盤點 ---
    log "盤點來源物件"
    # `gsutil ls -r` 的長格式輸出：size, date, url
    gsutil ls -r "gs://${bucket}/**" 2>/dev/null | grep -v '/$' > "$manifest" || true
    src_count=$(wc -l < "$manifest" | tr -d '[:space:]')
    log "來源物件數：${src_count}"

    if [[ "$src_count" == "0" ]]; then
        warn "bucket 為空，略過：$bucket"
        continue
    fi

    # --- 2. rsync ---
    if $VERIFY_ONLY; then
        log "--verify-only：略過同步"
    else
        log "gsutil rsync → ${bucket_dest}"
        # -r 遞迴 -c 以 checksum（而非 mtime）判斷差異 -m 平行
        # 刻意「不」加 -d：不讓本地端因來源缺漏而刪檔，搬遷期以保守為先
        rsync_flags=(-m rsync -r -c)
        $DRY_RUN && rsync_flags=(-m rsync -r -c -n)
        mkdir -p "$bucket_dest" 2>/dev/null || true
        gsutil "${rsync_flags[@]}" "gs://${bucket}" "$bucket_dest" \
            || die "gsutil rsync 失敗：$bucket"
        $DRY_RUN || ok "同步完成"
    fi

    if $DRY_RUN; then
        echo "  ${c_dim}[dry-run]${c_reset} 將對帳 ${src_count} 個物件並抽驗 ${SAMPLE_SIZE} 個 checksum"
        continue
    fi

    # --- 3. 物件數對帳 ---
    log "物件數對帳"
    dst_count=$(find "$bucket_dest" -type f ! -name '.*' 2>/dev/null | wc -l | tr -d '[:space:]')
    if [[ "$src_count" != "$dst_count" ]]; then
        warn "物件數不符：來源 ${src_count} / 本地 ${dst_count}"
        total_mismatch=$((total_mismatch + 1))
    else
        ok "物件數一致：${src_count}"
    fi

    # --- 4. checksum 抽驗 ---
    # 全量 checksum 對百 GB 級資料太慢；抽樣足以抓出系統性的搬遷錯誤
    # （路徑對映錯、編碼問題、截斷）。
    log "checksum 抽驗（隨機 ${SAMPLE_SIZE} 個）"

    sample_fail=0
    sample_done=0

    # 用 shuf 隨機取樣；沒有 shuf 時退回取前 N 筆
    if command -v shuf >/dev/null; then
        sample_list=$(shuf -n "$SAMPLE_SIZE" "$manifest")
    else
        sample_list=$(head -n "$SAMPLE_SIZE" "$manifest")
    fi

    while IFS= read -r gs_url; do
        [[ -n "$gs_url" ]] || continue
        rel_path="${gs_url#gs://${bucket}/}"
        local_file="${bucket_dest}/${rel_path}"

        if [[ ! -f "$local_file" ]]; then
            warn "  缺檔：$rel_path"
            sample_fail=$((sample_fail + 1))
            continue
        fi

        # `gsutil hash -h` 輸出 hex（-m 只算 MD5），與 md5sum 同格式，省去 base64 轉換。
        # composite object 沒有 MD5，跳過不算失敗。
        src_md5=$(gsutil hash -m -h "$gs_url" 2>/dev/null | awk '/md5/ {print $NF}' | tr -d '[:space:]')
        if [[ -z "$src_md5" ]]; then
            log "  略過（來源無 MD5，可能為 composite object）：$rel_path"
            continue
        fi

        if command -v md5sum >/dev/null; then
            dst_md5=$(md5sum "$local_file" | awk '{print $1}')
        else
            dst_md5=$(md5 -q "$local_file")          # BSD/macOS
        fi

        sample_done=$((sample_done + 1))
        if [[ "$src_md5" != "$dst_md5" ]]; then
            warn "  checksum 不符：$rel_path"
            sample_fail=$((sample_fail + 1))
        fi
    done <<< "$sample_list"

    if [[ $sample_fail -gt 0 ]]; then
        warn "抽驗 ${sample_done} 個，${sample_fail} 個失敗"
        total_mismatch=$((total_mismatch + 1))
    else
        ok "抽驗 ${sample_done} 個全部通過"
    fi
done

# --- 5. 權限 ------------------------------------------------------------------
if ! $DRY_RUN && ! $VERIFY_ONLY; then
    step "調整權限"
    # backend 容器以 node 使用者（uid 1000）執行，需要可讀寫
    log "chown -R 1000:1000 $DEST"
    chown -R 1000:1000 "$DEST" 2>/dev/null || warn "chown 失敗（可能非 root）；請手動確認 backend 容器可寫入 uploads"
    find "$DEST" -type d -exec chmod 755 {} + 2>/dev/null || true
    find "$DEST" -type f -exec chmod 644 {} + 2>/dev/null || true
fi

echo
if [[ $total_mismatch -gt 0 ]]; then
    die "有 ${total_mismatch} 個 bucket 對帳未通過，請排查後重跑（本腳本冪等，可安全重跑）"
fi

$DRY_RUN && { ok "dry-run 結束"; exit 0; }

ok "檔案搬遷完成"
echo
echo "後續："
echo "  1. 確認 backend 的 STORAGE_PROVIDER=local、LOCAL_STORAGE_PATH=/app/uploads"
echo "  2. 資料庫中既有的 GCS 絕對 URL 需改寫成新網域——"
echo "     這些是資料而非組態，請依實際欄位撰寫一次性 UPDATE，勿盲目全表取代。"
echo "  3. 執行 ./verify-stack.sh 驗證出檔路徑（/uploads/...）可讀"

#!/bin/sh
# =============================================================================
# 第二副本推送（CD-6 / 工作項 C1.3）
#
# 為什麼需要這支：NAS 上的 HDD RAID 6 與 NVMe 在**同一台機器、同一個地址**。
# RAID 擋得住硬碟壞，擋不住失竊、火災、淹水、停電燒毀，更擋不住戰時的
# 物理毀損。在 D16 的威脅模型下，「同址單一副本」等於沒有備份。
# 因此每日備份完成後，必須把當日產物推到**離開這台機器**的第二個目標。
#
# 兩個方案（可擇一或同時，由 REPLICA_MODE 決定）：
#   A. rsync over SSH → 內網 Mac mini（主推）
#      內網 2.5GbE 快、無月費、掉線時人找得到機器。
#      前提：Mac mini 與 NAS **不在同一個電源迴路／理想上不在同一個房間**。
#   B. rclone → 任意 S3 相容冷儲存（選配，建議與 A 併用）
#      真正的異地。走 rclone crypt，**上傳前就在本機加密**，
#      雲端業者拿到的只有密文與被混淆的檔名。
#
# 完整性策略（備份最怕「以為有、其實壞了」）：
#   1. 推送前：先在本機用 .sha256 驗一次，**絕不把已損毀的檔案推出去**
#      （否則好的第二副本會被壞檔覆蓋，等於一次弄壞兩份）。
#   2. 推送後：在**遠端**重算 sha256 並比對，確認落地的位元與來源一致。
#      不信任 rsync/rclone 的回傳碼——傳輸層說成功不代表磁碟上是對的。
#   3. 任一步失敗：寫 marker 檔 .replica-failed（含原因與時間），
#      並且**不更新** .replica-heartbeat；healthcheck.sh 會據此把容器轉為
#      unhealthy（沿用既有心跳模式）。
#
# 用法：
#   /usr/local/bin/replicate.sh                    # 推最新一份 dump（backup.sh 會自動呼叫）
#   /usr/local/bin/replicate.sh --dump-file /backup/db/xxx.dump
#   /usr/local/bin/replicate.sh --mode rsync       # 覆寫 REPLICA_MODE
#   /usr/local/bin/replicate.sh --dry-run          # 只做本機驗證與連線測試，不傳輸
#   /usr/local/bin/replicate.sh --pull /backup/.drill-stage
#                                                  # 反向：從第二副本拉最新一份回來並驗 sha256
#                                                  # （restore-drill.sh --source=secondary 用）
#
# 環境變數見 infra/nas/.env.nas.example §7.1。
# =============================================================================
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backup}"
DB_DIR="$BACKUP_DIR/db"
UPLOADS_DIR="$BACKUP_DIR/uploads"
LOG_FILE="$BACKUP_DIR/backup.log"
MARKER="$BACKUP_DIR/.replica-failed"
HEARTBEAT="$BACKUP_DIR/.replica-heartbeat"
KNOWN_HOSTS="${REPLICA_KNOWN_HOSTS:-$BACKUP_DIR/.ssh_known_hosts}"

MODE="${REPLICA_MODE:-rsync}"
DUMP_FILE=""
DRY_RUN=false
PULL_DIR=""
RETENTION_DAYS="${REPLICA_RETENTION_DAYS:-${BACKUP_RETENTION_DAYS:-14}}"
VERIFY_UPLOADS="${REPLICA_VERIFY_UPLOADS:-true}"

log() {
    msg="[$(date '+%Y-%m-%d %H:%M:%S')] [replica] $*"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

# 失敗一律留下 marker：值班的人早上看到的第一個東西應該是「哪裡壞了、什麼時候壞的」，
# 而不是一堆要自己 grep 的日誌。
fail() {
    log "ERROR: $*"
    {
        echo "failed_at=$(date '+%Y-%m-%d %H:%M:%S')"
        echo "mode=$MODE"
        echo "phase=${PHASE:-push}"
        echo "reason=$*"
    } > "$MARKER" 2>/dev/null || true
    exit 1
}

while [ $# -gt 0 ]; do
    case "$1" in
        --dump-file) DUMP_FILE="${2:?--dump-file 需要參數}"; shift ;;
        --mode)      MODE="${2:?--mode 需要參數}"; shift ;;
        --pull)      PULL_DIR="${2:?--pull 需要目的目錄}"; shift ;;
        --dry-run)   DRY_RUN=true ;;
        -h|--help)   sed -n '2,/^# ====/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "未知參數：$1" >&2; exit 2 ;;
    esac
    shift
done

if [ "${REPLICA_ENABLED:-false}" != "true" ]; then
    log "REPLICA_ENABLED != true，略過第二副本推送"
    exit 0
fi

case "$MODE" in
    rsync|rclone|both) ;;
    *) fail "REPLICA_MODE 需為 rsync / rclone / both，收到：$MODE" ;;
esac

local_sha() { sha256sum "$1" | awk '{print $1}'; }
recorded_sha() { awk '{print $1; exit}' "$1"; }

if [ -z "$PULL_DIR" ]; then
    PHASE=push

    # --- 選定要推的 dump ------------------------------------------------------
    if [ -z "$DUMP_FILE" ]; then
        # ls -t 依 mtime 排序，取最新一份
        DUMP_FILE=$(ls -t "$DB_DIR"/*.dump 2>/dev/null | head -1 || true)
    fi
    [ -n "$DUMP_FILE" ] && [ -f "$DUMP_FILE" ] || fail "找不到可推送的 dump（$DB_DIR）"

    DUMP_NAME=$(basename "$DUMP_FILE")
    SHA_FILE="${DUMP_FILE}.sha256"

    # --- 0. 推送前的本機完整性驗證 --------------------------------------------
    # 這一步是整支腳本最重要的一段。把壞檔推出去會覆蓋掉遠端「還是好的」那一份，
    # 一次的疏忽讓兩份副本同時失效。
    [ -f "$SHA_FILE" ] || fail "缺少 ${DUMP_NAME}.sha256，無法驗證，拒絕推送"

    EXPECTED=$(recorded_sha "$SHA_FILE")
    ACTUAL=$(local_sha "$DUMP_FILE")
    [ -n "$EXPECTED" ] || fail "${DUMP_NAME}.sha256 內容為空"
    [ "$EXPECTED" = "$ACTUAL" ] || fail "本機 sha256 不符（$DUMP_NAME）——這份備份已損毀，拒絕推送以免覆蓋遠端良品"

    log "推送目標：$MODE｜備份：$DUMP_NAME（$(du -h "$DUMP_FILE" | cut -f1)）｜遠端保留 ${RETENTION_DAYS} 天"
    log "本機 sha256 驗證通過"
else
    PHASE=pull
    case "$MODE" in
        both) MODE=rsync; log "--pull 一次只能從一個目標拉，MODE=both 取 rsync（可用 --mode rclone 指定）" ;;
    esac
    mkdir -p "$PULL_DIR" || fail "無法建立暫存目錄：$PULL_DIR"
    log "從第二副本拉取（$MODE）→ $PULL_DIR"
fi

# =============================================================================
# 方案 A：rsync over SSH → Mac mini
# =============================================================================
setup_ssh() {
    : "${REPLICA_SSH_HOST:?REPLICA_SSH_HOST 未設定}"
    : "${REPLICA_SSH_USER:?REPLICA_SSH_USER 未設定}"
    : "${REPLICA_REMOTE_ROOT:?REPLICA_REMOTE_ROOT 未設定}"
    ssh_key="${REPLICA_SSH_KEY:-/secrets/replica_key}"
    ssh_port="${REPLICA_SSH_PORT:-22}"
    remote="$REPLICA_SSH_USER@$REPLICA_SSH_HOST"

    [ -f "$ssh_key" ] || fail "找不到 SSH 私鑰：$ssh_key（是否忘了掛 REPLICA_SSH_KEY_HOST？）"

    # 遠端路徑會被塞進 remote shell，先擋掉會改變語意的字元。
    case "$REPLICA_REMOTE_ROOT" in
        *[\'\"\;\|\&\$\`]*|*' '*) fail "REPLICA_REMOTE_ROOT 含有不安全字元或空白：$REPLICA_REMOTE_ROOT" ;;
        /*) ;;
        *) fail "REPLICA_REMOTE_ROOT 必須是絕對路徑：$REPLICA_REMOTE_ROOT" ;;
    esac

    # UserKnownHostsFile 指到 HDD 池上的持久檔：第一次連線 accept-new 記下指紋，
    # 之後主機金鑰若被換掉（可能是中間人）連線會直接失敗，而不是默默接受。
    SSH_OPTS="-i $ssh_key -p $ssh_port -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$KNOWN_HOSTS -o ConnectTimeout=20"

    # shellcheck disable=SC2086
    ssh $SSH_OPTS "$remote" true 2>/dev/null \
        || fail "SSH 連不上 $remote:$ssh_port（Mac mini 關機？金鑰未授權？防火牆？）"
    log "SSH 連線正常：$remote:$ssh_port"
}

push_rsync() {
    setup_ssh

    if $DRY_RUN; then
        log "dry-run：跳過 rsync 傳輸"
        return 0
    fi

    # shellcheck disable=SC2086
    ssh $SSH_OPTS "$remote" "mkdir -p $REPLICA_REMOTE_ROOT/db $REPLICA_REMOTE_ROOT/uploads" \
        || fail "遠端無法建立目錄 $REPLICA_REMOTE_ROOT"

    # --- dump + sha256 ---
    log "rsync dump → $remote:$REPLICA_REMOTE_ROOT/db/"
    rsync -a --partial-dir=.rsync-partial -e "ssh $SSH_OPTS" \
        "$DUMP_FILE" "$SHA_FILE" "$remote:$REPLICA_REMOTE_ROOT/db/" \
        || fail "rsync dump 失敗"

    # --- 遠端回驗（macOS 沒有 sha256sum，只有 shasum）---
    log "遠端重算 sha256 中…"
    # shellcheck disable=SC2086
    remote_sha=$(ssh $SSH_OPTS "$remote" \
        "if command -v sha256sum >/dev/null 2>&1; then sha256sum $REPLICA_REMOTE_ROOT/db/$DUMP_NAME; else shasum -a 256 $REPLICA_REMOTE_ROOT/db/$DUMP_NAME; fi" \
        2>/dev/null | awk '{print $1; exit}')
    [ -n "$remote_sha" ] || fail "遠端無法計算 sha256（檔案沒落地？遠端無 sha256sum/shasum？）"
    [ "$remote_sha" = "$EXPECTED" ] \
        || fail "遠端 sha256 不符：期望 $EXPECTED，實得 $remote_sha——第二副本不可信"
    log "遠端 sha256 回驗通過"

    # --- uploads ---
    if [ -d "$UPLOADS_DIR/current" ]; then
        log "rsync uploads → $remote:$REPLICA_REMOTE_ROOT/uploads/current/"
        rsync -a --delete -e "ssh $SSH_OPTS" \
            "$UPLOADS_DIR/current/" "$remote:$REPLICA_REMOTE_ROOT/uploads/current/" \
            || fail "rsync uploads 失敗"

        if [ "$VERIFY_UPLOADS" = "true" ]; then
            # --checksum 讓兩端都重算整個檔案的 checksum 再比對（不是只看 size+mtime）；
            # --dry-run 只列差異不傳輸。輸出為空 = 兩端逐檔完全一致。
            # 這一步會讀完兩邊所有 uploads，檔案量大時很吃 I/O，
            # 可用 REPLICA_VERIFY_UPLOADS=false 關掉（改為只靠每月演練驗證）。
            log "uploads 逐檔 checksum 回驗中（可用 REPLICA_VERIFY_UPLOADS=false 關閉）…"
            diff_out=$(rsync -a --delete --checksum --dry-run --itemize-changes \
                -e "ssh $SSH_OPTS" \
                "$UPLOADS_DIR/current/" "$remote:$REPLICA_REMOTE_ROOT/uploads/current/" \
                2>/dev/null | grep -E '^([<>*]|c[dLDS])' || true)
            [ -z "$diff_out" ] || fail "uploads 回驗發現差異：$(echo "$diff_out" | head -5 | tr '\n' ' ')"
            log "uploads 回驗通過（兩端逐檔一致）"
        else
            log "REPLICA_VERIFY_UPLOADS=false，略過 uploads 逐檔回驗"
        fi
    fi

    # --- 遠端保留策略 ---
    # 只刪 db/ 底下符合 *.dump* 的檔案，且限定 maxdepth 1，避免路徑打錯時掃掉整顆碟。
    # shellcheck disable=SC2086
    ssh $SSH_OPTS "$remote" \
        "find $REPLICA_REMOTE_ROOT/db -maxdepth 1 -type f -name '*.dump*' -mtime +$RETENTION_DAYS -delete" \
        >/dev/null 2>&1 || log "WARN: 遠端保留策略執行失敗（不影響本次推送）"

    # shellcheck disable=SC2086
    remote_count=$(ssh $SSH_OPTS "$remote" \
        "find $REPLICA_REMOTE_ROOT/db -maxdepth 1 -type f -name '*.dump' | wc -l" 2>/dev/null | tr -d '[:space:]')
    log "方案 A 完成，遠端 dump 份數：${remote_count:-?}"
}

# =============================================================================
# 方案 B：rclone → S3 相容冷儲存（crypt 包裝，上傳前加密）
# =============================================================================
setup_rclone() {
    : "${REPLICA_RCLONE_REMOTE:?REPLICA_RCLONE_REMOTE 未設定（例：lk-cold-crypt:）}"
    conf="${RCLONE_CONFIG:-/secrets/rclone.conf}"

    [ -f "$conf" ] || fail "找不到 rclone 設定：$conf（是否忘了掛 REPLICA_RCLONE_CONF_HOST？）"
    command -v rclone >/dev/null 2>&1 || fail "容器內沒有 rclone"

    RC="rclone --config $conf --log-level NOTICE"

    # shellcheck disable=SC2086
    $RC lsd "$REPLICA_RCLONE_REMOTE" >/dev/null 2>&1 \
        || $RC mkdir "$REPLICA_RCLONE_REMOTE" >/dev/null 2>&1 \
        || fail "rclone 無法連線或建立 $REPLICA_RCLONE_REMOTE（憑證錯誤？endpoint 不通？crypt 密碼錯？）"
    log "rclone 遠端可達：$REPLICA_RCLONE_REMOTE"
}

push_rclone() {
    verify="${REPLICA_RCLONE_VERIFY:-download}"
    setup_rclone

    if $DRY_RUN; then
        log "dry-run：跳過 rclone 傳輸"
        return 0
    fi

    log "rclone copy dump → $REPLICA_RCLONE_REMOTE/db/"
    # shellcheck disable=SC2086
    $RC copy "$DUMP_FILE" "$REPLICA_RCLONE_REMOTE/db/" || fail "rclone copy dump 失敗"
    # shellcheck disable=SC2086
    $RC copy "$SHA_FILE" "$REPLICA_RCLONE_REMOTE/db/" || fail "rclone copy sha256 失敗"

    # crypt remote 不會把底層物件的 hash 透出來（密文的 hash 對不上明文），
    # 所以唯一可信的回驗是 --download：真的把它拉回來比對內容。
    # 冷儲存有取回費用，量大時可改 REPLICA_RCLONE_VERIFY=size（較弱，只比大小）。
    case "$verify" in
        download)
            log "rclone check --download 回驗中（會產生取回流量）…"
            # shellcheck disable=SC2086
            $RC check "$DB_DIR" "$REPLICA_RCLONE_REMOTE/db" \
                --one-way --download --include "$DUMP_NAME" \
                || fail "rclone --download 回驗失敗——雲端副本與本機內容不一致"
            log "rclone 內容回驗通過"
            ;;
        size)
            # shellcheck disable=SC2086
            $RC check "$DB_DIR" "$REPLICA_RCLONE_REMOTE/db" \
                --one-way --size-only --include "$DUMP_NAME" \
                || fail "rclone size 回驗失敗"
            log "rclone size 回驗通過（較弱的驗證，僅比對大小）"
            ;;
        none) log "WARN: REPLICA_RCLONE_VERIFY=none，未做遠端回驗" ;;
        *) fail "REPLICA_RCLONE_VERIFY 需為 download / size / none，收到：$verify" ;;
    esac

    if [ -d "$UPLOADS_DIR/current" ]; then
        log "rclone sync uploads → $REPLICA_RCLONE_REMOTE/uploads/current/"
        # shellcheck disable=SC2086
        $RC sync "$UPLOADS_DIR/current" "$REPLICA_RCLONE_REMOTE/uploads/current" \
            || fail "rclone sync uploads 失敗"
        # shellcheck disable=SC2086
        $RC check "$UPLOADS_DIR/current" "$REPLICA_RCLONE_REMOTE/uploads/current" --one-way --size-only \
            || fail "uploads rclone 回驗失敗"
        log "uploads rclone 回驗通過（size-only）"
    fi

    # shellcheck disable=SC2086
    $RC delete "$REPLICA_RCLONE_REMOTE/db" --min-age "${RETENTION_DAYS}d" --include '*.dump*' \
        >/dev/null 2>&1 || log "WARN: rclone 保留策略執行失敗（不影響本次推送）"

    log "方案 B 完成"
}

# =============================================================================
# 反向：從第二副本拉回（--pull）
#
# 「備份未經還原驗證等於不存在」。推送成功只證明位元傳過去了，不證明
# 那份東西還原得回來——金鑰輪換掉了、crypt 密碼記錯了、遠端目錄被清了、
# 保留策略把唯一一份刪了，這些都要真的拉一次才會發現。
# restore-drill.sh --source=secondary 會呼叫這裡。
# =============================================================================
verify_pulled() {
    # $1 = 拉回來的 dump 檔路徑
    d="$1"
    [ -f "${d}.sha256" ] || fail "第二副本缺少 $(basename "$d").sha256——無法證明這份可用"
    exp=$(recorded_sha "${d}.sha256")
    act=$(local_sha "$d")
    [ -n "$exp" ] || fail "拉回的 .sha256 內容為空"
    [ "$exp" = "$act" ] \
        || fail "拉回的檔案 sha256 不符（期望 $exp，實得 $act）——第二副本已損毀，這份備份救不了你"
    log "拉回檔案 sha256 驗證通過：$(basename "$d")（$(du -h "$d" | cut -f1)）"
}

pull_rsync() {
    setup_ssh

    # shellcheck disable=SC2086
    newest=$(ssh $SSH_OPTS "$remote" \
        "ls -t $REPLICA_REMOTE_ROOT/db/*.dump 2>/dev/null | head -1" 2>/dev/null | tr -d '\r')
    [ -n "$newest" ] || fail "第二副本上找不到任何 dump（$REPLICA_REMOTE_ROOT/db）——推送從未成功過？"
    name=$(basename "$newest")
    log "第二副本最新備份：$name"

    rsync -a -e "ssh $SSH_OPTS" \
        "$remote:$newest" "$remote:${newest}.sha256" "$PULL_DIR/" \
        || fail "從第二副本 rsync 拉回失敗"

    verify_pulled "$PULL_DIR/$name"

    # shellcheck disable=SC2086
    up_count=$(ssh $SSH_OPTS "$remote" \
        "find $REPLICA_REMOTE_ROOT/uploads/current -type f 2>/dev/null | wc -l" 2>/dev/null | tr -d '[:space:]')
    log "第二副本 uploads 檔案數：${up_count:-0}"
    echo "${up_count:-0}" > "$PULL_DIR/.secondary-uploads-count"
    echo "$PULL_DIR/$name" > "$PULL_DIR/.pulled-dump"
}

pull_rclone() {
    setup_rclone

    # 檔名為 lightkeepers-YYYYMMDD-HHMMSS.dump，字典序即時間序，取最後一個。
    # crypt remote 的 lsf 回傳的是解密後的檔名，所以這裡可以直接排序。
    # shellcheck disable=SC2086
    name=$($RC lsf "$REPLICA_RCLONE_REMOTE/db" --include '*.dump' 2>/dev/null | sort | tail -1 | tr -d '/')
    [ -n "$name" ] || fail "雲端第二副本找不到任何 dump（$REPLICA_RCLONE_REMOTE/db）"
    log "雲端第二副本最新備份：$name"

    # shellcheck disable=SC2086
    $RC copy "$REPLICA_RCLONE_REMOTE/db/$name" "$PULL_DIR/" || fail "rclone 拉回 dump 失敗"
    # shellcheck disable=SC2086
    $RC copy "$REPLICA_RCLONE_REMOTE/db/${name}.sha256" "$PULL_DIR/" || fail "rclone 拉回 sha256 失敗"

    verify_pulled "$PULL_DIR/$name"

    # shellcheck disable=SC2086
    up_count=$($RC lsf "$REPLICA_RCLONE_REMOTE/uploads/current" -R --files-only 2>/dev/null | wc -l | tr -d '[:space:]')
    log "雲端第二副本 uploads 檔案數：${up_count:-0}"
    echo "${up_count:-0}" > "$PULL_DIR/.secondary-uploads-count"
    echo "$PULL_DIR/$name" > "$PULL_DIR/.pulled-dump"
}

# --- 執行 ---------------------------------------------------------------------
if [ -n "$PULL_DIR" ]; then
    case "$MODE" in
        rsync)  pull_rsync ;;
        rclone) pull_rclone ;;
    esac
    # 拉取是唯讀驗證，不動 marker 也不打心跳——
    # 演練成功不代表「今天的推送」成功，兩件事不可互相冒充。
    log "=== 第二副本拉取驗證完成（$MODE）==="
    exit 0
fi

case "$MODE" in
    rsync)  push_rsync ;;
    rclone) push_rclone ;;
    both)   push_rsync; push_rclone ;;
esac

# --- 成功：清 marker、打心跳 ---------------------------------------------------
if $DRY_RUN; then
    log "=== dry-run 結束（未傳輸，未更新心跳）==="
    exit 0
fi

rm -f "$MARKER"
date > "$HEARTBEAT"
log "=== 第二副本推送完成（$MODE）==="

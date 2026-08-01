#!/bin/sh
# =============================================================================
# backup 容器健康檢查（CD-6 / 工作項 C1.3）
#
# 原本這段邏輯寫在 compose 的 healthcheck 一行 CMD-SHELL 裡。加入第二副本後
# 條件變成兩條心跳，塞進 YAML 單行會沒人看得懂也沒法測，因此抽成腳本。
#
# 判定（任一條不過就 unhealthy）：
#   1. 本地備份心跳 .heartbeat 在 BACKUP_STALE_SECONDS 內（預設 26h = 日備 + 2h 容差）
#   2. 若 REPLICA_ENABLED=true：
#      第二副本心跳 .replica-heartbeat 在 REPLICA_STALE_SECONDS 內
#      （預設 49h = 兩個備份週期 + 1h。給一次失敗自動復原的機會：
#        Mac mini 臨時關機一天不該立刻讓整個棧看起來壞掉，
#        但連兩天推不出去就是真的有事，必須有人去看。）
#
# 失敗原因會印到 stdout，docker 會存進 healthcheck log：
#   docker inspect --format '{{json .State.Health}}' lk-backup
#
# 另外 replicate.sh 失敗時會寫 .replica-failed，內含時間與原因，
# 是值班第一個該看的檔案：cat ${HDD_BACKUP_ROOT}/.replica-failed
# =============================================================================
set -u

BACKUP_DIR="${BACKUP_DIR:-/backup}"
HEARTBEAT="$BACKUP_DIR/.heartbeat"
REPLICA_HEARTBEAT="$BACKUP_DIR/.replica-heartbeat"
MARKER="$BACKUP_DIR/.replica-failed"

BACKUP_STALE="${BACKUP_STALE_SECONDS:-93600}"    # 26h
REPLICA_STALE="${REPLICA_STALE_SECONDS:-176400}" # 49h

now=$(date +%s)
rc=0

age_of() {
    [ -f "$1" ] || { echo "missing"; return; }
    echo $(( now - $(stat -c %Y "$1") ))
}

# --- 1. 本地備份心跳 ----------------------------------------------------------
age=$(age_of "$HEARTBEAT")
if [ "$age" = "missing" ]; then
    echo "UNHEALTHY: 找不到 $HEARTBEAT（備份從未成功執行過？）"
    rc=1
elif [ "$age" -ge "$BACKUP_STALE" ]; then
    echo "UNHEALTHY: 本地備份心跳已過期 $(( age / 3600 ))h（門檻 $(( BACKUP_STALE / 3600 ))h）"
    rc=1
fi

# --- 2. 第二副本心跳 ----------------------------------------------------------
if [ "${REPLICA_ENABLED:-false}" = "true" ]; then
    rage=$(age_of "$REPLICA_HEARTBEAT")
    if [ "$rage" = "missing" ]; then
        echo "UNHEALTHY: REPLICA_ENABLED=true 但找不到 $REPLICA_HEARTBEAT（第二副本從未成功推送過）"
        rc=1
    elif [ "$rage" -ge "$REPLICA_STALE" ]; then
        echo "UNHEALTHY: 第二副本心跳已過期 $(( rage / 3600 ))h（門檻 $(( REPLICA_STALE / 3600 ))h）"
        rc=1
    fi
    # marker 只補充原因，不單獨決定健康狀態——
    # 若 marker 還在但心跳已更新，代表最近一次已經推成功了。
    if [ "$rc" -ne 0 ] && [ -f "$MARKER" ]; then
        echo "最近一次失敗紀錄："
        cat "$MARKER"
    fi
fi

[ "$rc" -eq 0 ] && echo "OK"
exit "$rc"

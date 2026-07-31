#!/usr/bin/env bash
# =============================================================================
# NAS 全棧驗證 smoke test（INF-1 / 工作項 M.3）
#
# 檢查項目：
#   1. 容器狀態與健康度
#   2. nginx /healthz
#   3. backend /api/v1/health、/health/live、/health/ready
#   4. 前端靜態檔（index.html）可取得
#   5. /uploads 出檔路徑可讀（放測試檔 → 讀回 → 清掉）
#   6. 登入流程 smoke（未帶憑證 → 401；帶錯密碼 → 401；正確憑證 → 200 + JWT
#      → 用該 JWT 打受保護端點 → 200）
#   7. 備份 job 心跳與最近一次備份
#   8. 內網 Ollama 端點可達（RTX 5090 工作站）
#
# 唯讀為主：只有第 5 項會寫入一個測試檔，結束後刪除。加 --dry-run 可完全不寫。
#
# 用法：
#   ./verify-stack.sh                              # 打本機 nginx
#   ./verify-stack.sh --base-url https://domain    # 打對外網域（連 Tunnel 一起驗）
#   ./verify-stack.sh --smoke-user a@b.c --smoke-password-env LK_SMOKE_PW
#   ./verify-stack.sh --dry-run
#
# ⚠ 憑證絕不寫在腳本或參數裡。登入 smoke 的密碼只從環境變數讀取
#   （預設 LK_SMOKE_PASSWORD）；未設定時該項自動略過而非失敗。
#   建議在 NAS 上建一個「只有唯讀權限」的專用 smoke 帳號。
# =============================================================================
set -uo pipefail   # 刻意不用 -e：要跑完所有檢查再彙總結果

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$NAS_DIR/docker-compose.nas.yml"
ENV_FILE="$NAS_DIR/.env"

DRY_RUN=false
# 刻意「不」叫 BASE_URL：.env 裡有同名的應用組態鍵，
# 下面 `set -a; source "$ENV_FILE"` 會覆蓋掉 --base-url 傳進來的值。
TARGET_URL=""
SMOKE_USER="${LK_SMOKE_USER:-}"
SMOKE_PW_ENV="LK_SMOKE_PASSWORD"

c_reset=$'\033[0m'; c_red=$'\033[31m'; c_yellow=$'\033[33m'; c_green=$'\033[32m'; c_dim=$'\033[2m'
PASS=0; FAIL=0; SKIP=0

pass() { echo "  ${c_green}✔${c_reset} $*"; PASS=$((PASS+1)); }
fail() { echo "  ${c_red}✘${c_reset} $*"; FAIL=$((FAIL+1)); }
skip() { echo "  ${c_yellow}–${c_reset} $* ${c_dim}(略過)${c_reset}"; SKIP=$((SKIP+1)); }
step() { echo; echo "=== $* ==="; }
log()  { echo "  ${c_dim}$*${c_reset}"; }

usage() { sed -n '2,/^# ====/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)             DRY_RUN=true ;;
        --base-url)            TARGET_URL="${2:?}"; shift ;;
        --env-file)            ENV_FILE="${2:?}"; shift ;;
        --smoke-user)          SMOKE_USER="${2:?}"; shift ;;
        --smoke-password-env)  SMOKE_PW_ENV="${2:?}"; shift ;;
        -h|--help)             usage ;;
        *) echo "未知參數：$1" >&2; exit 2 ;;
    esac
    shift
done

if [[ -f "$ENV_FILE" ]]; then
    set -a; # shellcheck disable=SC1090
    source "$ENV_FILE"; set +a
fi

[[ -n "$TARGET_URL" ]] || TARGET_URL="http://127.0.0.1:${NGINX_HTTP_PORT:-8080}"
TARGET_URL="${TARGET_URL%/}"
API="${TARGET_URL}/api/v1"

command -v curl >/dev/null || { echo "找不到 curl" >&2; exit 2; }
HAS_JQ=false; command -v jq >/dev/null && HAS_JQ=true

echo "目標：$TARGET_URL"
$DRY_RUN && echo "${c_yellow}DRY-RUN：不寫入任何檔案${c_reset}"

# 回傳 HTTP status code
status_of() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$@"; }

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

# --- 1. 容器狀態 --------------------------------------------------------------
step "1. 容器狀態"

if command -v docker >/dev/null && [[ -f "$COMPOSE_FILE" ]]; then
    for svc in postgres backend nginx cloudflared backup; do
        state=$(compose ps "$svc" --format '{{.State}}' 2>/dev/null | head -1)
        health=$(compose ps "$svc" --format '{{.Health}}' 2>/dev/null | head -1)
        if [[ "$state" == "running" ]]; then
            case "$health" in
                healthy|"") pass "$svc: running${health:+ ($health)}" ;;
                starting)   skip "$svc: running (healthcheck 尚在 start_period)" ;;
                *)          fail "$svc: running 但健康檢查為 $health" ;;
            esac
        else
            fail "$svc: ${state:-未執行}"
        fi
    done
else
    skip "docker 或 compose 檔不可用，略過容器狀態檢查"
fi

# --- 2. nginx -----------------------------------------------------------------
step "2. nginx"

code=$(status_of "${TARGET_URL}/healthz")
if [[ "$code" == "200" ]]; then
    pass "GET /healthz → 200"
elif [[ "$code" == "000" ]]; then
    # 連不上時後續每一項都會是 000；先講清楚，免得下面的失敗訊息被誤讀成應用層問題
    fail "無法連線到 ${TARGET_URL}（確認棧已啟動、NGINX_HTTP_PORT 正確、防火牆放行）"
else
    fail "GET /healthz → ${code}"
fi

# --- 3. backend health --------------------------------------------------------
step "3. backend 健康檢查"

code=$(status_of "${API}/health")
[[ "$code" == "200" ]] && pass "GET /api/v1/health → 200" || fail "GET /api/v1/health → ${code}"

code=$(status_of "${API}/health/live")
[[ "$code" == "200" ]] && pass "GET /api/v1/health/live → 200" || fail "GET /api/v1/health/live → ${code}"

ready_body=$(curl -s --max-time 15 "${API}/health/ready")
if echo "$ready_body" | grep -q '"ready":true'; then
    pass "GET /api/v1/health/ready → ready=true（DB 連線正常）"
else
    fail "GET /api/v1/health/ready → ${ready_body:-無回應}"
fi

detailed=$(curl -s --max-time 15 "${API}/health/detailed")
if echo "$detailed" | grep -q '"database"'; then
    if $HAS_JQ; then
        log "$(echo "$detailed" | jq -c '{status, db: .checks.database, mem: .checks.memory}')"
    fi
    echo "$detailed" | grep -q '"status":"healthy"' \
        && pass "GET /api/v1/health/detailed → healthy" \
        || fail "GET /api/v1/health/detailed → 非 healthy：$detailed"
else
    fail "GET /api/v1/health/detailed 無有效回應"
fi

# --- 4. 前端靜態檔 ------------------------------------------------------------
step "4. 前端靜態檔"

index_body=$(curl -s --max-time 15 "${TARGET_URL}/")
if echo "$index_body" | grep -qi '<div id="root"\|<!doctype html'; then
    pass "GET / → 取得 SPA index.html"
else
    fail "GET / → 非預期內容（確認 WEB_DIST_PATH 指到 web-dashboard/dist）"
fi

# SPA fallback：不存在的前端路徑也該回 index.html 而非 404
code=$(status_of "${TARGET_URL}/dashboard/nonexistent-route-check")
[[ "$code" == "200" ]] && pass "SPA fallback → 200" || fail "SPA fallback → ${code}"

# --- 5. uploads 出檔 ----------------------------------------------------------
step "5. /uploads 出檔路徑"

UPLOADS_HOST_DIR="${NVME_DATA_ROOT:-}/uploads"
PROBE_NAME=".verify-stack-probe-$$.txt"

if $DRY_RUN; then
    skip "dry-run：不寫入測試檔"
elif [[ -n "${NVME_DATA_ROOT:-}" && -d "$UPLOADS_HOST_DIR" && -w "$UPLOADS_HOST_DIR" ]]; then
    echo "lightkeepers-uploads-probe" > "${UPLOADS_HOST_DIR}/${PROBE_NAME}"
    body=$(curl -s --max-time 15 "${TARGET_URL}/uploads/${PROBE_NAME}")
    if [[ "$body" == "lightkeepers-uploads-probe" ]]; then
        pass "PUT probe → GET /uploads/${PROBE_NAME} 內容正確"
    else
        fail "GET /uploads/${PROBE_NAME} 讀不到（檢查 nginx alias 與 volume 掛載）"
    fi
    rm -f "${UPLOADS_HOST_DIR}/${PROBE_NAME}"

    # sidecar metadata 不可對外
    echo '{}' > "${UPLOADS_HOST_DIR}/${PROBE_NAME}.meta.json"
    code=$(status_of "${TARGET_URL}/uploads/${PROBE_NAME}.meta.json")
    [[ "$code" == "403" || "$code" == "404" ]] \
        && pass ".meta.json sidecar 已被擋下 → ${code}" \
        || fail ".meta.json sidecar 對外可讀 → ${code}（nginx deny 規則失效）"
    rm -f "${UPLOADS_HOST_DIR}/${PROBE_NAME}.meta.json"
else
    skip "NVME_DATA_ROOT 未設定或 uploads 目錄不可寫"
fi

# --- 6. 登入流程 smoke --------------------------------------------------------
step "6. 登入流程 smoke"

# 6a. 未帶憑證打受保護端點 → 必須 401（若回 200，代表全域守衛失效，屬嚴重安全問題）
code=$(status_of "${API}/auth/me")
if [[ "$code" == "401" || "$code" == "403" ]]; then
    pass "未帶 token 打 /auth/me → ${code}"
elif [[ "$code" == "404" ]]; then
    skip "/auth/me 不存在（路由可能已調整）"
elif [[ "$code" == "000" ]]; then
    fail "未帶 token 打 /auth/me → 連線失敗"
else
    fail "未帶 token 打 /auth/me → ${code}（預期 401/403，全域守衛可能失效）"
fi

# 6b. 錯誤密碼 → 401
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 \
    -X POST "${API}/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"verify-stack-nonexistent@example.invalid","password":"definitely-wrong"}')
if [[ "$code" == "401" || "$code" == "400" ]]; then
    pass "錯誤憑證登入 → ${code}"
elif [[ "$code" == "429" ]]; then
    skip "錯誤憑證登入 → 429（限流已生效，屬預期行為）"
else
    fail "錯誤憑證登入 → ${code}（預期 401/400）"
fi

# 6c. 正確憑證 → 200 + accessToken，並用該 token 打受保護端點
SMOKE_PW="${!SMOKE_PW_ENV:-}"
if [[ -z "$SMOKE_USER" || -z "$SMOKE_PW" ]]; then
    skip "未提供 smoke 帳號（設定 --smoke-user 與環境變數 ${SMOKE_PW_ENV} 後可啟用完整登入驗證）"
else
    login_body=$(curl -s --max-time 20 \
        -X POST "${API}/auth/login" \
        -H 'Content-Type: application/json' \
        -d "{\"email\":\"${SMOKE_USER}\",\"password\":\"${SMOKE_PW}\"}")

    if $HAS_JQ; then
        token=$(echo "$login_body" | jq -r '.accessToken // .data.accessToken // empty')
    else
        token=$(echo "$login_body" | sed -n 's/.*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    fi

    if [[ -n "$token" ]]; then
        pass "正確憑證登入 → 取得 accessToken"

        code=$(status_of -H "Authorization: Bearer ${token}" "${API}/auth/me")
        [[ "$code" == "200" ]] \
            && pass "帶 token 打 /auth/me → 200" \
            || fail "帶 token 打 /auth/me → ${code}"
    else
        # 不要把 login_body 整包印出來：可能含使用者資料
        fail "正確憑證登入未取得 accessToken（檢查帳號是否存在／是否被鎖定）"
    fi
    unset SMOKE_PW token
fi

# --- 7. 備份 job --------------------------------------------------------------
step "7. 備份 job"

HDD="${HDD_BACKUP_ROOT:-}"
if [[ -n "$HDD" && -d "$HDD" ]]; then
    if [[ -f "$HDD/.heartbeat" ]]; then
        hb_age=$(( $(date +%s) - $(stat -c %Y "$HDD/.heartbeat" 2>/dev/null || echo 0) ))
        if [[ $hb_age -lt 93600 ]]; then
            pass "備份心跳正常（$((hb_age / 3600)) 小時前）"
        else
            fail "備份心跳過期（$((hb_age / 3600)) 小時前），日備可能已失效"
        fi
    else
        skip "尚無備份心跳（首次部署且未到排程時間屬正常）"
    fi

    dump_count=$(find "$HDD/db" -maxdepth 1 -name '*.dump' 2>/dev/null | wc -l | tr -d '[:space:]')
    if [[ "${dump_count:-0}" -gt 0 ]]; then
        latest=$(find "$HDD/db" -maxdepth 1 -name '*.dump' -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
        pass "DB 備份 ${dump_count} 份，最新：$(basename "$latest")"
    else
        skip "尚無 DB 備份檔"
    fi

    # 確認備份與資料真的落在不同儲存池，否則備份形同虛設
    if [[ -n "${NVME_DATA_ROOT:-}" && -d "${NVME_DATA_ROOT}" ]]; then
        dev_data=$(df -P "${NVME_DATA_ROOT}" | awk 'NR==2 {print $1}')
        dev_bak=$(df -P "$HDD" | awk 'NR==2 {print $1}')
        [[ "$dev_data" != "$dev_bak" ]] \
            && pass "資料池與備份池為不同裝置（${dev_data} vs ${dev_bak}）" \
            || fail "資料與備份在同一裝置（${dev_data}）——單一磁碟群組故障即全失，請改掛 HDD 池"
    fi
else
    skip "HDD_BACKUP_ROOT 未設定或不存在"
fi

# --- 8. 內網 LLM --------------------------------------------------------------
step "8. 內網 LLM（RTX 5090 工作站）"

if [[ -n "${LLM_BASE_URL:-}" ]]; then
    models_url="${LLM_BASE_URL%/}/models"
    code=$(status_of --max-time 8 "$models_url")
    if [[ "$code" == "200" ]]; then
        pass "GET ${models_url} → 200（Ollama 可達）"
    else
        # 工作站離線不阻擋整體驗收：依 D13 有 fallback 策略
        skip "GET ${models_url} → ${code}（工作站可能離線；不影響 NAS 棧本身）"
    fi
else
    skip "LLM_BASE_URL 未設定"
fi

# --- 彙總 --------------------------------------------------------------------
echo
echo "================================================"
echo "  通過 ${c_green}${PASS}${c_reset} / 失敗 ${c_red}${FAIL}${c_reset} / 略過 ${c_yellow}${SKIP}${c_reset}"
echo "================================================"

[[ $FAIL -eq 0 ]] || exit 1
echo "${c_green}全棧驗證通過${c_reset}"

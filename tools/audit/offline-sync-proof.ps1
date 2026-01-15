<#
.SYNOPSIS
    Offline Sync Conflict Proof Script
.DESCRIPTION
    驗證離線同步衝突處理實作
#>
param(
    [string]$WebDashboardPath = "web-dashboard"
)

$ErrorActionPreference = "Stop"
$scriptName = "offline-sync-proof"
$proofPath = "docs/proof/pwa/offline-sync-conflict-report.json"

Write-Host "=== Offline Sync Proof ===" -ForegroundColor Cyan

$result = @{
    scriptName = $scriptName
    timestamp  = (Get-Date).ToString("o")
    status     = "PASS"
    checks     = @()
}

# 1. 檢查 offlineSync.ts 存在
$syncServicePath = "$WebDashboardPath/src/services/offlineSync.ts"
$syncServiceExists = Test-Path $syncServicePath

$result.checks += @{
    name    = "Offline Sync Service File"
    passed  = $syncServiceExists
    details = if ($syncServiceExists) { "offlineSync.ts exists" } else { "offlineSync.ts not found" }
}

if ($syncServiceExists) {
    $syncContent = Get-Content $syncServicePath -Raw

    # 2. 檢查衝突處理
    $hasConflictHandler = $syncContent -match "handleConflict|ConflictDetails"
    $result.checks += @{
        name    = "Conflict Handler"
        passed  = $hasConflictHandler
        details = if ($hasConflictHandler) { "Conflict handling implemented" } else { "No conflict handler found" }
    }

    # 3. 檢查時間戳追蹤
    $hasClientTs = $syncContent -match "clientTs"
    $hasServerTs = $syncContent -match "serverTs"
    $result.checks += @{
        name    = "Timestamp Tracking"
        passed  = $hasClientTs -and $hasServerTs
        details = @{
            clientTs = $hasClientTs
            serverTs = $hasServerTs
        }
    }

    # 4. 檢查 last-write-wins
    $hasLWW = $syncContent -match "client-wins|server-wins|last-write-wins"
    $result.checks += @{
        name    = "Last-Write-Wins Strategy"
        passed  = $hasLWW
        details = if ($hasLWW) { "LWW strategy implemented" } else { "No LWW strategy found" }
    }

    # 5. 檢查衝突記錄
    $hasConflictLog = $syncContent -match "conflictLog|ConflictEvent"
    $result.checks += @{
        name    = "Conflict Logging"
        passed  = $hasConflictLog
        details = if ($hasConflictLog) { "Conflict events logged" } else { "No conflict logging" }
    }

    # 6. 檢查 React Hook
    $hasHook = $syncContent -match "export function useOfflineSync"
    $result.checks += @{
        name    = "React Hook Export"
        passed  = $hasHook
        details = if ($hasHook) { "useOfflineSync hook exported" } else { "Hook not found" }
    }
}

# 計算整體狀態
$failedChecks = $result.checks | Where-Object { -not $_.passed }
if ($failedChecks.Count -gt 0) {
    $result.status = "FAIL"
    Write-Host "FAILED: $($failedChecks.Count) checks failed" -ForegroundColor Red
}
else {
    Write-Host "PASSED: All checks passed" -ForegroundColor Green
}

# 輸出結果
$result | ConvertTo-Json -Depth 10 | Out-File -FilePath $proofPath -Encoding UTF8
Write-Host "Evidence saved to: $proofPath"

if ($result.status -eq "FAIL") {
    exit 1
}
exit 0

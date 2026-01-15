<#
.SYNOPSIS
    Offline SOP Proof Script
.DESCRIPTION
    驗證離線 SOP 服務實作
#>
param(
    [string]$WebDashboardPath = "web-dashboard"
)

$ErrorActionPreference = "Stop"
$scriptName = "offline-sop-proof"
$proofPath = "docs/proof/pwa/offline-sop-report.json"

Write-Host "=== Offline SOP Proof ===" -ForegroundColor Cyan

$result = @{
    scriptName = $scriptName
    timestamp  = (Get-Date).ToString("o")
    status     = "PASS"
    checks     = @()
}

# 1. 檢查 offlineSOP.ts 存在
$sopServicePath = "$WebDashboardPath/src/services/offlineSOP.ts"
$sopServiceExists = Test-Path $sopServicePath

$result.checks += @{
    name    = "Offline SOP Service File"
    passed  = $sopServiceExists
    details = if ($sopServiceExists) { "offlineSOP.ts exists" } else { "offlineSOP.ts not found" }
}

if ($sopServiceExists) {
    $sopContent = Get-Content $sopServicePath -Raw

    # 2. 檢查 IndexedDB 使用
    $hasIDB = $sopContent -match "openDB|IndexedDB|idb"
    $result.checks += @{
        name    = "IndexedDB Integration"
        passed  = $hasIDB
        details = if ($hasIDB) { "IndexedDB (idb) library used" } else { "No IndexedDB found" }
    }

    # 3. 檢查網路狀態監聽
    $hasOnlineListener = $sopContent -match "addEventListener\(['\"]online"
    $hasOfflineListener = $sopContent -match "addEventListener\(['\"]offline"
    $result.checks += @{
        name = "Network Status Listeners"
        passed = $hasOnlineListener -and $hasOfflineListener
        details = @{
            onlineListener = $hasOnlineListener
            offlineListener = $hasOfflineListener
        }
    }

    # 4. 檢查 API 呼叫
    $hasApiFetch = $sopContent -match "fetch\(['\"]\/api"
        $result.checks += @{
            name    = "API Integration"
            passed  = $hasApiFetch
            details = if ($hasApiFetch) { "API fetch calls found" } else { "No API calls found" }
        }

        # 5. 檢查 React Hook
        $hasHook = $sopContent -match "export function useOfflineSOP"
        $result.checks += @{
            name    = "React Hook Export"
            passed  = $hasHook
            details = if ($hasHook) { "useOfflineSOP hook exported" } else { "Hook not found" }
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

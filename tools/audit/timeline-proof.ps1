<#
.SYNOPSIS
    Timeline Proof Script
.DESCRIPTION
    驗證 Timeline 視覺化實作
#>
param(
    [string]$WebDashboardPath = "web-dashboard"
)

$ErrorActionPreference = "Stop"
$scriptName = "timeline-proof"
$proofPath = "docs/proof/timeline/timeline-api-contract.json"

Write-Host "=== Timeline Proof ===" -ForegroundColor Cyan

$result = @{
    scriptName = $scriptName
    timestamp  = (Get-Date).ToString("o")
    status     = "PASS"
    checks     = @()
}

# 1. 檢查 TimelineView.tsx
$timelineViewPath = "$WebDashboardPath/src/components/timeline/TimelineView.tsx"
$timelineViewExists = Test-Path $timelineViewPath

$result.checks += @{
    name    = "Timeline Component File"
    passed  = $timelineViewExists
    details = if ($timelineViewExists) { "TimelineView.tsx exists" } else { "TimelineView.tsx not found" }
}

if ($timelineViewExists) {
    $content = Get-Content $timelineViewPath -Raw

    # 2. 檢查 API 整合
    $hasApiFetch = $content -match "fetch\(['\`]\/api\/v1\/timeline"
    $result.checks += @{
        name    = "Timeline API Integration"
        passed  = $hasApiFetch
        details = if ($hasApiFetch) { "API fetch for /api/v1/timeline found" } else { "No timeline API call" }
    }

    # 3. 檢查時間範圍選擇器
    $hasTimeScale = $content -match "TimeScale|timeScale"
    $result.checks += @{
        name    = "Time Scale Selector"
        passed  = $hasTimeScale
        details = if ($hasTimeScale) { "Time scale selector implemented" } else { "No time scale found" }
    }

    # 4. 檢查篩選功能
    $hasFilterType = $content -match "filterType"
    $hasFilterSeverity = $content -match "filterSeverity"
    $result.checks += @{
        name    = "Event Filtering"
        passed  = $hasFilterType -and $hasFilterSeverity
        details = @{
            typeFilter     = $hasFilterType
            severityFilter = $hasFilterSeverity
        }
    }

    # 5. 檢查詳情面板
    $hasDetailPanel = $content -match "timeline-detail-panel|selectedEvent"
    $result.checks += @{
        name    = "Detail Panel"
        passed  = $hasDetailPanel
        details = if ($hasDetailPanel) { "Detail panel implemented" } else { "No detail panel" }
    }
}

# 6. 檢查 CSS
$cssPath = "$WebDashboardPath/src/components/timeline/TimelineView.css"
$cssExists = Test-Path $cssPath
$result.checks += @{
    name    = "Timeline CSS"
    passed  = $cssExists
    details = if ($cssExists) { "TimelineView.css exists" } else { "CSS file not found" }
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

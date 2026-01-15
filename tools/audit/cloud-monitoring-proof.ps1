<#
.SYNOPSIS
    Cloud Monitoring Proof Script
.DESCRIPTION
    驗證 Cloud Monitoring 規劃文件
#>
param()

$ErrorActionPreference = "Stop"
$scriptName = "cloud-monitoring-proof"
$proofPath = "docs/proof/infra/cloud-monitoring-evidence.json"

Write-Host "=== Cloud Monitoring Proof ===" -ForegroundColor Cyan

$result = @{
    scriptName = $scriptName
    timestamp  = (Get-Date).ToString("o")
    status     = "PASS"
    checks     = @()
}

# 1. 檢查規劃文件
$planPath = "docs/proof/infra/cloud-monitoring-plan.md"
$planExists = Test-Path $planPath

$result.checks += @{
    name    = "Monitoring Plan Document"
    passed  = $planExists
    details = if ($planExists) { "cloud-monitoring-plan.md exists" } else { "Plan document not found" }
}

if ($planExists) {
    $content = Get-Content $planPath -Raw

    # 2. 檢查 Terraform 配置
    $hasTerraform = $content -match "terraform|google_monitoring"
    $result.checks += @{
        name    = "Terraform Configuration"
        passed  = $hasTerraform
        details = if ($hasTerraform) { "Terraform IaC included" } else { "No Terraform found" }
    }

    # 3. 檢查告警策略
    $hasAlertPolicy = $content -match "alert_policy|alerting"
    $result.checks += @{
        name    = "Alert Policies Defined"
        passed  = $hasAlertPolicy
        details = if ($hasAlertPolicy) { "Alert policies documented" } else { "No alert policies" }
    }

    # 4. 檢查核心指標
    $hasLatency = $content -match "latency|延遲"
    $hasErrorRate = $content -match "error.rate|錯誤率"
    $hasCPU = $content -match "CPU|cpu"
    $result.checks += @{
        name    = "Core Metrics Covered"
        passed  = $hasLatency -and $hasErrorRate -and $hasCPU
        details = @{
            latency   = $hasLatency
            errorRate = $hasErrorRate
            cpu       = $hasCPU
        }
    }

    # 5. 檢查成本文件
    $hasCostInfo = $content -match "成本|cost"
    $result.checks += @{
        name    = "Cost Documentation"
        passed  = $hasCostInfo
        details = if ($hasCostInfo) { "Cost information included" } else { "No cost info" }
    }

    # 6. 檢查通知頻道
    $hasNotificationChannel = $content -match "notification_channel|Slack|Email|LINE"
    $result.checks += @{
        name    = "Notification Channels"
        passed  = $hasNotificationChannel
        details = if ($hasNotificationChannel) { "Notification channels documented" } else { "No channels" }
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

# Light Keepers - Batch 4 Verification Script
# High Side-Effect Modules (External calls, crons, queues, webhooks)
# Run after loading Batch 4 modules

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "[BATCH 4] High Side-Effect Modules Verification" -ForegroundColor Cyan
Write-Host "[BATCH 4] Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host ("=" * 60)

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$BackendPath = Join-Path $ProjectRoot "backend"
$AppModulePath = Join-Path $BackendPath "src\app.module.ts"

# ============================================================
# Batch 4 Expected Modules (High Side-Effect)
# ============================================================

$Batch4Modules = @(
    # Webhooks & Integrations
    @{ Name = "WebhooksModule"; File = "webhooks/webhooks.module.ts" },
    @{ Name = "NgoApiModule"; File = "ngo-api/ngo-api.module.ts" },
    @{ Name = "NgoIntegrationModule"; File = "ngo-integration/ngo-integration.module.ts" },
    @{ Name = "Fire119Module"; File = "fire-119/fire-119.module.ts" },
    @{ Name = "CitizenAppModule"; File = "citizen-app/citizen-app.module.ts" },
    @{ Name = "SatelliteCommModule"; File = "satellite-comm/satellite-comm.module.ts" },
    @{ Name = "SlackIntegrationModule"; File = "slack-integration/slack-integration.module.ts" },
    @{ Name = "TelegramBotModule"; File = "telegram-bot/telegram-bot.module.ts" },
    # AI & ML
    @{ Name = "AiPredictionModule"; File = "ai-prediction/ai-prediction.module.ts" },
    @{ Name = "AiVisionModule"; File = "ai-vision/ai-vision.module.ts" },
    @{ Name = "ImageRecognitionModule"; File = "image-recognition/image-recognition.module.ts" },
    @{ Name = "AerialImageAnalysisModule"; File = "aerial-image-analysis/aerial-image-analysis.module.ts" },
    @{ Name = "EmotionAnalysisModule"; File = "emotion-analysis/emotion-analysis.module.ts" },
    @{ Name = "EventAiModule"; File = "event-ai/event-ai.module.ts" },
    @{ Name = "AutoSummaryModule"; File = "auto-summary/auto-summary.module.ts" },
    @{ Name = "ChatbotAssistantModule"; File = "chatbot-assistant/chatbot-assistant.module.ts" },
    @{ Name = "RagKnowledgeModule"; File = "rag-knowledge/rag-knowledge.module.ts" },
    @{ Name = "DisasterSummaryModule"; File = "disaster-summary/disaster-summary.module.ts" },
    @{ Name = "FatigueDetectionModule"; File = "fatigue-detection/fatigue-detection.module.ts" },
    @{ Name = "DocumentOcrModule"; File = "document-ocr/document-ocr.module.ts" },
    @{ Name = "TranslationModule"; File = "translation/translation.module.ts" },
    # Scheduling & Dispatch
    @{ Name = "AutoDispatchModule"; File = "auto-dispatch/auto-dispatch.module.ts" },
    @{ Name = "SmartSchedulingModule"; File = "smart-scheduling/smart-scheduling.module.ts" },
    @{ Name = "ScheduledTasksModule"; File = "scheduled-tasks/scheduled-tasks.module.ts" },
    # Weather & Climate
    @{ Name = "WeatherModule"; File = "weather/weather.module.ts" },
    @{ Name = "WeatherAlertIntegrationModule"; File = "weather-alert-integration/weather-alert-integration.module.ts" },
    @{ Name = "TccipClimateModule"; File = "tccip-climate/tccip-climate.module.ts" },
    @{ Name = "TrendPredictionModule"; File = "trend-prediction/trend-prediction.module.ts" },
    @{ Name = "SocialMediaMonitorModule"; File = "social-media-monitor/social-media-monitor.module.ts" }
)

# ============================================================
# Step 1: Check if modules exist in filesystem
# ============================================================

Write-Host "`n[1/4] Checking module files exist..." -ForegroundColor Yellow

$existingModules = @()
$missingModules = @()

foreach ($mod in $Batch4Modules) {
    $modulePath = Join-Path $BackendPath "src\modules\$($mod.File)"
    if (Test-Path $modulePath) {
        $existingModules += $mod
    }
    else {
        $missingModules += $mod
    }
}

Write-Host "  Existing: $($existingModules.Count) / $($Batch4Modules.Count)"

# ============================================================
# Step 2: Check if modules are imported in app.module.ts
# ============================================================

Write-Host "`n[2/4] Checking app.module.ts imports..." -ForegroundColor Yellow

$appModuleContent = Get-Content $AppModulePath -Raw
$loadedModules = @()
$unloadedModules = @()

foreach ($mod in $existingModules) {
    if ($appModuleContent -match $mod.Name) {
        $loadedModules += $mod
    }
    else {
        $unloadedModules += $mod
    }
}

Write-Host "  Loaded: $($loadedModules.Count) / $($existingModules.Count)"

# ============================================================
# Step 3: TypeScript Build Check
# ============================================================

Write-Host "`n[3/4] Running TypeScript build check..." -ForegroundColor Yellow

Push-Location $BackendPath
try {
    $result = npx tsc --noEmit 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ TypeScript build PASSED" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ TypeScript build FAILED" -ForegroundColor Red
    }
}
finally {
    Pop-Location
}

# ============================================================
# Step 4: Total Module Count
# ============================================================

Write-Host "`n[4/4] Running full audit..." -ForegroundColor Yellow

& "$PSScriptRoot\audit-modules.ps1" | Select-Object -Last 10

# ============================================================
# Summary
# ============================================================

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "[BATCH 4 SUMMARY]" -ForegroundColor Cyan
Write-Host ("=" * 60)

Write-Host "`n  📁 Target Modules: $($Batch4Modules.Count)"
Write-Host "  📁 Files Exist: $($existingModules.Count)"
Write-Host "  📦 Loaded: $($loadedModules.Count)"
Write-Host "  ⏳ Unloaded: $($unloadedModules.Count)"

if ($unloadedModules.Count -gt 0 -and $unloadedModules.Count -le 15) {
    Write-Host "`n  ⚠️ Modules to Load:" -ForegroundColor Yellow
    foreach ($mod in $unloadedModules) {
        Write-Host "     - $($mod.Name)" -ForegroundColor Yellow
    }
}

# Exit code
if ($loadedModules.Count -eq $existingModules.Count -and $LASTEXITCODE -eq 0) {
    Write-Host "`n  ✅ BATCH 4 COMPLETE" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`n  🔄 BATCH 4 IN PROGRESS ($($loadedModules.Count)/$($existingModules.Count) loaded)" -ForegroundColor Yellow
    exit 1
}

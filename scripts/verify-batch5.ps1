# Light Keepers - Batch 5 Verification Script
# Remaining Infrastructure & Specialty Modules
# Run after loading Batch 5 modules

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "[BATCH 5] Remaining Modules Verification" -ForegroundColor Cyan
Write-Host "[BATCH 5] Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host ("=" * 60)

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$BackendPath = Join-Path $ProjectRoot "backend"
$AppModulePath = Join-Path $BackendPath "src\app.module.ts"

# ============================================================
# Batch 5 Expected Modules (Remaining 61)
# ============================================================

$Batch5Modules = @(
    # AR/VR
    @{ Name = "ArFieldGuidanceModule"; File = "ar-field-guidance/ar-field-guidance.module.ts" },
    @{ Name = "ArNavigationModule"; File = "ar-navigation/ar-navigation.module.ts" },
    @{ Name = "VrCommandModule"; File = "vr-command/vr-command.module.ts" },
    # Offline & Mobile
    @{ Name = "OfflineSyncModule"; File = "offline-sync/offline-sync.module.ts" },
    @{ Name = "OfflineMeshModule"; File = "offline-mesh/offline-mesh.module.ts" },
    @{ Name = "OfflineMapCacheModule"; File = "offline-map-cache/offline-map-cache.module.ts" },
    @{ Name = "OfflineTilesModule"; File = "offline-tiles/offline-tiles.module.ts" },
    @{ Name = "MobileSyncModule"; File = "mobile-sync/mobile-sync.module.ts" },
    @{ Name = "DeviceManagementModule"; File = "device-management/device-management.module.ts" },
    # Push Notifications
    @{ Name = "PushNotificationModule"; File = "push-notification/push-notification.module.ts" },
    @{ Name = "PushNotificationV2Module"; File = "push-notification-v2/push-notification-v2.module.ts" },
    # LINE & Social
    @{ Name = "LineLiffModule"; File = "line-liff/line-liff.module.ts" },
    @{ Name = "LineNotifyModule"; File = "line-notify/line-notify.module.ts" },
    # Blockchain & Security
    @{ Name = "BlockchainModule"; File = "blockchain/blockchain.module.ts" },
    @{ Name = "IntegrityLedgerModule"; File = "integrity-ledger/integrity-ledger.module.ts" },
    @{ Name = "SupplyChainBlockchainModule"; File = "supply-chain-blockchain/supply-chain-blockchain.module.ts" },
    @{ Name = "BiometricAuthModule"; File = "biometric-auth/biometric-auth.module.ts" },
    @{ Name = "TwoFactorAuthModule"; File = "two-factor-auth/two-factor-auth.module.ts" },
    @{ Name = "SecretRotationModule"; File = "secret-rotation/secret-rotation.module.ts" },
    @{ Name = "GdprComplianceModule"; File = "gdpr-compliance/gdpr-compliance.module.ts" },
    @{ Name = "IpWhitelistModule"; File = "ip-whitelist/ip-whitelist.module.ts" },
    @{ Name = "SessionTimeoutModule"; File = "session-timeout/session-timeout.module.ts" },
    @{ Name = "DataEncryptionModule"; File = "data-encryption/data-encryption.module.ts" },
    # Simulation & Training
    @{ Name = "DrillSimulationModule"; File = "drill-simulation/drill-simulation.module.ts" },
    @{ Name = "EvacuationSimModule"; File = "evacuation-sim/evacuation-sim.module.ts" },
    @{ Name = "DamageSimulationModule"; File = "damage-simulation/damage-simulation.module.ts" },
    # Specialty
    @{ Name = "AarAnalysisModule"; File = "aar-analysis/aar-analysis.module.ts" },
    @{ Name = "BimIntegrationModule"; File = "bim-integration/bim-integration.module.ts" },
    @{ Name = "Cesium3dModule"; File = "cesium-3d/cesium-3d.module.ts" },
    @{ Name = "DroneSwarmModule"; File = "drone-swarm/drone-swarm.module.ts" },
    @{ Name = "InsaragModule"; File = "insarag/insarag.module.ts" },
    @{ Name = "RobotRescueModule"; File = "robot-rescue/robot-rescue.module.ts" },
    @{ Name = "SpectrumAnalysisModule"; File = "spectrum-analysis/spectrum-analysis.module.ts" },
    @{ Name = "WaterResourcesModule"; File = "water-resources/water-resources.module.ts" },
    @{ Name = "WearableModule"; File = "wearable/wearable.module.ts" },
    # Communication
    @{ Name = "PttModule"; File = "ptt/ptt.module.ts" },
    @{ Name = "BluetoothAudioModule"; File = "bluetooth-audio/bluetooth-audio.module.ts" },
    @{ Name = "MediaStreamingModule"; File = "media-streaming/media-streaming.module.ts" },
    @{ Name = "RealtimeChatModule"; File = "realtime-chat/realtime-chat.module.ts" },
    @{ Name = "SpeechToTextModule"; File = "speech-to-text/speech-to-text.module.ts" },
    @{ Name = "VoiceAssistantModule"; File = "voice-assistant/voice-assistant.module.ts" },
    # Infrastructure
    @{ Name = "RedisCacheModule"; File = "redis-cache/redis-cache.module.ts" },
    @{ Name = "SentryModule"; File = "sentry/sentry.module.ts" },
    @{ Name = "QrScannerModule"; File = "qr-scanner/qr-scanner.module.ts" },
    @{ Name = "NfcModule"; File = "nfc/nfc.module.ts" },
    @{ Name = "IndoorPositioningModule"; File = "indoor-positioning/indoor-positioning.module.ts" },
    @{ Name = "GeofenceAlertModule"; File = "geofence-alert/geofence-alert.module.ts" },
    @{ Name = "GeoIntelModule"; File = "geo-intel/geo-intel.module.ts" },
    # Resource Management
    @{ Name = "ResourceMatchingModule"; File = "resource-matching/resource-matching.module.ts" },
    @{ Name = "ResourceOptimizationModule"; File = "resource-optimization/resource-optimization.module.ts" },
    @{ Name = "DonationTrackingModule"; File = "donation-tracking/donation-tracking.module.ts" },
    @{ Name = "PredictiveMaintenanceModule"; File = "predictive-maintenance/predictive-maintenance.module.ts" },
    # Admin & Finance
    @{ Name = "MultiEocModule"; File = "multi-eoc/multi-eoc.module.ts" },
    @{ Name = "MultiTenantModule"; File = "multi-tenant/multi-tenant.module.ts" },
    @{ Name = "PublicFinanceModule"; File = "public-finance/public-finance.module.ts" },
    @{ Name = "ExpenseReimbursementModule"; File = "expense-reimbursement/expense-reimbursement.module.ts" },
    @{ Name = "PowerBiModule"; File = "power-bi/power-bi.module.ts" },
    # Misc
    @{ Name = "MicroTaskModule"; File = "micro-task/micro-task.module.ts" },
    @{ Name = "FileUploadModule"; File = "file-upload/file-upload.module.ts" },
    @{ Name = "EmailTemplateModule"; File = "email-template/email-template.module.ts" }
)

# Step 1: Check if modules exist in filesystem
Write-Host "`n[1/4] Checking module files exist..." -ForegroundColor Yellow

$existingModules = @()
$missingModules = @()

foreach ($mod in $Batch5Modules) {
    $modulePath = Join-Path $BackendPath "src\modules\$($mod.File)"
    if (Test-Path $modulePath) {
        $existingModules += $mod
    }
    else {
        $missingModules += $mod
    }
}

Write-Host "  Existing: $($existingModules.Count) / $($Batch5Modules.Count)"

# Step 2: Check if modules are imported in app.module.ts
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

# Step 3: TypeScript Build Check
Write-Host "`n[3/4] Running TypeScript build check..." -ForegroundColor Yellow

Push-Location $BackendPath
try {
    npx tsc --noEmit 2>&1 | Out-Null
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

# Step 4: Total Module Count
Write-Host "`n[4/4] Running full audit..." -ForegroundColor Yellow

& "$PSScriptRoot\audit-modules.ps1" | Select-Object -Last 10

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "[BATCH 5 SUMMARY]" -ForegroundColor Cyan
Write-Host ("=" * 60)

Write-Host "`n  📁 Target Modules: $($Batch5Modules.Count)"
Write-Host "  📁 Files Exist: $($existingModules.Count)"
Write-Host "  📦 Loaded: $($loadedModules.Count)"
Write-Host "  ⏳ Unloaded: $($unloadedModules.Count)"

# Exit code
if ($loadedModules.Count -eq $existingModules.Count -and $LASTEXITCODE -eq 0) {
    Write-Host "`n  ✅ BATCH 5 COMPLETE - ALL MODULES LOADED!" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`n  🔄 BATCH 5 IN PROGRESS ($($loadedModules.Count)/$($existingModules.Count) loaded)" -ForegroundColor Yellow
    exit 1
}

# Light Keepers - Batch 2 Verification Script
# E2E Closed Loop Modules
# Run after loading Batch 2 modules

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "[BATCH 2] E2E Closed Loop Modules Verification" -ForegroundColor Cyan
Write-Host "[BATCH 2] Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host ("=" * 60)

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$BackendPath = Join-Path $ProjectRoot "backend"
$AppModulePath = Join-Path $BackendPath "src\app.module.ts"

# ============================================================
# Batch 2 Expected Modules
# ============================================================

$Batch2Modules = @(
    @{ Name = "EquipmentModule"; File = "equipment/equipment.module.ts"; Priority = "P1" },
    @{ Name = "AttendanceModule"; File = "attendance/attendance.module.ts"; Priority = "P1" },
    @{ Name = "SchedulerModule"; File = "scheduler/scheduler.module.ts"; Priority = "P1" },
    @{ Name = "VoiceModule"; File = "voice/voice.module.ts"; Priority = "P1" },
    @{ Name = "OrgChartModule"; File = "org-chart/org-chart.module.ts"; Priority = "P1" },
    @{ Name = "AiQueueModule"; File = "ai-queue/ai-queue.module.ts"; Priority = "P1" },
    @{ Name = "ShiftCalendarModule"; File = "shift-calendar/shift-calendar.module.ts"; Priority = "P2" },
    @{ Name = "PayrollModule"; File = "payroll/payroll.module.ts"; Priority = "P2" },
    @{ Name = "FeaturesModule"; File = "features/features.module.ts"; Priority = "P2" },
    @{ Name = "FilesModule"; File = "files/files.module.ts"; Priority = "P2" },
    @{ Name = "AuditModule"; File = "audit/audit.module.ts"; Priority = "P2" },
    @{ Name = "CacheModule"; File = "cache/cache.module.ts"; Priority = "P2" },
    @{ Name = "ErrorTrackingModule"; File = "error-tracking/error-tracking.module.ts"; Priority = "P2" },
    @{ Name = "PrometheusModule"; File = "prometheus/prometheus.module.ts"; Priority = "P2" }
)

# ============================================================
# Step 1: Check if modules exist in filesystem
# ============================================================

Write-Host "`n[1/4] Checking module files exist..." -ForegroundColor Yellow

$existingModules = @()
$missingModules = @()

foreach ($mod in $Batch2Modules) {
    $modulePath = Join-Path $BackendPath "src\modules\$($mod.File)"
    if (Test-Path $modulePath) {
        $existingModules += $mod
        if ($Verbose) {
            Write-Host "  ✓ $($mod.Name)" -ForegroundColor Green
        }
    }
    else {
        $missingModules += $mod
        Write-Host "  ✗ $($mod.Name) - FILE NOT FOUND" -ForegroundColor Red
    }
}

Write-Host "  Existing: $($existingModules.Count) / $($Batch2Modules.Count)"

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
        if ($Verbose) {
            Write-Host "  ✓ $($mod.Name) LOADED" -ForegroundColor Green
        }
    }
    else {
        $unloadedModules += $mod
        Write-Host "  ⚠ $($mod.Name) NOT LOADED" -ForegroundColor Yellow
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
        if ($Verbose) {
            Write-Host $result
        }
    }
}
finally {
    Pop-Location
}

# ============================================================
# Step 4: Module Count Verification
# ============================================================

Write-Host "`n[4/4] Running audit-modules..." -ForegroundColor Yellow

& "$PSScriptRoot\audit-modules.ps1" | Out-Null

# ============================================================
# Summary
# ============================================================

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "[BATCH 2 SUMMARY]" -ForegroundColor Cyan
Write-Host ("=" * 60)

Write-Host "`n  📁 Files Exist: $($existingModules.Count) / $($Batch2Modules.Count)"
Write-Host "  📦 Loaded: $($loadedModules.Count) / $($existingModules.Count)"
Write-Host "  ⏳ Unloaded: $($unloadedModules.Count)"

if ($missingModules.Count -gt 0) {
    Write-Host "`n  ❌ Missing Module Files:" -ForegroundColor Red
    foreach ($mod in $missingModules) {
        Write-Host "     - $($mod.Name)" -ForegroundColor Red
    }
}

if ($unloadedModules.Count -gt 0) {
    Write-Host "`n  ⚠️ Modules to Load:" -ForegroundColor Yellow
    foreach ($mod in $unloadedModules) {
        Write-Host "     - [$($mod.Priority)] $($mod.Name)" -ForegroundColor Yellow
    }
}

# Exit code
if ($loadedModules.Count -eq $existingModules.Count -and $LASTEXITCODE -eq 0) {
    Write-Host "`n  ✅ BATCH 2 COMPLETE" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`n  🔄 BATCH 2 IN PROGRESS" -ForegroundColor Yellow
    exit 1
}

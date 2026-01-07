# Light Keepers - Batch 3 Verification Script
# Low Side-Effect Modules (CRUD-only, no external calls)
# Run after loading Batch 3 modules

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "[BATCH 3] Low Side-Effect Modules Verification" -ForegroundColor Cyan
Write-Host "[BATCH 3] Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host ("=" * 60)

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$BackendPath = Join-Path $ProjectRoot "backend"
$AppModulePath = Join-Path $BackendPath "src\app.module.ts"

# ============================================================
# Batch 3 Expected Modules (Low Side-Effect)
# ============================================================

$Batch3Modules = @(
    # Dashboard & Visualization
    @{ Name = "DashboardModule"; File = "dashboard/dashboard.module.ts" },
    @{ Name = "DashboardAnalyticsModule"; File = "dashboard-analytics/dashboard-analytics.module.ts" },
    @{ Name = "DashboardBuilderModule"; File = "dashboard-builder/dashboard-builder.module.ts" },
    @{ Name = "HeatmapAnalyticsModule"; File = "heatmap-analytics/heatmap-analytics.module.ts" },
    @{ Name = "TimelineVisualizationModule"; File = "timeline-visualization/timeline-visualization.module.ts" },
    @{ Name = "D3ChartModule"; File = "d3-chart/d3-chart.module.ts" },
    # Reports
    @{ Name = "ReportBuilderModule"; File = "report-builder/report-builder.module.ts" },
    @{ Name = "ReportSchedulerModule"; File = "report-scheduler/report-scheduler.module.ts" },
    @{ Name = "PerformanceReportModule"; File = "performance-report/performance-report.module.ts" },
    @{ Name = "ExcelExportModule"; File = "excel-export/excel-export.module.ts" },
    @{ Name = "PdfGeneratorModule"; File = "pdf-generator/pdf-generator.module.ts" },
    # Operations
    @{ Name = "DroneOpsModule"; File = "drone-ops/drone-ops.module.ts" },
    @{ Name = "AirOpsModule"; File = "air-ops/air-ops.module.ts" },
    @{ Name = "TacticalMapsModule"; File = "tactical-maps/tactical-maps.module.ts" },
    @{ Name = "RoutingModule"; File = "routing/routing.module.ts" },
    # Community
    @{ Name = "ReunificationModule"; File = "reunification/reunification.module.ts" },
    @{ Name = "FamilyReunificationModule"; File = "family-reunification/family-reunification.module.ts" },
    @{ Name = "PsychologicalSupportModule"; File = "psychological-support/psychological-support.module.ts" },
    @{ Name = "PsychologicalTrackingModule"; File = "psychological-tracking/psychological-tracking.module.ts" },
    @{ Name = "CommunityResilienceModule"; File = "community-resilience/community-resilience.module.ts" },
    @{ Name = "DisasterCommunityModule"; File = "disaster-community/disaster-community.module.ts" },
    @{ Name = "CrowdReportingModule"; File = "crowd-reporting/crowd-reporting.module.ts" },
    # Volunteer
    @{ Name = "RewardsModule"; File = "rewards/rewards.module.ts" },
    @{ Name = "VolunteerPointsModule"; File = "volunteer-points/volunteer-points.module.ts" },
    @{ Name = "VolunteerCertificationModule"; File = "volunteer-certification/volunteer-certification.module.ts" },
    # Equipment
    @{ Name = "EquipmentQrModule"; File = "equipment-qr/equipment-qr.module.ts" },
    # Misc CRUD
    @{ Name = "MockDataModule"; File = "mock-data/mock-data.module.ts" },
    @{ Name = "I18nApiModule"; File = "i18n-api/i18n-api.module.ts" },
    @{ Name = "SwaggerAutoDocsModule"; File = "swagger-auto-docs/swagger-auto-docs.module.ts" },
    @{ Name = "SystemModule"; File = "system/system.module.ts" },
    @{ Name = "AuditLogModule"; File = "audit-log/audit-log.module.ts" }
)

# ============================================================
# Step 1: Check if modules exist in filesystem
# ============================================================

Write-Host "`n[1/4] Checking module files exist..." -ForegroundColor Yellow

$existingModules = @()
$missingModules = @()

foreach ($mod in $Batch3Modules) {
    $modulePath = Join-Path $BackendPath "src\modules\$($mod.File)"
    if (Test-Path $modulePath) {
        $existingModules += $mod
        if ($Verbose) {
            Write-Host "  ✓ $($mod.Name)" -ForegroundColor Green
        }
    }
    else {
        $missingModules += $mod
        if ($Verbose) {
            Write-Host "  ✗ $($mod.Name) - NOT FOUND" -ForegroundColor Red
        }
    }
}

Write-Host "  Existing: $($existingModules.Count) / $($Batch3Modules.Count)"
if ($missingModules.Count -gt 0) {
    Write-Host "  Missing: $($missingModules.Count) (some modules may not exist yet)" -ForegroundColor Yellow
}

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
        if ($Verbose) {
            Write-Host $result
        }
    }
}
finally {
    Pop-Location
}

# ============================================================
# Step 4: Summary
# ============================================================

Write-Host "`n[4/4] Audit Summary..." -ForegroundColor Yellow

& "$PSScriptRoot\audit-modules.ps1" | Select-Object -Last 10

# ============================================================
# Summary
# ============================================================

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "[BATCH 3 SUMMARY]" -ForegroundColor Cyan
Write-Host ("=" * 60)

Write-Host "`n  📁 Target Modules: $($Batch3Modules.Count)"
Write-Host "  📁 Files Exist: $($existingModules.Count)"
Write-Host "  📦 Loaded: $($loadedModules.Count)"
Write-Host "  ⏳ Unloaded: $($unloadedModules.Count)"

if ($unloadedModules.Count -gt 0 -and $unloadedModules.Count -le 10) {
    Write-Host "`n  ⚠️ Modules to Load:" -ForegroundColor Yellow
    foreach ($mod in $unloadedModules) {
        Write-Host "     - $($mod.Name)" -ForegroundColor Yellow
    }
}

# Exit code
if ($loadedModules.Count -eq $existingModules.Count -and $LASTEXITCODE -eq 0) {
    Write-Host "`n  ✅ BATCH 3 COMPLETE" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`n  🔄 BATCH 3 IN PROGRESS ($($loadedModules.Count)/$($existingModules.Count) loaded)" -ForegroundColor Yellow
    exit 1
}

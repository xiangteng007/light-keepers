# DB Migration Proof Script (SEC-SD.2 P0-1)
# Verifies migration file exists and generates evidence

param(
    [switch]$Strict
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

Write-Host "`n=== DB Migration Verification (SEC-SD.2 P0-1) ===" -ForegroundColor Cyan

$migrationsDir = "$repoRoot\backend\src\migrations"
$reportPath = "$repoRoot\docs\proof\db\deleted-at-migration-report.json"
$mdReportPath = "$repoRoot\docs\proof\db\deleted-at-migration-report.md"

# Ensure output directory exists
$outputDir = Split-Path -Parent $reportPath
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Required tables for deleted_at
$requiredTables = @("reports", "volunteers", "dispatch_tasks", "mission_sessions")

# Check 1: Find migration files with DeletedAt
Write-Host "`n[1/3] Searching for deleted_at migration..." -ForegroundColor Yellow
$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*AddDeletedAtColumns*.ts" -ErrorAction SilentlyContinue

$migrationFound = $false
$migrationName = ""
$affectedTables = @()

if ($migrationFiles -and $migrationFiles.Count -gt 0) {
    $migrationFile = $migrationFiles[0]
    $migrationName = $migrationFile.Name
    $migrationFound = $true
    Write-Host "  [PASS] Found migration: $migrationName" -ForegroundColor Green
    
    # Parse migration content for affected tables
    $content = Get-Content $migrationFile.FullName -Raw
    
    foreach ($table in $requiredTables) {
        if ($content -match "ALTER TABLE `"$table`" ADD `"deleted_at`"") {
            $affectedTables += $table
            Write-Host "  [PASS] Table '$table' has deleted_at column" -ForegroundColor Green
        }
    }
}
else {
    Write-Host "  [FAIL] No AddDeletedAtColumns migration found" -ForegroundColor Red
}

# Check 2: Verify all required tables are covered
Write-Host "`n[2/3] Verifying table coverage..." -ForegroundColor Yellow
$missingTables = @()
foreach ($table in $requiredTables) {
    if ($affectedTables -notcontains $table) {
        $missingTables += $table
        Write-Host "  [FAIL] Missing: $table" -ForegroundColor Red
    }
}

if ($missingTables.Count -eq 0) {
    Write-Host "  [PASS] All required tables covered" -ForegroundColor Green
}

# Check 3: Verify down() method exists (rollback support)
Write-Host "`n[3/3] Checking rollback support..." -ForegroundColor Yellow
$hasRollback = $false
if ($migrationFound) {
    $content = Get-Content $migrationFiles[0].FullName -Raw
    if ($content -match "public async down\(queryRunner") {
        $hasRollback = $true
        Write-Host "  [PASS] down() method found (rollback supported)" -ForegroundColor Green
    }
    else {
        Write-Host "  [FAIL] down() method not found" -ForegroundColor Red
    }
}

# Determine status
$allChecksPass = $migrationFound -and ($missingTables.Count -eq 0) -and $hasRollback
$status = if ($allChecksPass) { "PASS" } else { "FAIL" }

# Generate JSON report
$report = @{
    version     = "1.0.0"
    generatedAt = (Get-Date).ToString("o")
    status      = $status
    ok          = $allChecksPass
    checks      = @{
        migrationFileExists    = $migrationFound
        allTablesHaveDeletedAt = ($missingTables.Count -eq 0)
        rollbackSupported      = $hasRollback
    }
    details     = @{
        migrationName  = $migrationName
        affectedTables = $affectedTables
        missingTables  = $missingTables
        requiredTables = $requiredTables
    }
}

$report | ConvertTo-Json -Depth 5 | Set-Content $reportPath -Encoding UTF8
Write-Host "`n[OUTPUT] $reportPath" -ForegroundColor Cyan

# Generate MD report
$mdContent = @"
# DB Migration Verification Report (SEC-SD.2 P0-1)

**Generated**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Status**: $status

---

## Summary

| Check | Status |
|-------|--------|
| Migration file exists | $(if ($migrationFound) { '✅ PASS' } else { '❌ FAIL' }) |
| All tables have deleted_at | $(if ($missingTables.Count -eq 0) { '✅ PASS' } else { '❌ FAIL' }) |
| Rollback supported | $(if ($hasRollback) { '✅ PASS' } else { '❌ FAIL' }) |

---

## Migration Details

- **File**: ``$migrationName``
- **Affected Tables**: $(($affectedTables | ForEach-Object { "``$_``" }) -join ', ')

---

## Required Tables

$(($requiredTables | ForEach-Object { 
    if ($affectedTables -contains $_) { "- [x] ``$_``" } else { "- [ ] ``$_``" }
}) -join "`n")
"@

$mdContent | Set-Content $mdReportPath -Encoding UTF8
Write-Host "[OUTPUT] $mdReportPath" -ForegroundColor Cyan

# Final result
Write-Host "`n=== Result: $status ===" -ForegroundColor $(if ($status -eq "PASS") { "Green" } else { "Red" })

if ($Strict -and $status -ne "PASS") {
    Write-Host "[STRICT] DB Migration check failed" -ForegroundColor Red
    exit 1
}

exit 0

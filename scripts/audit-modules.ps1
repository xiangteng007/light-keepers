# Light Keepers - Module Audit Script
# Scans backend modules and compares against app.module.ts imports

param(
    [switch]$Verbose,
    [switch]$JsonOutput
)

$ErrorActionPreference = "Stop"
$BackendPath = Join-Path $PSScriptRoot "..\backend\src"

Write-Host ("=" * 60)
Write-Host "[AUDIT] Light Keepers Module Audit"
Write-Host "[AUDIT] Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ("=" * 60)

# 1. Get all module directories from backend/src/modules
$ModulesPath = Join-Path $BackendPath "modules"
$AllModuleDirs = Get-ChildItem -Path $ModulesPath -Directory | Select-Object -ExpandProperty Name | Sort-Object

# 2. Get all core module directories from backend/src/core
$CorePath = Join-Path $BackendPath "core"
$CoreModuleDirs = Get-ChildItem -Path $CorePath -Directory | Select-Object -ExpandProperty Name | Sort-Object

# 3. Read app.module.ts and extract imports
$AppModulePath = Join-Path $BackendPath "app.module.ts"
$AppModuleContent = Get-Content $AppModulePath -Raw

# Extract module names from imports (pattern: from './modules/xxx)
$LoadedModules = @()
$ImportPattern = "from\s+[`"']\.\/modules\/([^\/`"']+)"
$RegexMatches = [regex]::Matches($AppModuleContent, $ImportPattern)
foreach ($match in $RegexMatches) {
    $LoadedModules += $match.Groups[1].Value
}

# Also check for modules imported via core/
$CoreImportPattern = "from\s+[`"']\.\/core"
$CoreLoaded = [regex]::IsMatch($AppModuleContent, $CoreImportPattern)

# Unique and sort
$LoadedModules = $LoadedModules | Sort-Object -Unique

Write-Host ""
Write-Host "[STATS] Feature Modules in filesystem: $($AllModuleDirs.Count)"
Write-Host "[STATS] Feature Modules loaded in app.module.ts: $($LoadedModules.Count)"
Write-Host "[STATS] Core Domains in filesystem: $($CoreModuleDirs.Count)"
Write-Host "[STATS] Core Domains loaded: $(if ($CoreLoaded) { 'YES' } else { 'NO' })"
Write-Host ""

# 4. Find unloaded modules
$UnloadedModules = $AllModuleDirs | Where-Object { $_ -notin $LoadedModules }

Write-Host "[UNLOADED] Feature Modules NOT in app.module.ts ($($UnloadedModules.Count)):"
Write-Host ("-" * 60)

# Categorize by priority
$P1Modules = @('triage', 'location', 'task-dispatch', 'attendance', 'org-chart', 'equipment', 'ai-queue', 'voice', 'scheduler')
$P2Modules = @('shift-calendar', 'payroll', 'audit', 'files', 'features', 'cache', 'prometheus', 'error-tracking')

foreach ($mod in $UnloadedModules) {
    $priority = "P3"
    if ($mod -in $P1Modules) { $priority = "P1" }
    elseif ($mod -in $P2Modules) { $priority = "P2" }
    
    $modPath = "modules/$mod"
    if ($Verbose) {
        Write-Host "  [$priority] $mod - $modPath"
    }
    else {
        Write-Host "  [$priority] $mod"
    }
}

Write-Host ""
Write-Host "[CORE] Core Domain Modules:"
Write-Host ("-" * 60)
foreach ($core in $CoreModuleDirs) {
    $status = if ($CoreLoaded) { "PENDING" } else { "NOT LOADED" }
    Write-Host "  [$status] $core"
}

# 5. Summary
Write-Host ""
Write-Host ("=" * 60)
Write-Host "[SUMMARY]"
Write-Host "  Total Feature Modules: $($AllModuleDirs.Count)"
Write-Host "  Loaded Feature Modules: $($LoadedModules.Count)"
Write-Host "  Unloaded Feature Modules: $($UnloadedModules.Count)"
Write-Host "  Core Domains: $($CoreModuleDirs.Count) (Loaded: $CoreLoaded)"
Write-Host "  P1 Unloaded: $(($UnloadedModules | Where-Object { $_ -in $P1Modules }).Count)"
Write-Host ("=" * 60)

# JSON output for CI
if ($JsonOutput) {
    $result = @{
        timestamp         = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss')
        totalModules      = $AllModuleDirs.Count
        loadedModules     = $LoadedModules.Count
        unloadedModules   = $UnloadedModules.Count
        coreDomainsLoaded = $CoreLoaded
        unloadedList      = $UnloadedModules
        coreList          = $CoreModuleDirs
    }
    $result | ConvertTo-Json -Depth 3
}

exit 0

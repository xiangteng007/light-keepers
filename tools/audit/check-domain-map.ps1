# tools/audit/check-domain-map.ps1
# Domain Map Integrity Gate (G6)
# v1.2.0
# - Validates module/page references exist in codebase
# - Outputs to docs/proof/logs/T0-domain-map-check.json
# - Soft mode (default): WARN on missing, exit 0
# - Strict mode: FAIL on missing, exit 1

param(
    [string]$RootDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$DomainMapPath = "docs/architecture/domain-map.yaml",
    [string]$OutDir = "docs/proof/logs",
    [string]$BackendModulesRoot = "backend/src/modules",
    [string]$FrontendPagesRoot = "",
    [switch]$Strict = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
    if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

function Resolve-FrontendPagesRoot() {
    if (![string]::IsNullOrWhiteSpace($FrontendPagesRoot) -and (Test-Path (Join-Path $RootDir $FrontendPagesRoot))) {
        return $FrontendPagesRoot
    }
    foreach ($c in @(
            "web-dashboard/src/pages",
            "frontend/src/pages",
            "client/src/pages",
            "apps/web/src/pages",
            "src/pages"
        )) {
        if (Test-Path (Join-Path $RootDir $c)) { return $c }
    }
    return ""
}

function Get-BackendModules([string]$root) {
    $absRoot = Join-Path $RootDir $root
    if (!(Test-Path $absRoot)) { return @() }
    return (Get-ChildItem $absRoot -Directory | Select-Object -ExpandProperty Name)
}

function Get-FrontendPages([string]$root) {
    if ([string]::IsNullOrWhiteSpace($root)) { return @() }
    $absRoot = Join-Path $RootDir $root
    if (!(Test-Path $absRoot)) { return @() }
    $files = Get-ChildItem $absRoot -Recurse -File | Where-Object { $_.Extension -in @(".tsx", ".jsx") }
    return ($files | ForEach-Object { $_.BaseName } | Sort-Object -Unique)
}

function Parse-DomainMapReferences([string]$yamlText) {
    $refs = [ordered]@{
        allModules = New-Object System.Collections.Generic.HashSet[string]
        allPages   = New-Object System.Collections.Generic.HashSet[string]
    }

    $block = ""
    $currentList = ""
    $lines = $yamlText -split "`r?`n"

    foreach ($line in $lines) {
        if ($line -match '^\s*domains:\s*$') { $block = "domains"; $currentList = ""; continue }
        if ($line -match '^\s*crossDomain:\s*$' -or $line -match '^\s*crossDomains:\s*$') { $block = "crossDomains"; $currentList = ""; continue }

        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+modules:\s*$') { $currentList = "modules"; continue }
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+pages:\s*$') { $currentList = "pages"; continue }
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+keyRoutes:\s*$') { $currentList = "skip"; continue }
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+(name|description):\s*') { $currentList = "skip"; continue }

        if ($block -in @("domains", "crossDomains") -and $currentList -in @("modules", "pages") -and $line -match '^\s+-\s+(.+?)\s*$') {
            $item = $Matches[1].Trim()
            if ([string]::IsNullOrWhiteSpace($item)) { continue }
            if ($currentList -eq "modules") { $refs.allModules.Add($item) | Out-Null }
            if ($currentList -eq "pages") { $refs.allPages.Add($item) | Out-Null }
        }
    }

    return $refs
}

# -----------------------------
# Main
# -----------------------------
$absMapPath = Join-Path $RootDir $DomainMapPath
if (!(Test-Path $absMapPath)) { throw "Missing domain map: $absMapPath" }

$absOutDir = Join-Path $RootDir $OutDir
Ensure-Dir $absOutDir

$pagesRoot = Resolve-FrontendPagesRoot
$backendModules = Get-BackendModules $BackendModulesRoot
$frontendPages = Get-FrontendPages $pagesRoot

$yamlText = Get-Content $absMapPath -Raw -Encoding UTF8
$refs = Parse-DomainMapReferences $yamlText

$missingModules = @()
foreach ($m in $refs.allModules) { if ($backendModules -notcontains $m) { $missingModules += $m } }

$missingPages = @()
foreach ($p in $refs.allPages) { if ($frontendPages -notcontains $p) { $missingPages += $p } }

$ok = ($missingModules.Count -eq 0 -and $missingPages.Count -eq 0)
$status = if ($ok) { "PASS" } else { if ($Strict) { "FAIL" } else { "WARN" } }

$outJson = Join-Path $absOutDir "T0-domain-map-check.json"
$outMd = Join-Path $absOutDir "T0-domain-map-check.md"

$payload = [pscustomobject]@{
    version            = "1.2.0"
    generatedAt        = (Get-Date).ToString("o")
    status             = $status
    strictMode         = $Strict.IsPresent
    domainMapPath      = $DomainMapPath
    backendModulesRoot = $BackendModulesRoot
    frontendPagesRoot  = $pagesRoot
    counts             = @{
        scannedBackendModules = $backendModules.Count
        scannedFrontendPages  = $frontendPages.Count
        referencedModules     = $refs.allModules.Count
        referencedPages       = $refs.allPages.Count
        missingModules        = $missingModules.Count
        missingPages          = $missingPages.Count
    }
    missing            = @{
        modules = ($missingModules | Sort-Object)
        pages   = ($missingPages | Sort-Object)
    }
    ok                 = $ok
}

$payload | ConvertTo-Json -Depth 10 | Set-Content -Path $outJson -Encoding UTF8

$mdContent = @"
# Domain Map Check Report (Evidence)

- DomainMap: ``$DomainMapPath``
- BackendModulesRoot: ``$BackendModulesRoot``
- FrontendPagesRoot: ``$pagesRoot``
- GeneratedAt: ``$($payload.generatedAt)``
- Strict: ``$($payload.strictMode)``
- Status: **$status**
- OK: **$ok**

## Counts
| Metric | Value |
|--------|-------|
| scannedBackendModules | $($payload.counts.scannedBackendModules) |
| scannedFrontendPages | $($payload.counts.scannedFrontendPages) |
| referencedModules | $($payload.counts.referencedModules) |
| referencedPages | $($payload.counts.referencedPages) |
| missingModules | $($payload.counts.missingModules) |
| missingPages | $($payload.counts.missingPages) |

## Missing Modules
$(if ($missingModules.Count -eq 0) { "- (none)" } else { ($missingModules | Sort-Object | ForEach-Object { "- $_" }) -join "`n" })

## Missing Pages
$(if ($missingPages.Count -eq 0) { "- (none)" } else { ($missingPages | Sort-Object | ForEach-Object { "- $_" }) -join "`n" })
"@

Set-Content -Path $outMd -Value $mdContent -Encoding UTF8

Write-Host "[check-domain-map] Written: $outMd"
Write-Host "[check-domain-map] Written: $outJson"
Write-Host "[check-domain-map] OK: $ok (status=$status)"

if ($ok) { exit 0 }
if ($Strict) { exit 1 }
exit 0

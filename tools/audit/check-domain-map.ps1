# tools/audit/check-domain-map.ps1
# Validates domain-map.yaml references: modules and pages must exist in repo

param(
    [string]$DomainMapPath = "docs/architecture/domain-map.yaml",
    [string]$OutDir = "docs/proof/logs",
    [string]$BackendModulesRoot = "backend/src/modules",
    [string]$FrontendPagesRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
    if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

function Resolve-FrontendPagesRoot() {
    if (![string]::IsNullOrWhiteSpace($FrontendPagesRoot) -and (Test-Path $FrontendPagesRoot)) {
        return $FrontendPagesRoot
    }
    foreach ($c in @(
            "web-dashboard/src/pages",
            "frontend/src/pages",
            "client/src/pages",
            "apps/web/src/pages",
            "src/pages"
        )) {
        if (Test-Path $c) { return $c }
    }
    return ""
}

function Get-BackendModules([string]$root) {
    if (!(Test-Path $root)) { return @() }
    return (Get-ChildItem $root -Directory | Select-Object -ExpandProperty Name)
}

function Get-FrontendPages([string]$root) {
    if ([string]::IsNullOrWhiteSpace($root)) { return @() }
    if (!(Test-Path $root)) { return @() }

    $files = Get-ChildItem $root -Recurse -File | Where-Object { $_.Extension -in @(".tsx", ".jsx") }
    $names = $files | ForEach-Object { $_.BaseName } | Sort-Object -Unique
    return $names
}

function Parse-DomainMapReferences([string]$yamlText) {
    $refs = [ordered]@{
        domains      = @{}
        crossDomains = @{}
        allModules   = New-Object System.Collections.Generic.HashSet[string]
        allPages     = New-Object System.Collections.Generic.HashSet[string]
    }

    $block = ""
    $currentKey = ""
    $currentList = ""

    $lines = $yamlText -split "`r?`n"

    foreach ($line in $lines) {
        if ($line -match '^\s*domains:\s*$') {
            $block = "domains"
            $currentKey = ""
            $currentList = ""
            continue
        }
        if ($line -match '^\s*crossDomain:\s*$' -or $line -match '^\s*crossDomains:\s*$') {
            $block = "crossDomains"
            $currentKey = ""
            $currentList = ""
            continue
        }

        # Domain key under domains/crossDomains (2 spaces indent)
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s{2}([a-zA-Z0-9_-]+):\s*$') {
            $currentKey = $Matches[1]
            $currentList = ""
            if ($block -eq "domains") {
                if (-not $refs.domains.ContainsKey($currentKey)) {
                    $refs.domains[$currentKey] = [ordered]@{ modules = @(); pages = @() }
                }
            }
            else {
                if (-not $refs.crossDomains.ContainsKey($currentKey)) {
                    $refs.crossDomains[$currentKey] = [ordered]@{ modules = @(); pages = @() }
                }
            }
            continue
        }

        # list selector
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+modules:\s*$') { $currentList = "modules"; continue }
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+pages:\s*$') { $currentList = "pages"; continue }
        # Skip keyRoutes - they are API routes, not pages
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+keyRoutes:\s*$') { $currentList = "skip"; continue }
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+description:\s*') { $currentList = "skip"; continue }
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+name:\s*') { $currentList = "skip"; continue }

        # list item (only process modules and pages, skip others)
        if ($block -in @("domains", "crossDomains") -and $currentList -in @("modules", "pages") -and $line -match '^\s+-\s+(.+?)\s*$') {
            $item = $Matches[1].Trim()
            if ([string]::IsNullOrWhiteSpace($item)) { continue }

            if ($block -eq "domains") {
                if ($currentList -eq "modules") { $refs.domains[$currentKey].modules += $item; $refs.allModules.Add($item) | Out-Null }
                if ($currentList -eq "pages") { $refs.domains[$currentKey].pages += $item; $refs.allPages.Add($item) | Out-Null }
            }
            else {
                if ($currentList -eq "modules") { $refs.crossDomains[$currentKey].modules += $item; $refs.allModules.Add($item) | Out-Null }
                if ($currentList -eq "pages") { $refs.crossDomains[$currentKey].pages += $item; $refs.allPages.Add($item) | Out-Null }
            }
        }
    }

    return $refs
}

# -----------------------------
# Main
# -----------------------------
if (!(Test-Path $DomainMapPath)) {
    throw "Missing domain map: $DomainMapPath"
}

Ensure-Dir $OutDir

$pagesRoot = Resolve-FrontendPagesRoot
$backendModules = Get-BackendModules $BackendModulesRoot
$frontendPages = Get-FrontendPages $pagesRoot

$yamlText = Get-Content $DomainMapPath -Raw -Encoding UTF8
$refs = Parse-DomainMapReferences $yamlText

$missingModules = @()
foreach ($m in $refs.allModules) {
    if ($backendModules -notcontains $m) { $missingModules += $m }
}

$missingPages = @()
foreach ($p in $refs.allPages) {
    if ($frontendPages -notcontains $p) { $missingPages += $p }
}

$ok = ($missingModules.Count -eq 0 -and $missingPages.Count -eq 0)

$outJson = Join-Path $OutDir "T0-domain-map-check.json"
$outMd = Join-Path $OutDir "T0-domain-map-check.md"

$payload = [pscustomobject]@{
    version            = "1.0.0"
    generatedAt        = (Get-Date).ToString("o")
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
Write-Host "[check-domain-map] OK: $ok"

if ($ok) { exit 0 } else { exit 1 }

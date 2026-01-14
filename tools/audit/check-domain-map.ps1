# ============================================
# FILE: tools/audit/check-domain-map.ps1
# VERSION: 1.1.0
# PURPOSE:
# - Validate domain-map.yaml references: modules/pages MUST exist
# - Validate keyRoutes MUST exist (prefix-match) in route-mapping (if available)
# OUTPUT:
# - docs/proof/logs/T0-domain-map-check.json/.md
# ============================================

param(
    [string]$DomainMapPath = "docs/architecture/domain-map.yaml",
    [string]$OutDir = "docs/proof/logs",
    [string]$BackendModulesRoot = "backend/src/modules",
    [string]$FrontendPagesRoot = "",
    [string]$RouteMappingPath = "docs/proof/security/T1-routes-guards-mapping.json"
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

    $files = Get-ChildItem $root -Recurse -File | Where-Object { $_.Extension -in @(".tsx", ".jsx", ".ts", ".js") }
    $names = $files | ForEach-Object { $_.BaseName } | Sort-Object -Unique
    return $names
}

function Get-RoutePathsFromMapping([string]$mappingPath) {
    if (!(Test-Path $mappingPath)) { return @() }
    $raw = Get-Content $mappingPath -Raw -Encoding UTF8
    $json = $raw | ConvertFrom-Json

    $routes = @()
    if ($null -ne $json.routes) { $routes = $json.routes }
    elseif ($null -ne $json.mapping) { $routes = $json.mapping }
    elseif ($null -ne $json.data -and $null -ne $json.data.routes) { $routes = $json.data.routes }
    elseif ($json -is [System.Collections.IEnumerable]) { $routes = $json }
    else { $routes = @() }

    $paths = @()
    foreach ($r in $routes) {
        if ($null -ne $r.path) { $paths += "$($r.path)" }
        elseif ($null -ne $r.route) { $paths += "$($r.route)" }
        elseif ($null -ne $r.url) { $paths += "$($r.url)" }
    }

    return ($paths | Sort-Object -Unique)
}

function Parse-DomainMapReferences([string]$yamlText) {
    $refs = [ordered]@{
        domains      = @{}
        crossDomains = @{}
        allModules   = New-Object System.Collections.Generic.HashSet[string]
        allPages     = New-Object System.Collections.Generic.HashSet[string]
        allKeyRoutes = New-Object System.Collections.Generic.HashSet[string]
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
        if ($line -match '^\s*crossDomains:\s*$' -or $line -match '^\s*crossDomain:\s*$') {
            $block = "crossDomains"
            $currentKey = ""
            $currentList = ""
            continue
        }

        if ($block -in @("domains", "crossDomains") -and $line -match '^\s{2}([a-zA-Z0-9_-]+):\s*$') {
            $currentKey = $Matches[1]
            $currentList = ""
            if ($block -eq "domains") {
                if (-not $refs.domains.ContainsKey($currentKey)) {
                    $refs.domains[$currentKey] = [ordered]@{ modules = @(); pages = @(); keyRoutes = @() }
                }
            }
            else {
                if (-not $refs.crossDomains.ContainsKey($currentKey)) {
                    $refs.crossDomains[$currentKey] = [ordered]@{ modules = @(); pages = @(); keyRoutes = @() }
                }
            }
            continue
        }

        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+modules:\s*$') { $currentList = "modules"; continue }
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+pages:\s*$') { $currentList = "pages"; continue }
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+keyRoutes:\s*$') { $currentList = "keyRoutes"; continue }
        # Skip non-list fields
        if ($block -in @("domains", "crossDomains") -and $line -match '^\s+(name|description):\s*') { $currentList = "skip"; continue }

        if ($block -in @("domains", "crossDomains") -and $currentList -in @("modules", "pages", "keyRoutes") -and $line -match '^\s+-\s+(.+?)\s*$') {
            $item = $Matches[1].Trim()
            if ([string]::IsNullOrWhiteSpace($item)) { continue }

            if ($block -eq "domains") {
                if ($currentList -eq "modules") { $refs.domains[$currentKey].modules += $item; $refs.allModules.Add($item) | Out-Null }
                if ($currentList -eq "pages") { $refs.domains[$currentKey].pages += $item; $refs.allPages.Add($item) | Out-Null }
                if ($currentList -eq "keyRoutes") { $refs.domains[$currentKey].keyRoutes += $item; $refs.allKeyRoutes.Add($item) | Out-Null }
            }
            else {
                if ($currentList -eq "modules") { $refs.crossDomains[$currentKey].modules += $item; $refs.allModules.Add($item) | Out-Null }
                if ($currentList -eq "pages") { $refs.crossDomains[$currentKey].pages += $item; $refs.allPages.Add($item) | Out-Null }
                if ($currentList -eq "keyRoutes") { $refs.crossDomains[$currentKey].keyRoutes += $item; $refs.allKeyRoutes.Add($item) | Out-Null }
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

$routeMappingAvailable = (Test-Path $RouteMappingPath)
$mappedPaths = @()
$missingKeyRoutes = @()

if ($routeMappingAvailable) {
    $mappedPaths = Get-RoutePathsFromMapping $RouteMappingPath

    foreach ($kr in $refs.allKeyRoutes) {
        # Prefix match allows /api/v1/events to match /api/v1/events/:id etc.
        $hit = $false
        foreach ($rp in $mappedPaths) {
            if ($rp.StartsWith($kr)) { $hit = $true; break }
        }
        if (-not $hit) { $missingKeyRoutes += $kr }
    }
}

$ok = ($missingModules.Count -eq 0 -and $missingPages.Count -eq 0 -and (($routeMappingAvailable -and $missingKeyRoutes.Count -eq 0) -or (-not $routeMappingAvailable)))

$outJson = Join-Path $OutDir "T0-domain-map-check.json"
$outMd = Join-Path $OutDir "T0-domain-map-check.md"

$payload = [pscustomobject]@{
    version               = "1.1.0"
    generatedAt           = (Get-Date).ToString("o")
    domainMapPath         = $DomainMapPath
    backendModulesRoot    = $BackendModulesRoot
    frontendPagesRoot     = $pagesRoot
    routeMappingPath      = $RouteMappingPath
    routeMappingAvailable = $routeMappingAvailable
    counts                = @{
        scannedBackendModules = $backendModules.Count
        scannedFrontendPages  = $frontendPages.Count
        referencedModules     = $refs.allModules.Count
        referencedPages       = $refs.allPages.Count
        referencedKeyRoutes   = $refs.allKeyRoutes.Count
        scannedMappedPaths    = $mappedPaths.Count
        missingModules        = $missingModules.Count
        missingPages          = $missingPages.Count
        missingKeyRoutes      = $missingKeyRoutes.Count
    }
    missing               = @{
        modules   = ($missingModules | Sort-Object)
        pages     = ($missingPages | Sort-Object)
        keyRoutes = ($missingKeyRoutes | Sort-Object)
    }
    ok                    = $ok
}

$payload | ConvertTo-Json -Depth 10 | Set-Content -Path $outJson -Encoding UTF8

@"
# Domain Map Check Report (Evidence)

- DomainMap: ``$DomainMapPath``
- BackendModulesRoot: ``$BackendModulesRoot``
- FrontendPagesRoot: ``$pagesRoot``
- RouteMappingPath: ``$RouteMappingPath``
- RouteMappingAvailable: **$routeMappingAvailable**
- GeneratedAt: ``$($payload.generatedAt)``
- OK: **$ok**

## Counts
| Metric | Value |
|--------|-------|
| scannedBackendModules | $($payload.counts.scannedBackendModules) |
| scannedFrontendPages | $($payload.counts.scannedFrontendPages) |
| referencedModules | $($payload.counts.referencedModules) |
| referencedPages | $($payload.counts.referencedPages) |
| referencedKeyRoutes | $($payload.counts.referencedKeyRoutes) |
| scannedMappedPaths | $($payload.counts.scannedMappedPaths) |
| missingModules | $($payload.counts.missingModules) |
| missingPages | $($payload.counts.missingPages) |
| missingKeyRoutes | $($payload.counts.missingKeyRoutes) |

## Missing Modules
$(
  if ($missingModules.Count -eq 0) { "- (none)" }
  else { ($missingModules | Sort-Object | ForEach-Object { "- $_" }) -join "`n" }
)

## Missing Pages
$(
  if ($missingPages.Count -eq 0) { "- (none)" }
  else { ($missingPages | Sort-Object | ForEach-Object { "- $_" }) -join "`n" }
)

## Missing KeyRoutes
$(
  if (-not $routeMappingAvailable) { "- (skipped: route mapping not found)" }
  elseif ($missingKeyRoutes.Count -eq 0) { "- (none)" }
  else { ($missingKeyRoutes | Sort-Object | ForEach-Object { "- $_" }) -join "`n" }
)
"@ | Set-Content -Path $outMd -Encoding UTF8

Write-Host "Domain map check written:"
Write-Host " - $outMd"
Write-Host " - $outJson"

if ($ok) { exit 0 } else { exit 1 }

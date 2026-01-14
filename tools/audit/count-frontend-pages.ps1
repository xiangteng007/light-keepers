<#
.SYNOPSIS
  Counts frontend pages and components for SSOT documentation
.DESCRIPTION
  Scans web-dashboard/src/pages and web-dashboard/src/components
  to generate T0-pages-count.json with accurate counts.
#>
param(
    [string]$PagesDir = "web-dashboard/src/pages",
    [string]$ComponentsDir = "web-dashboard/src/components",
    [string]$OutPath = "docs/proof/logs/T0-pages-count.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Count-TsxFiles($dir) {
    if (!(Test-Path $dir)) { return 0 }
    return (Get-ChildItem -Path $dir -Recurse -Filter "*.tsx" -File | 
        Where-Object { $_.Name -notmatch '\.(test|spec|stories)\.' } |
        Measure-Object).Count
}

function List-PageFiles($dir) {
    if (!(Test-Path $dir)) { return @() }
    return Get-ChildItem -Path $dir -Recurse -Filter "*Page.tsx" -File |
    Where-Object { $_.Name -notmatch '\.(test|spec|stories|deprecated)\.' } |
    ForEach-Object { $_.FullName -replace [regex]::Escape((Get-Location).Path + "\"), "" -replace "\\", "/" }
}

function Count-Subdirectories($dir) {
    if (!(Test-Path $dir)) { return 0 }
    return (Get-ChildItem -Path $dir -Directory | Measure-Object).Count
}

$pageCount = Count-TsxFiles $PagesDir
$componentCount = Count-TsxFiles $ComponentsDir
$pageSubdirs = Count-Subdirectories $PagesDir
$componentSubdirs = Count-Subdirectories $ComponentsDir
$pageFiles = List-PageFiles $PagesDir

$result = [ordered]@{
    generatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
    pages       = [ordered]@{
        directory      = $PagesDir
        totalTsxFiles  = $pageCount
        subdirectories = $pageSubdirs
        pageFilesCount = $pageFiles.Count
        pageFiles      = $pageFiles
    }
    components  = [ordered]@{
        directory      = $ComponentsDir
        totalTsxFiles  = $componentCount
        subdirectories = $componentSubdirs
    }
    summary     = [ordered]@{
        totalPages      = $pageFiles.Count
        totalComponents = $componentCount
    }
}

$dir = Split-Path -Parent $OutPath
if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

$result | ConvertTo-Json -Depth 10 | Set-Content -Path $OutPath -Encoding UTF8

Write-Host "[count-frontend-pages] Generated: $OutPath"
Write-Host "[count-frontend-pages] Pages: $($pageFiles.Count) | Components: $componentCount"

<#
.SYNOPSIS
  Exports stack versions from package.json files to T0-stack-versions.json
.DESCRIPTION
  Reads backend/package.json and web-dashboard/package.json to extract
  key dependency versions for SSOT documentation.
#>
param(
    [string]$OutPath = "docs/proof/logs/T0-stack-versions.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-PackageVersion($packagePath, $depName) {
    if (!(Test-Path $packagePath)) { return "not-found" }
    $pkg = Get-Content $packagePath -Raw | ConvertFrom-Json
  
    # Check dependencies first, then devDependencies (handle null gracefully)
    $ver = $null
    if ($pkg.PSObject.Properties["dependencies"] -and $pkg.dependencies.PSObject.Properties[$depName]) {
        $ver = $pkg.dependencies.$depName
    }
    if (!$ver -and $pkg.PSObject.Properties["devDependencies"] -and $pkg.devDependencies.PSObject.Properties[$depName]) {
        $ver = $pkg.devDependencies.$depName
    }
    if (!$ver) { return "not-installed" }
  
    # Remove version prefixes like ^, ~, >=
    return $ver -replace '^[\^~>=<]+', ''
}

$backendPkg = "backend/package.json"
$frontendPkg = "web-dashboard/package.json"

$versions = [ordered]@{
    generatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
    backend     = [ordered]@{
        nestjs_core   = Get-PackageVersion $backendPkg "@nestjs/core"
        nestjs_common = Get-PackageVersion $backendPkg "@nestjs/common"
        typeorm       = Get-PackageVersion $backendPkg "typeorm"
        typescript    = Get-PackageVersion $backendPkg "typescript"
        passport      = Get-PackageVersion $backendPkg "passport"
        passport_jwt  = Get-PackageVersion $backendPkg "passport-jwt"
        bull          = Get-PackageVersion $backendPkg "bull"
        socket_io     = Get-PackageVersion $backendPkg "socket.io"
    }
    frontend    = [ordered]@{
        react        = Get-PackageVersion $frontendPkg "react"
        react_dom    = Get-PackageVersion $frontendPkg "react-dom"
        vite         = Get-PackageVersion $frontendPkg "vite"
        typescript   = Get-PackageVersion $frontendPkg "typescript"
        tailwindcss  = Get-PackageVersion $frontendPkg "tailwindcss"
        react_router = Get-PackageVersion $frontendPkg "react-router"
        i18next      = Get-PackageVersion $frontendPkg "i18next"
        maplibre_gl  = Get-PackageVersion $frontendPkg "maplibre-gl"
        vitest       = Get-PackageVersion $frontendPkg "vitest"
    }
}

$dir = Split-Path -Parent $OutPath
if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }

$versions | ConvertTo-Json -Depth 5 | Set-Content -Path $OutPath -Encoding UTF8

Write-Host "[export-stack-versions] Generated: $OutPath"
Write-Host "[export-stack-versions] Backend NestJS: $($versions.backend.nestjs_core)"
Write-Host "[export-stack-versions] Frontend React: $($versions.frontend.react)"

# Light Keepers - Nx Workspace Initialization Script (PowerShell)
# Run with: .\scripts\init-nx-workspace.ps1

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[1/6] Creating Nx Workspace: light-keepers" -ForegroundColor Cyan
Write-Host "============================================================"

# Create Nx workspace with TypeScript preset
npx create-nx-workspace@latest light-keepers `
    --preset=ts `
    --packageManager=npm `
    --nxCloud=skip `
    --no-interactive

Set-Location light-keepers

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[2/6] Installing Nx Plugins" -ForegroundColor Cyan
Write-Host "============================================================"

# Install NestJS and React plugins
npm install -D @nx/nest @nx/react @nx/js

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[3/6] Generating Applications" -ForegroundColor Cyan
Write-Host "============================================================"

# Generate NestJS API application
npx nx g @nx/nest:app api `
    --directory=apps/api `
    --e2eTestRunner=none `
    --no-interactive

# Generate React Web application
npx nx g @nx/react:app web `
    --directory=apps/web `
    --style=css `
    --routing=true `
    --bundler=vite `
    --e2eTestRunner=none `
    --no-interactive

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[4/6] Generating Shared Libraries" -ForegroundColor Cyan
Write-Host "============================================================"

# Shared DTOs (Buildable)
npx nx g @nx/js:lib dtos `
    --directory=libs/shared/dtos `
    --buildable `
    --importPath=@light-keepers/shared/dtos `
    --no-interactive

# Shared Events
npx nx g @nx/js:lib events `
    --directory=libs/shared/events `
    --importPath=@light-keepers/shared/events `
    --no-interactive

# Shared Constants
npx nx g @nx/js:lib constants `
    --directory=libs/shared/constants `
    --importPath=@light-keepers/shared/constants `
    --no-interactive

# Shared UI Components
npx nx g @nx/react:lib ui `
    --directory=libs/shared/ui `
    --importPath=@light-keepers/shared/ui `
    --style=css `
    --no-interactive

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[5/6] Installing Dependencies" -ForegroundColor Cyan
Write-Host "============================================================"

# Backend dependencies
npm install @nestjs/event-emitter @nestjs/schedule @nestjs/swagger
npm install class-validator class-transformer
npm install typeorm @nestjs/typeorm pg

# Frontend dependencies
npm install @tanstack/react-query axios react-router-dom
npm install -D tailwindcss postcss autoprefixer

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[6/6] Creating Domain Structure" -ForegroundColor Cyan
Write-Host "============================================================"

# Create domain folders
$domains = @(
    "apps/api/src/app/domains/mission-command",
    "apps/api/src/app/domains/geo-intel",
    "apps/api/src/app/domains/air-ops",
    "apps/api/src/app/domains/logistics",
    "apps/api/src/app/domains/workforce",
    "apps/api/src/app/domains/connectivity",
    "apps/api/src/app/domains/data-insight",
    "apps/api/src/app/domains/community",
    "apps/api/src/app/domains/core",
    "apps/api/src/app/agents"
)

foreach ($dir in $domains) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "============================================================" -ForegroundColor Green
Write-Host "✅ Nx Workspace 'light-keepers' initialized successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  cd light-keepers"
Write-Host "  nx serve api    # Start NestJS backend"
Write-Host "  nx serve web    # Start React frontend"
Write-Host "============================================================"

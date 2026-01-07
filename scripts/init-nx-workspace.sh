#!/bin/bash
# ============================================================
# Light Keepers - Nx Workspace Initialization Script
# Run with: bash scripts/init-nx-workspace.sh
# Or in PowerShell: ./scripts/init-nx-workspace.sh
# ============================================================

set -e  # Exit on error

echo "============================================================"
echo "[1/6] Creating Nx Workspace: light-keepers"
echo "============================================================"

# Create Nx workspace with TypeScript preset
npx create-nx-workspace@latest light-keepers \
  --preset=ts \
  --packageManager=npm \
  --nxCloud=skip \
  --no-interactive

cd light-keepers

echo "============================================================"
echo "[2/6] Installing Nx Plugins"
echo "============================================================"

# Install NestJS and React plugins
npm install -D @nx/nest @nx/react @nx/js

echo "============================================================"
echo "[3/6] Generating Applications"
echo "============================================================"

# Generate NestJS API application
npx nx g @nx/nest:app api \
  --directory=apps/api \
  --e2eTestRunner=none \
  --no-interactive

# Generate React Web application
npx nx g @nx/react:app web \
  --directory=apps/web \
  --style=css \
  --routing=true \
  --bundler=vite \
  --e2eTestRunner=none \
  --no-interactive

echo "============================================================"
echo "[4/6] Generating Shared Libraries"
echo "============================================================"

# Shared DTOs (Buildable - used by both API and Web)
npx nx g @nx/js:lib dtos \
  --directory=libs/shared/dtos \
  --buildable \
  --importPath=@light-keepers/shared/dtos \
  --no-interactive

# Shared Events (Event definitions for cross-domain communication)
npx nx g @nx/js:lib events \
  --directory=libs/shared/events \
  --importPath=@light-keepers/shared/events \
  --no-interactive

# Shared Constants (Role levels, Triage levels, etc.)
npx nx g @nx/js:lib constants \
  --directory=libs/shared/constants \
  --importPath=@light-keepers/shared/constants \
  --no-interactive

# Shared UI Components (React Design System)
npx nx g @nx/react:lib ui \
  --directory=libs/shared/ui \
  --importPath=@light-keepers/shared/ui \
  --style=css \
  --no-interactive

echo "============================================================"
echo "[5/6] Installing Dependencies"
echo "============================================================"

# Backend dependencies
npm install @nestjs/event-emitter @nestjs/schedule @nestjs/swagger
npm install class-validator class-transformer
npm install typeorm @nestjs/typeorm pg

# Frontend dependencies  
npm install @tanstack/react-query axios react-router-dom
npm install -D tailwindcss postcss autoprefixer

echo "============================================================"
echo "[6/6] Creating Domain Structure"
echo "============================================================"

# Create domain folder structure in API
mkdir -p apps/api/src/app/domains/mission-command
mkdir -p apps/api/src/app/domains/geo-intel
mkdir -p apps/api/src/app/domains/air-ops
mkdir -p apps/api/src/app/domains/logistics
mkdir -p apps/api/src/app/domains/workforce
mkdir -p apps/api/src/app/domains/connectivity
mkdir -p apps/api/src/app/domains/data-insight
mkdir -p apps/api/src/app/domains/community
mkdir -p apps/api/src/app/domains/core

# Create agents folder
mkdir -p apps/api/src/app/agents

echo "============================================================"
echo "✅ Nx Workspace 'light-keepers' initialized successfully!"
echo ""
echo "Next steps:"
echo "  cd light-keepers"
echo "  nx serve api    # Start NestJS backend"
echo "  nx serve web    # Start React frontend"
echo "============================================================"

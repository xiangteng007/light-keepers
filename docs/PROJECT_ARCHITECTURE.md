# Light Keepers 災難應變平台 - 專案架構文件

> **文件版本**: v1.1 (SSOT-Enabled)  
> **更新日期**: 2026-01-15  
> **專案名稱**: Light Keepers (光守護者)

> [!IMPORTANT]
> 本文件中標註 **[AUTO]** 的數據由 `tools/audit/*.ps1` 腳本自動生成，禁止手動編輯。
> 數據來源請見對應的 `docs/proof/logs/*.json` 檔案。

---

## 1. Executive Summary

Light Keepers 是一個為台灣災難應變設計的全端平台，整合指揮控制 (C2)、地理情資 (Geo)、後勤資源 (Log)、人力動員 (HR)、社區治理 (Community)、分析報表 (Analytics) 及平台治理 (Core) 七大領域。

系統採用 **Default-Deny 安全策略**，透過 GlobalAuthGuard + 明確公開允許清單確保安全。所有部署透過 **GitHub Actions** 執行到 **Google Cloud Run**。

---

## 2. System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                         使用者層                                  │
│   Web Dashboard (React) │ Mobile App (Capacitor) │ LINE Bot     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                      API Gateway (NestJS)                        │
│   JWT Auth │ Rate Limiting │ CORS │ Swagger Docs                │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     Business Logic Layer                         │
│   Backend Modules (NestJS) │ Event-Driven │ AI Agents           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       Data Layer                                 │
│   PostgreSQL (Cloud SQL) │ Redis Cache │ Google Cloud Storage   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Source of Truth (SSOT)

> 以下數據由自動化腳本生成，不得手動填寫。

### 3.1 技術版本 [AUTO]

**來源**: `docs/proof/logs/T0-stack-versions.json`

| 層級 | 技術 | 版本來源 |
|------|------|----------|
| Backend | NestJS | `backend/package.json` → @nestjs/core |
| Backend | TypeORM | `backend/package.json` → typeorm |
| Backend | TypeScript | `backend/package.json` → typescript |
| Frontend | React | `web-dashboard/package.json` → react |
| Frontend | Vite | `web-dashboard/package.json` → vite |
| Frontend | TailwindCSS | `web-dashboard/package.json` → tailwindcss |

### 3.2 模組與頁面計數 [AUTO]

**來源**: `docs/proof/logs/T0-count-summary.json`, `docs/proof/logs/T0-pages-count.json`

| 指標 | 數據來源 |
|------|----------|
| Backend Modules | `T0-count-summary.json` → moduleCount |
| Frontend Pages | `T0-pages-count.json` → summary.totalPages |
| Frontend Components | `T0-pages-count.json` → summary.totalComponents |

### 3.3 安全指標 [AUTO]

**來源**: `docs/proof/gates/gate-summary.json`

| 指標 | 欄位 |
|------|------|
| Overall Gate | `overall` |
| Strict Mode | `strictMode` |
| Total Routes (Prod) | `metrics.TotalRoutesProd` |
| Coverage (Prod) | `metrics.CoverageProd` |
| Unprotected (Prod) | `metrics.UnprotectedProd` |
| Public Surface Policy | `metrics.PolicyEndpoints` |

---

## 4. Domain Model (7 領域)

> 詳細對應請參見: `docs/architecture/domain-map.yaml`

| 代碼 | 領域名稱 | 核心職責 | 主要模組 |
|------|----------|----------|----------|
| **C2** | 指揮控制 | 事件管理、任務派遣、檢傷分類 | events, tasks, triage, mission-sessions |
| **Geo** | 地理情資 | 戰術地圖、圖層、路線規劃 | tactical-maps, overlays, location, routing |
| **Log** | 後勤資源 | 物資管理、設備追蹤、捐贈 | resources, equipment, donations |
| **HR** | 人力動員 | 志工管理、排班、出勤、訓練 | volunteers, training, attendance, shift-calendar |
| **Community** | 社區治理 | 社區聯繫、家屬團聚、心理健康 | community, reunification, psychological-support |
| **Analytics** | 分析報表 | 數據分析、報表產生、排行榜 | analytics, reports, reports-export |
| **Core** | 平台治理 | 認證、權限、備份、審計 | auth, accounts, backup, audit |

---

## 5. System Boundaries & Contracts

### 5.1 Authentication Boundary

```
┌─────────────────────────────────────────────────────────┐
│ Client Request                                          │
└─────────────────┬───────────────────────────────────────┘
                  │ Bearer JWT (Access Token)
                  ▼
┌─────────────────────────────────────────────────────────┐
│ GlobalAuthGuard (APP_GUARD)                             │
│ - Default: DENY all requests                            │
│ - Explicit: @Public() or @RequiredLevel(0) → bypass     │
│ - Protected: JwtAuthGuard → validate token              │
└─────────────────┬───────────────────────────────────────┘
                  │ Validated User Context
                  ▼
┌─────────────────────────────────────────────────────────┐
│ UnifiedRolesGuard                                       │
│ - Check @RequiredLevel(n) against user.roleLevel        │
│ - Check @Roles() against user.roles                     │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Public Surface Policy

- **SSOT**: `docs/policy/public-surface.policy.json`
- **Validation**: `tools/audit/validate-public-surface.ps1`
- **Contract**: 所有公開端點必須在 policy.json 中明確列出，否則 CI 失敗

### 5.3 Realtime Boundary (Socket.IO)

- **Namespace**: `/realtime`
- **Auth**: JWT token in handshake query
- **Rooms**: event-{eventId}, task-{taskId}, mission-{missionId}

### 5.4 Multi-Tenant Boundary

- **Isolation**: tenant_id column on all tenant-scoped entities
- **Guard**: TenantGuard injects tenant context from JWT
- **Query Scope**: TypeORM global scope filter

---

## 6. Data Layer

### 6.1 Database Strategy

| 層面 | 技術選擇 |
|------|----------|
| Primary DB | PostgreSQL 15 (Cloud SQL) |
| Cache | Redis (Cloud Memorystore) |
| File Storage | Google Cloud Storage |
| ORM | TypeORM with migrations |

### 6.2 Schema Strategy

- Migrations: `backend/src/migrations/`
- Entities: `backend/src/modules/**/entities/`
- Naming: snake_case for tables, camelCase for TypeScript

### 6.3 GIS Support

- PostGIS extension enabled
- Geometry columns for POI, boundaries, routes

---

## 7. Security & Governance

### 7.1 Default-Deny Architecture

```
GlobalAuthGuard (APP_GUARD)
├── @Public() → Bypass auth
├── @RequiredLevel(0) → Bypass auth (equivalent to public)
├── @RequiredLevel(1-5) → JWT + roleLevel check
└── No decorator → Default DENY (requires valid JWT)
```

### 7.2 RBAC Levels

| Level | Role | Capabilities |
|-------|------|--------------|
| 0 | Guest/Public | View public data only |
| 1 | Volunteer | Basic operations |
| 2 | Team Lead | Team management |
| 3 | Coordinator | Event coordination |
| 4 | Manager | Full management |
| 5 | Admin | System administration |

### 7.3 Audit & Compliance

- **Audit Log**: All sensitive operations logged
- **Access Log**: All API access logged
- **GDPR**: Data export and deletion support
- **Proof Pipeline**: Gate-based security verification

---

## 8. CI/CD & Proof Pipeline

### 8.1 GitHub Actions Workflows

| Workflow | 觸發條件 | 功能 |
|----------|----------|------|
| `ci-cd.yml` | Push/PR to main | Build + Test (Frontend + Backend) |
| `deploy.yml` | Push to main | Deploy to Cloud Run (API + Dashboard) |
| `audit-gates.yml` | Push/PR | Security audit + Proof generation |

### 8.2 Proof Artifacts

| Artifact | 生成腳本 | 用途 |
|----------|----------|------|
| `gate-summary.json` | `ci-gate-check.ps1` | 安全閘道總結 |
| `T1-routes-guards-mapping.json` | `scan-routes-guards.ps1` | 路由守衛對應 |
| `walkthrough.md` | `generate-walkthrough.ps1` | 審計報告 |
| `T0-stack-versions.json` | `export-stack-versions.ps1` | 技術版本 |
| `T0-pages-count.json` | `count-frontend-pages.ps1` | 頁面統計 |

### 8.3 Drift Lock

```bash
git diff --exit-code \
  docs/proof/index.md \
  docs/proof/traceability.md \
  docs/proof/audit/walkthrough.md \
  docs/proof/security/public-surface.md
```

> [!IMPORTANT]
> **部署架構**: 所有 Cloud Run 部署都透過 **GitHub Actions** 執行，不使用 Cloud Build 觸發器。

---

## 9. Folder Structure

```
light-keepers/
├── .agent/                 # Agent 設定與工作流程
│   ├── approved_commands.json
│   ├── skills/
│   └── workflows/
├── .github/workflows/      # GitHub Actions
├── backend/                # NestJS 後端
│   ├── src/modules/        # [AUTO] 模組目錄
│   ├── src/common/         # 共用功能
│   └── package.json        # [SSOT] 後端版本
├── web-dashboard/          # React 前端
│   ├── src/pages/          # [AUTO] 頁面目錄
│   ├── src/components/     # [AUTO] 組件目錄
│   └── package.json        # [SSOT] 前端版本
├── docs/
│   ├── architecture/       # 架構文件
│   │   └── domain-map.yaml
│   ├── policy/             # 安全政策
│   │   └── public-surface.policy.json
│   └── proof/              # 審計證明 [AUTO]
│       ├── gates/
│       ├── logs/
│       ├── security/
│       └── audit/
└── tools/audit/            # 審計腳本
```

---

## 10. Environment Variables

### 10.1 Backend (Secret)

| 變數 | 說明 | 管理方式 |
|------|------|----------|
| `DATABASE_URL` | PostgreSQL 連線字串 | Cloud Run Secret |
| `JWT_SECRET` | JWT 簽署密鑰 | Cloud Run Secret |
| `REDIS_URL` | Redis 連線字串 | Cloud Run Secret |
| `GCS_BUCKET` | Cloud Storage Bucket | Cloud Run Env |
| `LINE_CHANNEL_*` | LINE Bot 憑證 | Cloud Run Secret |

### 10.2 Frontend (Public)

| 變數 | 說明 |
|------|------|
| `VITE_API_URL` | API 基礎 URL |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API Key |
| `VITE_FIREBASE_*` | Firebase 設定 |

---

## Appendix: Proof Artifact Paths

| 用途 | 路徑 |
|------|------|
| Gate Summary | `docs/proof/gates/gate-summary.json` |
| Stack Versions | `docs/proof/logs/T0-stack-versions.json` |
| Pages Count | `docs/proof/logs/T0-pages-count.json` |
| Module Count | `docs/proof/logs/T0-count-summary.json` |
| Walkthrough | `docs/proof/audit/walkthrough.md` |
| Domain Map | `docs/architecture/domain-map.yaml` |

---

> **Generated by**: Antigravity Agent  
> **Verification**: `pwsh tools/audit/ci-gate-check.ps1 -Strict`

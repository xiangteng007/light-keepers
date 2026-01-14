# Light Keepers 災難應變平台 - 專案架構文件

> **文件版本**: v1.0  
> **更新日期**: 2026-01-15  
> **專案名稱**: Light Keepers (光守護者)

---

## 1. 系統架構總覽

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
│   175+ Backend Modules (NestJS) │ Event-Driven │ AI Agents      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       Data Layer                                 │
│   PostgreSQL (Cloud SQL) │ Redis Cache │ Google Cloud Storage   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 技術堆疊

### 2.1 前端 (web-dashboard/)

| 類別 | 技術 | 版本 |
|------|------|------|
| 框架 | React + TypeScript | 18.x |
| 建置工具 | Vite | 6.x |
| 狀態管理 | React Context + Zustand | - |
| 路由 | React Router | 7.x |
| UI 樣式 | CSS Modules + Tailwind CSS | 4.x |
| 地圖 | MapLibre GL + Google Maps | - |
| PWA | Vite Plugin PWA (Workbox) | - |
| 測試 | Vitest + Testing Library | - |
| 國際化 | i18next | - |
| 行動裝置 | Capacitor (iOS/Android) | - |

### 2.2 後端 (backend/)

| 類別 | 技術 | 版本 |
|------|------|------|
| 框架 | NestJS | 11.x |
| 語言 | TypeScript | 5.x |
| ORM | TypeORM | - |
| 驗證 | JWT + Passport | - |
| API 文件 | Swagger (OpenAPI) | - |
| 即時通訊 | WebSocket (Socket.io) | - |
| 快取 | Redis | - |
| 排程 | @nestjs/schedule | - |
| 佇列 | Bull Queue | - |

### 2.3 基礎設施

| 類別 | 技術 |
|------|------|
| 雲端平台 | Google Cloud Platform (GCP) |
| 容器服務 | Cloud Run |
| 資料庫 | Cloud SQL (PostgreSQL) |
| 儲存 | Cloud Storage |
| CI/CD | **GitHub Actions** (所有部署) |
| 監控 | Cloud Logging + Prometheus |
| 網域 | Firebase Hosting / Vercel |

> [!IMPORTANT]
> **部署架構**: 所有 Cloud Run 部署都透過 **GitHub Actions** 執行，不使用 Cloud Build 觸發器。

---

## 3. 工作流程領域 (7 Domains)

| 領域代碼 | 中文名稱 | 核心功能 |
|----------|----------|----------|
| **C2** | 指揮控制 | 事件管理、任務派遣、檢傷分類、任務指揮 |
| **Geo** | 地理情資 | 戰術地圖、圖層疊加、POI 標記、路線規劃 |
| **Log** | 後勤資源 | 物資管理、設備追蹤、捐贈管理 |
| **HR** | 人力動員 | 志工管理、排班、出勤、訓練、組織圖 |
| **Community** | 社區治理 | 社區聯繫、家屬團聚、心理健康 |
| **Analytics** | 分析報表 | 數據分析、報表產生、排行榜 |
| **Core** | 平台治理 | 使用者設定、權限管理、系統備份 |

---

## 4. 後端模組清單 (175 模組)

### 4.1 核心模組

| 模組名稱 | 功能說明 |
|----------|----------|
| `auth` | JWT 認證、登入登出、Token 刷新、2FA |
| `accounts` | 帳戶管理、使用者 CRUD |
| `volunteers` | 志工資料、技能標籤、認證 |
| `tenants` | 多租戶支援 |
| `notifications` | 通知中心、推播 |
| `files` | 檔案上傳、GCS 整合 |
| `cache` | Redis 快取服務 |

### 4.2 任務與事件

| 模組名稱 | 功能說明 |
|----------|----------|
| `events` | 災害事件管理 |
| `tasks` | 任務 CRUD |
| `task-dispatch` | 智慧派遣、自動分配 |
| `triage` | START 檢傷分類 |
| `mission-sessions` | 任務會期、ICS 整合 |
| `field-reports` | 現場回報 |

### 4.3 資源與後勤

| 模組名稱 | 功能說明 |
|----------|----------|
| `resources` | 物資管理 |
| `equipment` | 設備追蹤 |
| `donations` | 捐贈追蹤 |
| `routing` | 路線規劃 |
| `location` | 位置追蹤 |

### 4.4 地理情資

| 模組名稱 | 功能說明 |
|----------|----------|
| `tactical-maps` | 戰術地圖 |
| `overlays` | 地圖圖層 |
| `geofence-alert` | 地理圍欄警示 |
| `weather-forecast` | 天氣預報整合 |
| `ncdr-alerts` | 國家災害預警 |

### 4.5 AI 與分析

| 模組名稱 | 功能說明 |
|----------|----------|
| `ai` | AI 服務核心 |
| `ai-queue` | AI 任務佇列 |
| `ai-prediction` | 預測模型 |
| `analytics` | 數據分析 |
| `trend-prediction` | 趨勢預測 |
| `fatigue-detection` | 疲勞偵測 |

### 4.6 整合與通訊

| 模組名稱 | 功能說明 |
|----------|----------|
| `line-bot` | LINE Bot 整合 |
| `line-notify` | LINE Notify 推播 |
| `webhooks` | Webhook 管理 |
| `realtime` | WebSocket 即時通訊 |
| `ptt` | 對講機整合 |
| `voice` | 語音功能 |

### 4.7 審計與安全

| 模組名稱 | 功能說明 |
|----------|----------|
| `audit` | 審計核心 |
| `audit-log` | 操作日誌 |
| `access-log` | 存取日誌 |
| `gdpr-compliance` | GDPR 合規 |
| `two-factor-auth` | 雙因素認證 |

---

## 5. 前端頁面架構

### 5.1 主要頁面 (97+ 頁面)

#### C2 Domain - 指揮控制

| 頁面 | 檔案 | 功能 | 主要 Widgets |
|------|------|------|--------------|
| 指揮中心 | `CommandCenterPage` | 整體指揮儀表板 | 事件總覽、任務狀態、即時通訊 |
| 事件管理 | `EventsPage` | 災害事件列表與詳情 | 事件卡片、狀態篩選、時間軸 |
| 任務管理 | `TasksPage` | 任務派遣與追蹤 | 任務列表、狀態標籤、指派面板 |
| 檢傷分類 | `TriagePage` | START 檢傷 | 分類計數器、患者卡片、快速輸入 |
| 任務指揮 | `MissionCommandPage` | ICS 任務會期 | IAP 編輯器、SITREP 檢視器 |

#### Geo Domain - 地理情資

| 頁面 | 檔案 | 功能 | 主要 Widgets |
|------|------|------|--------------|
| 戰術地圖 | `TacticalMapPage` | 戰術圖層地圖 | MapLibre、圖層控制、POI 標記 |
| 地圖總覽 | `MapPage` | 完整地圖功能 | 多圖層、路線規劃、熱區分析 |
| 指揮站地圖 | `CommandPostMapPage` | 指揮站位置 | 指揮站標記、責任區域 |

#### Log Domain - 後勤資源

| 頁面 | 檔案 | 功能 | 主要 Widgets |
|------|------|------|--------------|
| 物資管理 | `ResourcesPage` | 物資庫存與調度 | 物資表格、庫存圖表、調度面板 |
| 設備管理 | `EquipmentPage` | 設備追蹤 | 設備列表、QR 掃描、維護記錄 |
| 捐贈管理 | `DonationsPage` | 捐贈追蹤 | 捐贈表格、來源分析、感謝函 |
| 車輛管理 | `VehicleManagementPage` | 車隊管理 | 車輛列表、GPS 追蹤、調度 |

#### HR Domain - 人力動員

| 頁面 | 檔案 | 功能 | 主要 Widgets |
|------|------|------|--------------|
| 志工管理 | `VolunteersPage` | 志工列表與詳情 | 志工卡片、技能標籤、認證狀態 |
| 志工詳情 | `VolunteerDetailPage` | 個人檔案 | 個人資料、出勤記錄、技能 |
| 排班日曆 | `ShiftCalendarPage` | 班表管理 | 日曆元件、班次編輯 |
| 出勤記錄 | `AttendancePage` | 出勤追蹤 | 打卡記錄、時數統計 |
| 訓練管理 | `TrainingPage` | 課程與認證 | 課程列表、進度追蹤、證書 |
| 組織圖 | `OrgChartPage` | 組織架構 | 樹狀圖、部門編輯 |

#### Community Domain - 社區治理

| 頁面 | 檔案 | 功能 | 主要 Widgets |
|------|------|------|--------------|
| 社區管理 | `CommunityPage` | 社區聯繫 | 社區列表、聯絡人、活動 |
| 家屬團聚 | `ReunificationPage` | 尋人系統 | 登記表單、配對結果 |
| 心理健康 | `MentalHealthPage` | 心理支援 | 評估表單、資源連結 |

#### Analytics Domain - 分析報表

| 頁面 | 檔案 | 功能 | 主要 Widgets |
|------|------|------|--------------|
| 數據分析 | `AnalyticsPage` | 統計儀表板 | 圖表、KPI 卡片、趨勢分析 |
| 報表產生 | `ReportPage` | 報表範本 | 報表編輯器、匯出選項 |
| 排行榜 | `LeaderboardPage` | 績效排名 | 排名表格、徽章系統 |
| 積分報表 | `PointsReportPage` | 志工積分 | 積分統計、兌換記錄 |

#### Core Domain - 平台治理

| 頁面 | 檔案 | 功能 | 主要 Widgets |
|------|------|------|--------------|
| 個人設定 | `ProfilePage` | 帳戶設定 | 個人資料、密碼變更、偏好設定 |
| 權限管理 | `PermissionsPage` | RBAC 設定 | 角色管理、權限矩陣 |
| 備份管理 | `BackupPage` | 系統備份 | 備份列表、還原功能 |
| 審計日誌 | `AuditLogPage` | 操作記錄 | 日誌表格、篩選器 |

### 5.2 特殊頁面

| 頁面 | 功能 |
|------|------|
| `LoginPage` | 使用者登入 |
| `ForgotPasswordPage` | 密碼重設 |
| `TwoFactorSetupPage` | 2FA 設定 |
| `OfflinePrepPage` | 離線準備 |
| `NcdrAlertsPage` | 國家災害警報 |
| `ForecastPage` | 天氣預報 |
| `DroneControlPage` | 無人機控制 |

---

## 6. 前端組件 (Components)

### 6.1 核心組件目錄

| 目錄 | 說明 | 組件數 |
|------|------|--------|
| `layout/` | 版面配置 (Header, Sidebar, Footer) | 16 |
| `map/` | 地圖相關組件 | 13 |
| `analytics/` | 圖表與分析組件 | 13 |
| `manual/` | 手冊與文件組件 | 15 |
| `mental-health/` | 心理健康組件 | 10 |
| `field-reports/` | 現場回報組件 | 7 |
| `widgets/` | 通用 Widget | 4 |
| `notifications/` | 通知組件 | 3 |
| `overlays/` | 地圖圖層組件 | 5 |
| `barcode/` | 條碼掃描組件 | 3 |
| `collaboration/` | 協作工具組件 | 4 |

### 6.2 重要共用組件

| 組件 | 功能 |
|------|------|
| `ProtectedRoute` | 路由守衛 |
| `PageTemplate` | 頁面範本 |
| `CommandPalette` | 指令面板 (Ctrl+K) |
| `AIAssistantWidget` | AI 助手 Widget |
| `TacticalMap` | 戰術地圖核心 |
| `TaskModal` | 任務編輯 Modal |
| `ThemeToggle` | 主題切換 |
| `LanguageSelector` | 語言選擇 |
| `NetworkStatus` | 網路狀態指示 |
| `SyncStatusIndicator` | 同步狀態 |

---

## 7. CI/CD 工作流程

### 7.1 GitHub Actions Workflows

| Workflow | 檔案 | 觸發條件 | 功能 |
|----------|------|----------|------|
| CI/CD Pipeline | `ci-cd.yml` | Push/PR to main | 建置、測試 |
| Deploy to Cloud Run | `deploy.yml` | Push to main | **部署到 Cloud Run** |
| Audit Gates | `audit-gates.yml` | Push/PR | 安全審計檢查 |

### 7.2 部署流程

```
git push origin main
        │
        ▼
┌───────────────────┐
│ GitHub Actions    │
│ ┌───────────────┐ │
│ │ CI/CD Pipeline│ │ ← 建置 + 測試
│ └───────────────┘ │
│ ┌───────────────┐ │
│ │ Deploy        │ │ ← Docker Build + Cloud Run Deploy
│ │ - dashboard   │ │
│ │ - api         │ │
│ └───────────────┘ │
│ ┌───────────────┐ │
│ │ Audit Gates   │ │ ← 安全審計
│ └───────────────┘ │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ Google Cloud Run  │
│ asia-east1        │
│ - dashboard       │
│ - api             │
└───────────────────┘
```

---

## 8. 資料夾結構

```
light-keepers/
├── .agent/                 # Agent 設定與工作流程
│   ├── approved_commands.json
│   ├── skills/
│   └── workflows/
├── .github/
│   └── workflows/          # GitHub Actions
├── backend/                # NestJS 後端
│   ├── src/
│   │   ├── modules/        # 175+ 模組
│   │   ├── common/         # 共用功能
│   │   └── main.ts
│   ├── test/
│   └── package.json
├── web-dashboard/          # React 前端
│   ├── src/
│   │   ├── components/     # 共用組件
│   │   ├── pages/          # 頁面 (97+)
│   │   ├── services/       # API 服務
│   │   ├── hooks/          # React Hooks
│   │   ├── contexts/       # Context Providers
│   │   └── styles/         # 全域樣式
│   ├── public/
│   └── package.json
├── docs/                   # 文件
│   └── proof/              # 審計證明
├── tools/
│   └── audit/              # 審計腳本
└── docker-compose.yml
```

---

## 9. 環境變數

### 9.1 Backend

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `JWT_SECRET` | JWT 簽署密鑰 |
| `REDIS_URL` | Redis 連線字串 |
| `GCS_BUCKET` | Cloud Storage Bucket |
| `LINE_CHANNEL_SECRET` | LINE Bot Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot Token |

### 9.2 Frontend

| 變數 | 說明 |
|------|------|
| `VITE_API_URL` | API 基礎 URL |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API Key |
| `VITE_FIREBASE_*` | Firebase 設定 |

---

## 10. 安全機制

| 機制 | 說明 |
|------|------|
| JWT Auth | Token 認證 + Refresh Token |
| RBAC | 角色權限控制 (Level 1-5) |
| 2FA | 雙因素認證 (TOTP) |
| Rate Limiting | API 請求限速 |
| Audit Log | 操作審計日誌 |
| Global Guard | 預設拒絕，顯式允許 |

---

> **文件維護**: 此文件由 Antigravity Agent 自動產生，如有更新請同步修改。

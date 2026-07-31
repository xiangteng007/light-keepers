# Light Keepers 光守護者災防平台

## 系統架構與規格總覽

> **版本**: v40.6 | **更新日期**: 2026-01-07

---

## 📊 平台概述

**Light Keepers** 是台灣災害應變與緊急救援協調平台，採用 **模組化單體架構 (Modular Monolith)**，整合 169 個功能模組至 9 個核心戰略領域。

---

## 🏛️ 9 Strategic Domains (核心分類架構)

| # | Domain | 中文 | AI Agent | 核心職責 |
|---|--------|------|----------|----------|
| 1 | **Air-Ops** | 空中作業 | Scout Agent | 無人機操控、航拍影像分析、頻譜監測、離線網狀網路 |
| 2 | **Mission Command** | 任務指揮 | Dispatcher Agent | 任務場次、任務分派、檢傷分類、現場回報、疲勞監測 |
| 3 | **Geo-Intel** | 地理情報 | Intel Agent | 戰術地圖、氣象整合、NCDR警報、社群媒體監控、3D沙盤 |
| 4 | **Logistics** | 物資後勤 | Forecaster Agent | 物資庫存、捐款追蹤、設備借還、供應鏈區塊鏈 |
| 5 | **Connectivity** | 通訊連接 | - | LINE Bot、推播通知、PTT對講、離線同步、衛星通訊 |
| 6 | **Data Insight** | 數據洞察 | - | 報表分析、儀表板、稽核日誌、GDPR合規、區塊鏈帳本 |
| 7 | **Workforce** | 人力資源 | - | 志工管理、出勤打卡、培訓認證、組織架構、薪資核算 |
| 8 | **Community** | 社區服務 | - | 災民協尋、公民App、心理支持、群眾回報、社區韌性 |
| 9 | **Core** | 核心安全 | - | 認證授權、組織資料管理、備份還原、國際化、健康檢查 |

---

## 🤖 AI Agents (自主運作代理)

| Agent | 所屬 Domain | 功能描述 |
|-------|-------------|----------|
| **Scout Agent** | Air-Ops | 無人機群自動巡邏、災情偵測、影像回傳 |
| **Intel Agent** | Geo-Intel | 社群媒體災情抓取、情報聚合、熱點分析 |
| **Dispatcher Agent** | Mission Command | 智慧派遣、疲勞輪替、START 檢傷優先序 |
| **Forecaster Agent** | Logistics | 物資需求預測、自動採購建議、捐贈媒合 |

---

## 📦 模組清單 (169 Modules)

### 核心基礎

| 模組 | 功能 |
|------|------|
| `DatabaseModule` | Cloud SQL 連線、TypeORM 整合 |
| `SharedAuthModule` | JWT 認證、Guard 共享 |
| `ConfigModule` | 環境變數管理 |
| `ScheduleModule` | 定時任務排程 |
| `ThrottlerModule` | API 速率限制 |

### 帳戶與認證

| 模組 | 功能 |
|------|------|
| `AuthModule` | 登入/登出、OAuth、JWT |
| `AccountsModule` | 使用者帳戶 CRUD |
| `PublicModule` | Level 0 公開端點 (免登入) |
| `AccessLogModule` | 存取日誌紀錄 |

### 志工與任務

| 模組 | 功能 |
|------|------|
| `VolunteersModule` | 志工註冊、審核、技能管理 |
| `TasksModule` | 任務指派與追蹤 |
| `TrainingModule` | 訓練課程與認證 |
| `EventsModule` | 事件/災情管理 |

### 資源與物資

| 模組 | 功能 |
|------|------|
| `ResourcesModule` | 物資庫存管理 |
| `DonationsModule` | 捐款與金流 |
| `EquipmentModule` | 設備借還管理 |

### 通訊與通知

| 模組 | 功能 |
|------|------|
| `NotificationsModule` | 推播通知管理 |
| `LineBotModule` | LINE 聊天機器人 |
| `RealtimeModule` | WebSocket 即時通訊 |
| `PttModule` | PTT 對講機 (WebRTC) |

### 報表與分析

| 模組 | 功能 |
|------|------|
| `ReportsModule` | 災情回報 CRUD |
| `AnalyticsModule` | AI 趨勢預測 |
| `DashboardModule` | 即時 KPI 監控 |

### 緊急應變

| 模組 | 功能 |
|------|------|
| `MissionSessionsModule` | 任務場次管理 |
| `TriageModule` | E-Triage 檢傷分類 (START) |
| `FieldReportsModule` | 現場即時回報 |
| `OverlaysModule` | 戰術地圖圖層 |

### 外部整合

| 模組 | 功能 |
|------|------|
| `NcdrAlertsModule` | 國家災防中心警報同步 |
| `WeatherForecastModule` | 氣象預報 API |
| `Fire119Module` | 消防署 119 派遣介接 |

### 進階功能 (v2.0+)

| 模組 | 功能 |
|------|------|
| `DrillSimulationModule` | 災害演練模擬器 |
| `OfflineMeshModule` | 離線網狀網路 (LoRa) |
| `ReunificationModule` | 災民協尋 (AI 相片比對) |
| `DroneOpsModule` | 無人機操控與 FPV |
| `TacticalMapsModule` | 3D 戰術標記 (MIL-STD-2525) |
| `ArNavigationModule` | WebXR AR 災場導航 |
| `BlockchainModule` | 物資供應鏈區塊鏈追蹤 |

---

## 🔐 權限等級模型 (Level 0-5)

| Level | 角色 | 類型 | 主要權限 |
|:-----:|------|------|----------|
| **L0** | 公眾 | 匿名 | 公開警報、氣象、避難地圖 |
| **L1** | 志工 | 認證用戶 | 個人培訓、任務查看、回報提交 |
| **L2** | 幹部 | 工作人員 | 團隊管理、任務派遣、稽核 |
| **L3** | 常務理事 | 管理員 | 跨任務資源調配 |
| **L4** | 理事長 | 高階主管 | 組織總覽、高層決策日誌 |
| **L5** | 系統擁有者 | 超級管理員 | 全域系統設定、金鑰管理 |

### 權限控制機制

- **`UnifiedRolesGuard`**: 檢查 JWT 中的 ROLE_LEVELS (0-5)
- **`ResourceOwnerGuard`**: 防止 IDOR 攻擊，驗證資料所有權
- **`PublicController`**: `/api/v1/public/*` 專用端點，L0 訪問

---

## 🎨 UI/UX 設計規範

### 雙主題系統

#### Theme A - Dark Brown (戰術救援風格)

| 屬性 | 色值 |
|------|------|
| 主背景 | `#3D2E24` |
| 次背景 | `#4A3728` |
| 卡片背景 | `#5C4739` |
| 主文字 | `#FAF8F5` |
| 強調色 | `#C4A77D` (Gold) |

#### Theme B - Light Beige (人道救援風格)

| 屬性 | 色值 |
|------|------|
| 主背景 | `#FAF8F5` |
| 次背景 | `#F5EDE4` |
| 卡片背景 | `#FFFFFF` |
| 主文字 | `#3D2E24` |
| 強調色 | `#B8976F` (Gold) |

### 品牌配色

#### Brown 系列 (主品牌)

- `#3D2E24` (900) → `#B5A595` (300)

#### Beige 系列 (北歐溫暖)

- `#FDFCFB` (50) → `#C4B5A5` (500)

#### Gold 系列 (強調)

- `#D4BC96` (300) → `#8F7352` (700)

#### 語意色彩

| 用途 | 主色 |
|------|------|
| Success | `#6B8E5C` |
| Warning | `#C9A256` |
| Danger | `#B85C5C` |
| Info | `#5C7B8E` |

### 字體規範

```css
--font-family-primary: 'Inter', 'Noto Sans TC', sans-serif;
--font-family-monospace: 'JetBrains Mono', monospace;
```

| 層級 | 大小 |
|------|------|
| 2xs | 10px |
| xs | 11px |
| sm | 12px |
| base | 14px |
| md | 16px |
| lg | 18px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 28px |

### 間距系統

- `4px` (spacing-1) → `96px` (spacing-24)

### 圓角系統

| Token | Value | 用途 |
|-------|-------|------|
| sm | 4px | 小型元件 |
| md | 8px | 標準元件 |
| lg | 12px | 按鈕/輸入框 |
| xl | 16px | 卡片 |
| 2xl | 20px | 大卡片 |
| 3xl | 24px | Modal |

### 陰影與效果

```css
--shadow-sm: 0 1px 3px rgba(61, 46, 36, 0.08);
--shadow-md: 0 4px 6px rgba(61, 46, 36, 0.08);
--shadow-lg: 0 10px 15px rgba(61, 46, 36, 0.10);
--glass-bg: rgba(255, 255, 255, 0.7);
--glass-blur: 20px;
```

### 響應式斷點

| 斷點 | 寬度 |
|------|------|
| Desktop | > 768px |
| Tablet | ≤ 768px |
| Mobile | ≤ 480px |

### Layout 尺寸

| 元素 | 尺寸 |
|------|------|
| Navbar | 64px |
| Sidebar | 280px |
| Sidebar (collapsed) | 80px |

---

## 📂 前端 Domain 頁面結構

```
src/pages/domains/
├── air-ops/           # 1 頁面
├── mission-command/   # 5 頁面
├── geo-intel/         # 5 頁面
├── logistics/         # 7 頁面
├── connectivity/      # 2 頁面
├── data-insight/      # 8 頁面
├── workforce/         # 10 頁面
├── community/         # 4 頁面
└── core/              # 9 頁面
```

**Total: 51 頁面**

---

## 🛠️ 技術堆疊

### Backend

- **Runtime**: Node.js 20+
- **Framework**: NestJS 11
- **ORM**: TypeORM 0.3
- **Database**: PostgreSQL (Cloud SQL)
- **Cache**: Redis
- **Queue**: Bull

### Frontend

- **Framework**: React 18 + TypeScript
- **Build**: Vite 6
- **State**: TanStack Query
- **Routing**: React Router 7
- **PWA**: Vite PWA Plugin

### Infrastructure

- **Cloud**: Google Cloud Platform
- **Compute**: Cloud Run
- **CI/CD**: Cloud Build
- **Storage**: Cloud Storage
- **Secrets**: Secret Manager

---

*文件由 AI 自動生成 | 最後更新: 2026-01-07*

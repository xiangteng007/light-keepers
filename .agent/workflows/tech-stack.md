---
description: 光守護者災防平台 - 完整技術堆疊規格
---

# 光守護者災防平台 技術堆疊

**專案名稱**：Light Keepers 災防平台  
**版本**：0.1.0  
**更新日期**：2026-01-04

---

## 系統架構總覽

| 層級 | 技術 | 版本 |
|------|------|------|
| **前端框架** | React | 19.2.0 |
| **前端建置** | Vite | 7.2.4 |
| **後端框架** | NestJS | 10.3.0 |
| **資料庫** | PostgreSQL + PostGIS | 15 |
| **容器化** | Docker Compose | 3.8 |

---

## 前端 (Web Dashboard)

### 核心框架

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 19.2.0 | UI 框架 |
| TypeScript | 5.9.3 | 型別安全 |
| Vite | 7.2.4 | 開發伺服器 + 建置工具 |
| React Router DOM | 7.11.0 | 路由管理 |

### UI / 視覺

| 技術 | 版本 | 用途 |
|------|------|------|
| Lucide React | 0.562.0 | Icon 圖示庫 |
| Bootstrap | 5.3.8 | CSS 框架 |
| React Bootstrap | 2.10.10 | Bootstrap React 元件 |
| Chart.js | 4.5.1 | 圖表視覺化 |
| react-chartjs-2 | 5.3.1 | Chart.js React 封裝 |

### 地圖

| 技術 | 版本 | 用途 |
|------|------|------|
| Leaflet | 1.9.4 | 開源地圖 |
| React Leaflet | 5.0.0 | Leaflet React 封裝 |
| @react-google-maps/api | 2.20.8 | Google 地圖 |

### 整合服務

| 技術 | 版本 | 用途 |
|------|------|------|
| Firebase | 12.7.0 | 身份驗證 |
| @line/liff | 2.27.3 | LINE 登入整合 |
| socket.io-client | 4.8.3 | 即時通訊 |
| @tanstack/react-query | 5.90.12 | 資料快取管理 |
| i18next | 25.7.3 | 多語系 |
| react-i18next | 16.5.1 | i18next React 封裝 |
| Axios | 1.13.2 | HTTP 請求 |

### 功能工具

| 技術 | 版本 | 用途 |
|------|------|------|
| ExcelJS | 4.4.0 | Excel 匯出 |
| jsPDF | 3.0.4 | PDF 匯出 |
| jspdf-autotable | 5.0.2 | PDF 表格 |
| html5-qrcode | 2.3.8 | QR Code 掃描 |
| @dnd-kit/core | 6.3.1 | 拖放功能 |
| @dnd-kit/sortable | 10.0.0 | 排序功能 |
| Fuse.js | 7.1.0 | 模糊搜尋 |
| file-saver | 2.0.5 | 檔案下載 |

### 開發工具

| 技術 | 版本 | 用途 |
|------|------|------|
| Vitest | 4.0.16 | 單元測試 |
| @testing-library/react | 16.3.1 | React 測試工具 |
| ESLint | 9.39.1 | 程式碼檢查 |
| vite-plugin-pwa | 1.2.0 | PWA 支援 |

---

## 後端 (NestJS API)

### 核心框架

| 技術 | 版本 | 用途 |
|------|------|------|
| NestJS Common | 10.3.0 | 核心模組 |
| NestJS Core | 10.3.0 | 核心框架 |
| TypeScript | 5.3.3 | 型別安全 |
| TypeORM | 0.3.19 | ORM 資料庫操作 |
| pg | 8.11.0 | PostgreSQL 驅動 |
| RxJS | 7.8.1 | 響應式程式設計 |

### 安全 / 認證

| 技術 | 版本 | 用途 |
|------|------|------|
| @nestjs/passport | 10.0.3 | Passport 整合 |
| passport-jwt | 4.0.1 | JWT 策略 |
| @nestjs/jwt | 10.2.0 | JWT Token |
| bcryptjs | 3.0.3 | 密碼雜湊 |
| Helmet | 8.1.0 | HTTP 安全標頭 |
| @nestjs/throttler | 6.5.0 | API 限流 |
| cookie-parser | 1.4.7 | Cookie 解析 |

### 整合服務

| 技術 | 版本 | 用途 |
|------|------|------|
| firebase-admin | 13.6.0 | Firebase 後端整合 |
| @line/bot-sdk | 10.5.0 | LINE Bot 整合 |
| @google/generative-ai | 0.24.1 | Gemini AI |
| Nodemailer | 7.0.12 | SMTP 郵件發送 |
| Resend | 6.6.0 | 郵件服務 API |

### 功能模組

| 技術 | 版本 | 用途 |
|------|------|------|
| @nestjs/schedule | 6.1.0 | 排程任務 |
| @nestjs/websockets | 11.1.10 | WebSocket 支援 |
| @nestjs/platform-socket.io | 11.1.10 | Socket.io 整合 |
| socket.io | 4.8.2 | 即時通訊伺服器 |
| @nestjs/swagger | 11.2.3 | API 文件 (OpenAPI) |
| @nestjs/axios | 4.0.1 | HTTP 請求 |
| PDFKit | 0.17.2 | PDF 生成 |
| Cheerio | 1.1.2 | 網頁爬蟲 / HTML 解析 |
| xml2js | 0.6.2 | XML 解析 (NCDR 警報) |
| papaparse | 5.5.3 | CSV 解析 |
| class-validator | 0.14.0 | DTO 驗證 |
| class-transformer | 0.5.1 | 物件轉換 |

### GCP 整合

| 技術 | 版本 | 用途 |
|------|------|------|
| @google-cloud/storage | 7.18.0 | 雲端儲存 (GCS) |
| @google-cloud/logging-winston | 6.0.1 | 雲端日誌 |
| @google-cloud/error-reporting | 3.0.5 | 錯誤回報 |
| Winston | 3.19.0 | 日誌管理 |

### 開發工具

| 技術 | 版本 | 用途 |
|------|------|------|
| @nestjs/cli | 10.3.0 | NestJS CLI |
| Jest | 29.7.0 | 單元測試 |
| Supertest | 7.1.4 | API 測試 |
| ts-node | 10.9.2 | TypeScript 執行 |

---

## 基礎設施

### Docker 服務

| 服務 | 映像檔 | Port | 用途 |
|------|--------|------|------|
| PostgreSQL | `postgis/postgis:15-3.3-alpine` | 5432 | 資料庫 + 地理空間 |
| pgAdmin | `dpage/pgadmin4:latest` | 5050 | 資料庫管理 UI |
| Backend | 自建 `Dockerfile.dev` | 3000 | API 開發伺服器 |

### 雲端部署

| 服務 | 平台 | 用途 |
|------|------|------|
| 後端 API | Google Cloud Run | 生產環境 |
| 前端 | Vercel | 靜態網站託管 |
| 資料庫 | Cloud SQL (PostgreSQL) | 生產資料庫 |
| 建置 | Cloud Build | CI/CD |

---

## 本地開發指令

### 前端

```bash
cd web-dashboard
npm install
npm run dev          # 開發伺服器 (Vite)
npm run build        # 生產建置
npm run test         # 執行測試
```

### 後端

```bash
cd backend
npm install
npm run start:dev    # 開發伺服器 (Watch Mode)
npm run build        # 編譯 TypeScript
npm run start:prod   # 生產模式
npm run test         # 執行測試
npm run test:e2e     # E2E 測試
```

### Docker

```bash
docker-compose up -d              # 啟動所有服務
docker-compose down               # 停止所有服務
docker-compose logs -f backend    # 查看後端日誌
```

---

## 環境變數

### 後端必要變數

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/lightkeepers
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-access-token
```

### 前端必要變數

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_LIFF_ID=your-liff-id
```

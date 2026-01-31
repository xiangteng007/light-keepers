# Light Keepers 行動 App 開發架構建議

> **版本**: v1.0  
> **日期**: 2026-02-01  
> **狀態**: 規劃階段

---

## 1. 技術選型

### 建議方案：React Native + Expo

| 方案 | 優點 | 缺點 | 推薦度 |
|------|------|------|:------:|
| **React Native + Expo** | 與 React 共享技能、熱重載、OTA 更新 | 原生功能需 native module | ⭐⭐⭐⭐⭐ |
| Capacitor (現有) | 現有 web 可直接包裝 | 效能較差、原生體驗弱 | ⭐⭐⭐ |
| Flutter | 高效能、美觀 UI | Dart 語言、無法共享程式碼 | ⭐⭐ |

---

## 2. Monorepo 結構

```
light-keepers/
├── apps/
│   ├── api/                    # NestJS Backend
│   ├── dashboard/              # React Web
│   └── mobile/                 # React Native App ⭐
│
├── packages/
│   ├── shared-types/           # API Types
│   ├── shared-utils/           # 共用邏輯
│   ├── ui-primitives/          # 跨平台組件
│   └── api-client/             # 統一 API Client
│
├── tools/audit/
├── turbo.json
└── package.json
```

---

## 3. 共享程式碼策略

| 層級 | Web | Mobile | 共享方式 |
|------|:---:|:------:|----------|
| Types | ✅ | ✅ | `@lightkeepers/shared-types` |
| API Client | ✅ | ✅ | `@lightkeepers/api-client` |
| Utils | ✅ | ✅ | 日期、格式化、驗證 |
| UI 組件 | React | React Native | 分開實作 |
| 狀態管理 | ✅ | ✅ | TanStack Query |

---

## 4. 遷移步驟

### Phase 1：建立 Monorepo 基礎（2-3 天）

```bash
# 安裝 Turborepo
npm install turbo -g

# 建立 workspaces
mkdir -p apps packages/shared-types packages/api-client

# 移動現有專案
mv backend apps/api
mv web-dashboard apps/dashboard
```

**turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "test": {}
  }
}
```

**package.json** (root):
```json
{
  "name": "light-keepers",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": { "turbo": "^2.0.0" },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint"
  }
}
```

### Phase 2：建立共享 Packages（1 天）

**packages/shared-types/index.ts**:
```typescript
export interface Report {
  id: string;
  type: ReportType;
  status: ReportStatus;
  location: GeoLocation;
  createdAt: string;
  deletedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type ReportType = 'flood' | 'earthquake' | 'fire' | 'other';
export type ReportStatus = 'pending' | 'confirmed' | 'rejected';

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}
```

**packages/api-client/index.ts**:
```typescript
import axios from 'axios';
import type { ApiResponse } from '@lightkeepers/shared-types';

const client = axios.create({
  baseURL: process.env.API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app',
});

export const apiClient = {
  get: <T>(url: string) => client.get<ApiResponse<T>>(url).then(r => r.data),
  post: <T>(url: string, data: unknown) => client.post<ApiResponse<T>>(url, data).then(r => r.data),
  patch: <T>(url: string, data: unknown) => client.patch<ApiResponse<T>>(url, data).then(r => r.data),
  delete: <T>(url: string) => client.delete<ApiResponse<T>>(url).then(r => r.data),
};
```

### Phase 3：建立 Mobile App（1-2 週）

```bash
cd apps
npx create-expo-app mobile --template blank-typescript
cd mobile
npx expo install expo-location expo-camera expo-notifications expo-secure-store
```

---

## 5. Mobile App 功能規劃

### P0（必備功能）

| 功能 | 技術 | 說明 |
|------|------|------|
| 使用者認證 | JWT + SecureStore | LINE/Google OAuth |
| 災情回報 | Camera + Location | 拍照 + GPS 定位 |
| 即時地圖 | react-native-maps | 災情標記 |
| 推播通知 | Expo Notifications + FCM | 緊急警報 |
| 離線快取 | Expo SQLite | 離線瀏覽 |

### P1（進階功能）

| 功能 | 技術 |
|------|------|
| 生物辨識 | Expo LocalAuthentication |
| 離線地圖 | MapLibre + 離線 tiles |
| PTT 對講 | WebRTC |
| 任務派遣 | 即時更新 |

---

## 6. API 調整

### 版本化（已有）
```
/api/v1/reports     ← Web + Mobile 共用
```

### Mobile 專用端點（建議新增）
```
POST /api/v1/mobile/push-token    ← 推播 Token 註冊
POST /api/v1/mobile/sync          ← 離線同步
GET  /api/v1/mobile/config        ← App 設定
```

---

## 7. 時程規劃

| 階段 | 工作項目 | 時間 |
|------|----------|------|
| Phase 1 | Turborepo 遷移 + shared packages | 2-3 天 |
| Phase 2 | Expo 專案初始化 | 1 週 |
| Phase 3 | 核心功能（登入、回報、地圖）| 2-3 週 |
| Phase 4 | 離線同步 + 推播 | 1-2 週 |
| Phase 5 | App Store 上架準備 | 1 週 |

**總計**：約 6-8 週

---

## 8. 部署架構

```
┌─────────────────┐     ┌─────────────────┐
│  App Store      │     │  Google Play    │
│  (iOS)          │     │  (Android)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  Expo EAS Build       │
         │  + OTA Updates        │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  Cloud Run API        │
         │  (既有後端)            │
         └───────────────────────┘
```

---

## 附錄：GitHub Actions 更新

```yaml
# .github/workflows/deploy.yml 新增
deploy-mobile:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: expo/expo-github-action@v8
      with:
        eas-version: latest
        token: ${{ secrets.EXPO_TOKEN }}
    - run: cd apps/mobile && eas build --platform all --non-interactive
```

---

*文件由 Antigravity Agent 生成 | 2026-02-01*

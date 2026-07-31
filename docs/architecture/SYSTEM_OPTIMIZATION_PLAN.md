# Light Keepers 系統優化計畫

> ⚠️ **本文件計數已過期（SUPERSEDED）— 2026-07-31**
> 本文件「175 後端模組 / 18 頁面 / 29 組件」的分析基準與 2026-07-31 實測不符（實測：**119 個模組目錄 / 136 個 `*.module.ts` 檔**、**137 個前端頁面檔**），口徑差異與重跑指令請見 `docs/BASELINE_METRICS.md`——**之後一律以該文件為準**。
> 本文件「模組大合併（175→50）」的建議已被 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` §5 決策 **D3（正式放棄，標 superseded）** 與 **D10（改為刪除 41 個經嚴謹口徑確認的真 stub 模組，而非大合併）** 取代；其餘 stub 判定邏輯亦已由 `STUB_MODULES_ANALYSIS_V2.md` 與 `FULL_SYSTEM_REDESIGN_PLAN.md` 的新口徑取代。
> **本文件下方內容保留供歷史脈絡參考，請勿依此文件的數字或合併建議執行任何動作。**

> **版本**: v1.0  
> **日期**: 2026-02-01  
> **分析基準**: 175 後端模組 | 18 頁面 | 29 組件

---

## Executive Summary

基於全系統分析，本計畫提出 **刪減**、**整合**、**優化**、**新增** 四大方向的建議，以提升系統可維護性、效能與開發效率。

### 關鍵發現

| 指標 | 數據 | 評估 |
|------|------|------|
| 後端模組數 | 175 | ⚠️ 過多（建議 < 50） |
| Stub 模組（≤2 檔案）| 30+ | 🔴 應刪減或合併 |
| TODO 標記 | 42 個 service | ⚠️ 未完成實作 |
| 前端頁面 | 18 | ✅ 合理 |
| 前端組件 | 29 | ✅ 合理 |

---

## 1. 刪減建議（DELETE）

### 1.1 空殼/Stub 模組（建議刪除）

以下模組僅有 1-2 個檔案，無實質功能：

| 模組 | 原因 | 優先級 |
|------|------|:------:|
| `aar-analysis` | 空殼 | P1 |
| `ai-prediction` | 空殼 | P1 |
| `ai-vision` | 空殼 | P1 |
| `ar-navigation` | 空殼 | P1 |
| `auto-dispatch` | 空殼（可合併至 task-dispatch）| P1 |
| `auto-summary` | 空殼 | P1 |
| `bim-integration` | 空殼 | P2 |
| `blockchain` | 空殼 | P2 |
| `bluetooth-audio` | 空殼 | P2 |
| `cesium-3d` | 空殼 | P2 |
| `citizen-app` | 空殼 | P2 |
| `community-resilience` | 空殼 | P2 |
| `crowd-reporting` | 空殼 | P2 |
| `d3-chart` | 空殼 | P2 |
| `damage-simulation` | 空殼 | P2 |
| `dashboard-builder` | 空殼 | P2 |
| `data-encryption` | 空殼 | P2 |
| `device-management` | 空殼 | P2 |
| `disaster-summary` | 空殼 | P2 |
| `document-ocr` | 空殼 | P2 |
| `emotion-analysis` | 空殼 | P2 |
| `evacuation-sim` | 空殼 | P2 |
| `file-upload` | 空殼（可合併至 uploads）| P1 |
| `fire-119` | 空殼 | P2 |
| `gdpr-compliance` | 空殼 | P2 |
| `heatmap-analytics` | 空殼 | P2 |

**建議動作**: 刪除 30+ 空殼模組，減少維護負擔

---

### 1.2 重複功能模組（建議合併/刪除）

| 重複組 | 保留 | 刪除/合併 |
|--------|------|-----------|
| `uploads` + `file-upload` | `uploads` | 合併 `file-upload` |
| `reports` + `field-reports` | `reports` | 評估合併 |
| `notifications` + `push-notification` | `notifications` | 合併 |
| `weather` + `weather-forecast` + `weather-hub` + `weather-alert-integration` | 合併為 `weather` | 刪除其他 |
| `realtime` + `realtime-chat` | 合併為 `realtime` | |
| `offline-sync` + `offline-mesh` + `offline-tiles` + `offline-map-cache` | 合併為 `offline` | |
| `ngo-api` + `ngo-integration` | 合併為 `ngo` | |

---

## 2. 整合建議（CONSOLIDATE）

### 2.1 Domain 整合（175 → 50 模組）

| Domain | 現有模組數 | 整合後 | 保留模組 |
|--------|:----------:|:------:|----------|
| **Core** | ~20 | 5 | `auth`, `accounts`, `tenants`, `audit`, `system` |
| **Mission** | ~15 | 4 | `mission-sessions`, `task-dispatch`, `triage`, `events` |
| **Geo** | ~12 | 3 | `tactical-maps`, `overlays`, `location` |
| **Logistics** | ~10 | 3 | `resources`, `equipment`, `donations` |
| **HR** | ~12 | 4 | `volunteers`, `training`, `attendance`, `shift-calendar` |
| **Community** | ~8 | 3 | `community`, `reunification`, `psychological-support` |
| **Analytics** | ~10 | 3 | `analytics`, `reports`, `reports-export` |
| **Connectivity** | ~15 | 4 | `line-bot`, `notifications`, `realtime`, `offline` |
| **AI** | ~10 | 2 | `ai`, `ai-queue` |
| **Weather** | 5 | 1 | `weather` |

### 2.2 前端整合

| 項目 | 建議 |
|------|------|
| 組件庫 | 建立 `@lightkeepers/ui` shared package |
| API Client | 統一為 `@lightkeepers/api-client` |
| Types | 抽取為 `@lightkeepers/shared-types` |

---

## 3. 優化建議（OPTIMIZE）

### 3.1 效能優化

| 項目 | 現狀 | 建議 | 優先級 |
|------|------|------|:------:|
| **Redis 快取** | 部分使用 | 全面啟用 | P0 |
| **DB 索引** | 基本 | 添加 composite 索引 | P1 |
| **API 分頁** | 部分 | 強制所有 list 端點分頁 | P1 |
| **N+1 查詢** | 存在 | 使用 DataLoader | P1 |
| **圖片壓縮** | 無 | 上傳時自動壓縮 | P2 |

### 3.2 安全優化

| 項目 | 現狀 | 建議 | 優先級 |
|------|------|------|:------:|
| **Rate Limiting** | 部分 | 全域 + 端點級 | P0 |
| **Soft Delete** | ✅ 已完成 SEC-SD.2 | - | Done |
| **Audit Log** | 部分 | 全面記錄敏感操作 | P1 |
| **Secret Rotation** | 手動 | 自動輪換 | P2 |

### 3.3 程式碼品質

| 項目 | 建議 | 優先級 |
|------|------|:------:|
| 消除 42 個 TODO | 實作或刪除 | P1 |
| TypeScript strict | 啟用 strict mode | P1 |
| ESLint 規則 | 加嚴重複程式碼檢測 | P2 |
| 單元測試覆蓋 | 目標 60% | P2 |

---

## 4. 新增建議（ADD）

### 4.1 架構新增

| 項目 | 說明 | 優先級 |
|------|------|:------:|
| **Monorepo (Turborepo)** | 支援 Mobile App 共享程式碼 | P0 |
| **OpenAPI 自動生成** | 前後端 Types 同步 | P1 |
| **GraphQL Gateway** | 可選，提升 Mobile 查詢彈性 | P2 |

### 4.2 功能新增

| 功能 | 說明 | 優先級 |
|------|------|:------:|
| **Mobile App** | React Native + Expo | P0 |
| **Restore API** | Soft-delete 資料恢復端點 | P1 |
| **Webhook 管理** | 第三方整合回調 | P2 |
| **API Versioning v2** | 重大變更準備 | P2 |

### 4.3 DevOps 新增

| 項目 | 說明 | 優先級 |
|------|------|:------:|
| **Staging 環境** | 獨立測試環境 | P0 |
| **Feature Flags** | 功能開關系統 | P1 |
| **Error Tracking** | Sentry 完整整合 | P1 |
| **APM** | Application Performance Monitoring | P2 |

---

## 5. 實施時程

### Phase 1：清理階段（2 週）

- [ ] 刪除 30+ 空殼模組
- [ ] 合併重複模組（weather, offline, uploads）
- [ ] 消除 20 個高優先 TODO

### Phase 2：整合階段（3 週）

- [ ] 遷移至 Turborepo
- [ ] 建立 shared packages
- [ ] Domain 模組整合（175 → 80）

### Phase 3：優化階段（2 週）

- [ ] Redis 全面啟用
- [ ] DB 索引優化
- [ ] API 分頁強制化

### Phase 4：擴展階段（持續）

- [ ] Mobile App 開發
- [ ] Staging 環境建置
- [ ] Feature Flags 實作

---

## 6. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 刪模組破壞依賴 | 高 | 先 grep 確認無 import |
| 合併造成衝突 | 中 | 分階段、充分測試 |
| Monorepo 學習成本 | 低 | 漸進式遷移 |

---

## 7. 成功指標

| 指標 | 現狀 | 目標 |
|------|------|------|
| 後端模組數 | 175 | < 60 |
| TODO 標記 | 42 | 0 |
| CI 建置時間 | ~5 min | < 3 min |
| 測試覆蓋率 | ~20% | > 60% |

---

## 附錄：模組清理腳本

```powershell
# 找出空殼模組
Get-ChildItem -Path backend\src\modules -Directory | ForEach-Object {
    $count = (Get-ChildItem -Path $_.FullName -File -Recurse | Measure-Object).Count
    if ($count -le 2) {
        [PSCustomObject]@{
            Module = $_.Name
            FileCount = $count
        }
    }
} | Export-Csv -Path docs/proof/stub-modules.csv -NoTypeInformation
```

---

*文件由 Antigravity Agent 生成 | 2026-02-01*

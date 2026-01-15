# Light Keepers 平台 - 未完成功能清單

**文件日期**: 2026-01-15  
**最後更新 Commit**: `1632bd3`  
**專案狀態**: 開發中

---

## 📋 待實作功能

### 1. Emergency Response Phase 6: PWA 離線功能

| 項目 | 說明 | 優先級 |
|------|------|--------|
| Service Worker | 實作 SW 快取策略 | 高 |
| Offline SOP | 離線時 SOP 文件存取 | 高 |
| 衝突解決 | 離線資料同步衝突處理 | 中 |

**預估工時**: 3-5 天

---

### 2. Timeline 視覺化整合

| 項目 | 說明 | 優先級 |
|------|------|--------|
| 資料源整合 | 前端連接 `generateTimeline` API | 中 |
| UI 元件 | 時間軸圖表渲染 | 中 |

**預估工時**: 1-2 天

---

### 3. 安全強化

| 項目 | 說明 | 優先級 |
|------|------|--------|
| SHA-256 上傳驗證 | 檔案上傳時計算並儲存雜湊值 | 中 |
| Soft-delete 統一 | 各核心實體加入 `deletedAt` 欄位 | 低 |

**預估工時**: 2-3 天

---

### 4. 基礎設施

| 項目 | 說明 | 優先級 |
|------|------|--------|
| Cloud Monitoring | Cloud Run Always-on CPU 即時監控服務 | 中 |

**預估工時**: 1-2 天

---

## ✅ 已完成功能 (本次實作)

| 功能 | 檔案 | 狀態 |
|------|------|------|
| PostGIS 志工篩選 | `volunteers.service.ts` | ✅ |
| GPS 簽到/退 | `task-dispatch.service.ts` | ✅ |
| 回報重複偵測 | `reports.service.ts` | ✅ |
| SITREP 自動生成 | `sitrep.service.ts` | ✅ |
| AAR 自動彙整 | `aar.service.ts` | ✅ |
| WebSocket 即時同步 | `mission-session.gateway.ts` | ✅ |
| 報表匯出 (CSV/JSON) | `reports-export.service.ts` | ✅ |
| 敏感資料遮罩 | `sensitive-masking.interceptor.ts` | ✅ |

---

## 📊 總覽

| 類別 | 已完成 | 待實作 |
|------|--------|--------|
| 核心整合 | 8 項 | 0 項 |
| Emergency Response | Phase 5 | Phase 6-7 |
| 安全強化 | 敏感資料遮罩 | SHA-256、Soft-delete |
| 基礎設施 | - | Cloud Monitoring |

**總預估剩餘工時**: 7-12 天

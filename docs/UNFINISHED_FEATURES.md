# Light Keepers 平台 - 未完成功能清單

**文件日期**: 2026-01-16  
**最後更新 Commit**: `99076e0`  
**專案狀態**: Release Sprint 完成

---

## ✅ 已完成功能

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
| Service Worker Cache | `vite.config.ts` | ✅ |
| Offline SOP | `offlineSOP.ts` | ✅ |
| Offline Sync | `offlineSync.ts` | ✅ |
| SHA-256 上傳驗證 | `files.service.ts` | ✅ |
| Timeline UI | `TimelineView.tsx` | ✅ |
| **Soft-delete Entities** | 4 core entities | ✅ |
| **Soft-delete Services** | reports/volunteers | ✅ |

---

## 📋 待實作功能

### P0 — 高優先級

| 項目 | 說明 | 預估工時 |
|------|------|----------|
| 資料庫遷移 | `deleted_at` 欄位遷移腳本 | 0.5 天 |
| R3: includeDeleted RBAC | Admin-only 查詢已刪資料 | 1 天 |

### P1 — 建議實作

| 項目 | 說明 | 預估工時 |
|------|------|----------|
| Restore Endpoint | `POST /xxx/:id/restore` | 1 天 |
| Emergency Response Phase 7 | PDF/Word 報表匯出 | 2 天 |

### P2 — 技術債

| 項目 | 說明 | 優先級 |
|------|------|--------|
| Guard Coverage | 59.2% → 100% | 中 |
| EventEmitter Integration | 模組事件串接 | 低 |

---

## 📊 總覽

| 類別 | 已完成 | 待實作 |
|------|--------|--------|
| 核心整合 | 8 項 | 0 項 |
| Emergency Response | Phase 1-6 | Phase 7 |
| 安全強化 | SHA-256 + Soft-delete | Guard Coverage |
| CI/CD | v1.3.0 | - |

**詳細後續步驟請見**: [`NEXT_STEPS.md`](./NEXT_STEPS.md)

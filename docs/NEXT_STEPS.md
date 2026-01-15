# Light Keepers 平台 - 未完成功能與後續建議

**文件日期**: 2026-01-16  
**最後更新 Commit**: `99076e0`  
**專案狀態**: Phase 1 Complete, Ready for Phase 2

---

## ✅ 已完成功能 (Release Sprint + SEC-SD.1)

| 功能 | 檔案/模組 | Evidence | Commit |
|------|-----------|----------|--------|
| Service Worker Cache | `vite.config.ts` + Workbox | PASS | b150df3 |
| Offline SOP (IndexedDB) | `offlineSOP.ts` | PASS | b150df3 |
| Offline Sync (LWW) | `offlineSync.ts` | PASS | b150df3 |
| SHA-256 上傳驗證 | `files.service.ts` | PASS | 0865582 |
| Timeline API | `generateTimeline()` | PASS | 0865582 |
| Timeline UI | `TimelineView.tsx` | PASS | 0865582 |
| Cloud Monitoring Plan | Terraform configs | PASS | 0865582 |
| **Soft-delete Entities** | 4 core entities | PASS | e047f87 |
| **Soft-delete Services** | reports/volunteers | PASS | 99076e0 |
| CI Gate v1.3.0 | G7 Soft-delete gate | PASS | 99076e0 |

---

## 📋 未完成/建議事項

### P0 — 高優先級 (下一 Sprint)

| 項目 | 說明 | 預估工時 | 依賴 |
|------|------|----------|------|
| R3: includeDeleted RBAC | `@Query('includeDeleted')` + Admin guard | 1 天 | SEC-SD.1 |
| DispatchTask/MissionSession softDelete | 這兩個 service 的 delete() 尚未轉換 | 0.5 天 | SEC-SD.1 |
| 資料庫遷移 | 生成並執行 `deleted_at` 欄位遷移 | 0.5 天 | SEC-SD.1 |

---

### P1 — 建議實作

| 項目 | 說明 | 預估工時 | 優先級 |
|------|------|----------|--------|
| Restore Endpoint | `POST /xxx/:id/restore` (Admin only) | 1 天 | 中 |
| Emergency Response Phase 7 | 報表匯出 PDF/Word | 2 天 | 中 |
| Audit Pipeline 強化 | selftest-ci-gate.ps1 負向測試 | 1 天 | 中 |
| Public Allowlist Traceability | 每個 endpoint 加入 reason 欄位 | 0.5 天 | 低 |

---

### P2 — 技術債

| 項目 | 說明 | 風險等級 |
|------|------|----------|
| Guard Coverage | 目前 59.2% controllers 有 guards | 中 |
| EventEmitter Integration | 部分模組事件未串接 | 低 |
| AAR Module | 部分功能為 stub 實作 | 低 |
| MD Lint Errors | UNFINISHED_FEATURES.md 表格格式問題 | 低 |

---

## 🔧 建議下一步

### 立即可做

1. **生成資料庫遷移**

   ```bash
   cd backend
   npm run migration:generate -- -n AddDeletedAtColumns
   npm run migration:run
   ```

2. **執行完整 CI Gate**

   ```powershell
   pwsh tools/audit/soft-delete-proof.ps1
   pwsh tools/audit/ci-gate-check.ps1 -Strict
   ```

### 部署前

1. Cloud Run 部署（asia-east1）
2. 驗證 PostgreSQL deleted_at 欄位
3. 測試 soft-delete API 行為

---

## 📊 專案狀態摘要

| 階段 | 狀態 |
|------|------|
| Core Integration | ✅ 8/8 完成 |
| Emergency Response | Phase 1-6 ✅, Phase 7 待完成 |
| Security Hardening | SEC-SD.1 ✅, Guard Coverage 需改進 |
| CI/CD | Verifiable Pipeline v1.3.0 ✅ |
| Infrastructure | Cloud Monitoring Plan ✅, Deploy 待執行 |

**總結**: 核心功能已完成，建議進行資料庫遷移後部署測試。

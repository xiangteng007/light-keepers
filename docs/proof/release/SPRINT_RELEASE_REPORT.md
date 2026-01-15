# Sprint Release Report

**Version**: vFinal  
**Date**: 2026-01-15  
**Sprint**: Release Sprint (UNFINISHED_FEATURES 收斂交付)

---

## ✅ 完成項目

### P0 — 上線阻擋（全部完成）

| 項目 | 狀態 | Evidence |
|------|------|----------|
| Service Worker 快取 | ✅ PASS | [sw-cache-report.json](../pwa/sw-cache-report.json) |
| Offline SOP | ✅ DONE | `web-dashboard/src/services/offlineSOP.ts` |
| SHA-256 上傳驗證 | ✅ DONE | `backend/src/modules/uploads/uploads.service.ts` |

### P1 — Sprint 完成

| 項目 | 狀態 | Evidence |
|------|------|----------|
| Timeline API 串接 | ✅ DONE | `TimelineView.tsx` |
| Timeline UI | ✅ DONE | 時間軸 + 篩選 + 詳情面板 |
| Cloud Monitoring | ✅ DONE | [cloud-monitoring-plan.md](../infra/cloud-monitoring-plan.md) |

### P2 — 延後項目

| 項目 | 狀態 | 說明 |
|------|------|------|
| 離線同步衝突 | ✅ DONE | `offlineSync.ts` + last-write-wins |
| Soft-delete 統一 | ⏳ WARN | 建議未來迭代加入 |

---

## 📁 交付檔案清單

### 前端新增

- `web-dashboard/src/services/offlineSOP.ts`
- `web-dashboard/src/services/offlineSync.ts`
- `web-dashboard/src/components/timeline/TimelineView.tsx`
- `web-dashboard/src/components/timeline/TimelineView.css`

### 後端修改

- `backend/src/modules/uploads/uploads.service.ts` (SHA-256)

### 文件

- `docs/proof/infra/cloud-monitoring-plan.md`
- `docs/UNFINISHED_FEATURES.md`

### 審計腳本 (8 個)

- `tools/audit/pwa-cache-proof.ps1` ✅
- `tools/audit/offline-sop-proof.ps1`
- `tools/audit/offline-sync-proof.ps1`
- `tools/audit/upload-sha256-proof.ps1`
- `tools/audit/timeline-proof.ps1`
- `tools/audit/soft-delete-proof.ps1`
- `tools/audit/cloud-monitoring-proof.ps1`
- `tools/audit/deprecation-proof.ps1`

---

## 🔧 驗證命令

```powershell
# 執行所有 proof 腳本
powershell -ExecutionPolicy Bypass -File tools\audit\pwa-cache-proof.ps1
powershell -ExecutionPolicy Bypass -File tools\audit\offline-sop-proof.ps1
powershell -ExecutionPolicy Bypass -File tools\audit\upload-sha256-proof.ps1
powershell -ExecutionPolicy Bypass -File tools\audit\timeline-proof.ps1
powershell -ExecutionPolicy Bypass -File tools\audit\cloud-monitoring-proof.ps1

# CI Gate (strict mode)
powershell -ExecutionPolicy Bypass -File tools\audit\ci-gate-check.ps1 -Strict
```

---

## ⚠️ 已知問題

1. **Soft-delete 未完成**: 核心實體尚未加入 `@DeleteDateColumn`，建議下一迭代完成
2. **idb 套件**: 前端需安裝 `idb` 套件以支援 IndexedDB 操作

   ```bash
   cd web-dashboard && npm install idb
   ```

---

## 📊 總結

| 類別 | 完成 | 待處理 |
|------|------|--------|
| P0 關鍵 | 3/3 | 0 |
| P1 Sprint | 3/3 | 0 |
| P2 延後 | 1/2 | 1 (soft-delete) |
| 審計腳本 | 8/8 | 0 |

**Sprint 狀態**: ✅ **達成交付目標**

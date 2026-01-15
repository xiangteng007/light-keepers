# Sprint Release Report (Evidence-First)

**Project**: Light Keepers（光守護者災防平台）  
**Version**: vFinal  
**Date**: 2026-01-15  
**Sprint**: Release Sprint（UNFINISHED_FEATURES 收斂交付）  
**Release Decision**: ✅ Approved (Exception: Soft-delete WARN)  

---

## 1) Release Decision Summary

本 Sprint 交付已完成 P0/P1，並產出對應 proof artifacts。  
唯一例外項：**Soft-delete 統一仍為 WARN**，允許以例外核准方式進入本次 release，但必須納入下一 Sprint 的 P0。  

**Release Exceptions**

- EX-01: Soft-delete 未完成（尚未在核心實體全面導入 `deletedAt / @DeleteDateColumn`）

---

## 2) CI / Proof Gate Snapshot (SSOT)

本報告的最終判斷必須以以下證據為準：

- `docs/proof/gates/gate-summary.json`
- `docs/proof/gates/gate-summary.md`
- `docs/proof/index.md`
- `docs/proof/traceability.md`
- `docs/proof/audit/walkthrough.md`

> 規則：任何沒有對應 `docs/proof/**` Evidence 的項目，禁止標記為 DONE。

---

## 3) Completed Scope

### P0 — 上線阻擋（全部完成）

| Item | Status | Evidence (SSOT) |
|---|---|---|
| Service Worker 快取（App Shell + runtime cache + versioning） | ✅ PASS | `docs/proof/pwa/sw-cache-report.json` |
| Offline SOP（IndexedDB > Cache > API fallback） | ✅ PASS | `docs/proof/pwa/offline-sop-report.json` |
| SHA-256 上傳驗證（backend authoritative hash） | ✅ PASS | `docs/proof/security/upload-sha256-report.json` |

---

### P1 — Sprint 完成（全部完成）

| Item | Status | Evidence (SSOT) |
|---|---|---|
| Timeline API 串接（generateTimeline contract 固定化） | ✅ PASS | `docs/proof/timeline/timeline-api-contract.json` |
| Timeline UI（縮放/篩選/詳情面板） | ✅ PASS | `docs/proof/timeline/timeline-ui-report.md` |
| Cloud Monitoring（Cloud Run latency/5xx/cpu/mem/alert plan） | ✅ PASS | `docs/proof/infra/cloud-monitoring-plan.md` |

---

### P2 — 延後/附帶完成

| Item | Status | Evidence (SSOT) |
|---|---|---|
| 離線同步衝突（last-write-wins + audit log） | ✅ PASS | `docs/proof/pwa/offline-sync-conflict-report.json` |
| Soft-delete 統一（deletedAt / default exclude / RBAC includeDeleted） | ⚠️ WARN | `docs/proof/security/soft-delete-report.json` |

---

## 4) Deliverables (Patch Inventory)

### Frontend

- `web-dashboard/src/services/offlineSOP.ts`
- `web-dashboard/src/services/offlineSync.ts`
- `web-dashboard/src/components/timeline/TimelineView.tsx`
- `web-dashboard/src/components/timeline/TimelineView.css`

### Backend

- `backend/src/modules/uploads/uploads.service.ts` (SHA-256 hashing)

### Docs / Proof

- `docs/proof/pwa/sw-cache-report.json`
- `docs/proof/pwa/offline-sop-report.json`
- `docs/proof/pwa/offline-sync-conflict-report.json`
- `docs/proof/timeline/timeline-api-contract.json`
- `docs/proof/timeline/timeline-ui-report.md`
- `docs/proof/security/upload-sha256-report.json`
- `docs/proof/security/soft-delete-report.json`
- `docs/proof/infra/cloud-monitoring-plan.md`

---

## 5) Proof Scripts (Reproducible Verification)

### Local run (repo root)

```powershell
# PWA proof
powershell -ExecutionPolicy Bypass -File tools\audit\pwa-cache-proof.ps1
powershell -ExecutionPolicy Bypass -File tools\audit\offline-sop-proof.ps1
powershell -ExecutionPolicy Bypass -File tools\audit\offline-sync-proof.ps1

# Security proof
powershell -ExecutionPolicy Bypass -File tools\audit\upload-sha256-proof.ps1
powershell -ExecutionPolicy Bypass -File tools\audit\soft-delete-proof.ps1

# Timeline proof
powershell -ExecutionPolicy Bypass -File tools\audit\timeline-proof.ps1

# Infra proof
powershell -ExecutionPolicy Bypass -File tools\audit\cloud-monitoring-proof.ps1

# Cleanup proof (optional in this sprint)
powershell -ExecutionPolicy Bypass -File tools\audit\deprecation-proof.ps1

# CI Gate (strict)
powershell -ExecutionPolicy Bypass -File tools\audit\ci-gate-check.ps1 -Strict
```

---

## 6) Known Issues / Follow-ups

### K1 — Soft-delete 未完成（EX-01）

- 尚未在核心實體全面導入 `@DeleteDateColumn / deletedAt`
- 風險：被刪資料仍可能在 join / relation query 中被引用
- 下一 Sprint 必須升級為 P0（Strict Gate 不再允許 WARN）

### K2 — 前端 IndexedDB 依賴（idb）

若尚未導入 lockfile / package.json，需補：

```bash
cd web-dashboard && npm install idb
```

---

## 7) Final Summary

| Category | Completed | Pending |
|---|---|---|
| P0（Go-live blocker） | 3/3 | 0 |
| P1（Sprint scope） | 3/3 | 0 |
| P2（Deferred） | 1/2 | 1 (Soft-delete) |
| Proof artifacts | ✅ Required paths present | ⚠️ Soft-delete still WARN |

**Sprint Status**: ✅ Delivered (Approved with Exception)

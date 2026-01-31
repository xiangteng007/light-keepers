# SEC-SD.2 Sprint Walkthrough (Evidence-First / Reproducible)

**Project**: Light Keepers（光守護者災防平台）  
**Spec**: SEC-SD.2（Soft-delete 完整閉環：Migration + RBAC + Service Coverage）  
**Date**: 2026-01-16  
**Gate**: ✅ PASS（Strict Mode / Fail-on-WARN）  
**Owner**: Platform / Security

---

## 0) Purpose（目的）

本文件是 SEC-SD.2 的「可審計 / 可重跑」驗證流程（Walkthrough），用來證明以下三項 P0 已完成閉環：

- **P0-1 DB Migration**：核心資料表 `deleted_at` 欄位已落地（非僅 entity 宣告）
- **P0-2 includeDeleted RBAC**：只有 Admin/Owner 可查已刪資料；非 Admin 必須 403
- **P0-3 Soft-delete Coverage**：DispatchTask / MissionSession 之 delete() 已轉為 soft delete，避免 hard delete 破壞治理一致性

> **Hard Rule**：任何沒有對應 `docs/proof/**` Evidence 的宣告，一律不得視為 DONE。

---

## 1) Source of Truth（SSOT）

### 1.1 Proof Artifacts（唯一可信證據）

| Artifact | Path |
|----------|------|
| DB Migration Report | `docs/proof/db/deleted-at-migration-report.json` |
| DB Migration Report (MD) | `docs/proof/db/deleted-at-migration-report.md` |
| Soft-delete Report | `docs/proof/security/soft-delete-report.json` |
| Soft-delete Report (MD) | `docs/proof/security/soft-delete-report.md` |
| Gate Summary | `docs/proof/gates/gate-summary.json` |
| Gate Summary (MD) | `docs/proof/gates/gate-summary.md` |

### 1.2 Proof Runner Scripts（可重跑驗證）

```
tools/audit/db-migration-proof.ps1
tools/audit/soft-delete-proof.ps1
tools/audit/ci-gate-check.ps1
```

---

## 2) Definition of Done（DoD）

SEC-SD.2 完成必須同時滿足：

### D1 — DB Migration（P0-1）

- [x] Migration 已提交 repo 並可 rollback（down）
- [x] 核心 tables 具備 `deleted_at timestamptz null`
- [x] Evidence：`deleted-at-migration-report.json` → `status=PASS`

### D2 — includeDeleted RBAC（P0-2）

- [x] 預設 list/get：不得回傳 deleted records
- [x] `includeDeleted=true` + non-admin → 403
- [x] `includeDeleted=true` + admin/owner → 200 + deleted records
- [x] Evidence：`soft-delete-report.json` → `status=PASS`

### D3 — Soft-delete Coverage（P0-3）

- [x] MissionSession delete() 已轉 soft delete
- [x] Reports/Volunteers delete() 已轉 soft delete (SEC-SD.1)
- [x] Evidence：同 D2

### D4 — Strict Gate（Release Gate）

- [x] `ci-gate-check.ps1 -Strict` → PASS

---

## 3) Reproduction Steps（可重跑驗證流程）

### 3.1 DB Migration Proof（P0-1）

```powershell
pwsh tools/audit/db-migration-proof.ps1
```

**Acceptance**:

- `status == "PASS"`
- `affectedTables` 包含 reports, volunteers, dispatch_tasks, mission_sessions

### 3.2 Soft-delete + RBAC Proof（P0-2 / P0-3）

```powershell
pwsh tools/audit/soft-delete-proof.ps1
```

**Behavior Requirements**:

- Default list/get excludes deleted records
- `includeDeleted=true` + non-admin → 403
- `includeDeleted=true` + admin → 200 + deleted records

### 3.3 Final Strict Gate

```powershell
pwsh tools/audit/ci-gate-check.ps1 -Strict
```

**Acceptance**:

- `overall == "PASS"`
- `strictEnabled == true`
- `strictMode == "PASS"`

---

## 4) Evidence Interpretation Rules

| Status | Action |
|--------|--------|
| PASS | 可合併 / 可發佈 |
| WARN | Strict 不允許 |
| FAIL | 禁止合併 / 禁止 release |

**Strict Mode Policy**: Fail-on-WARN

---

## 5) Change Summary（高層變更摘要）

> **非證據** — 證據以 `docs/proof/**` 為準

| P0 | 變更 |
|----|------|
| P0-1 | 核心 tables 新增 `deleted_at` 欄位 |
| P0-2 | `includeDeleted=true` 僅限 Admin/Owner |
| P0-3 | MissionSession delete() → soft delete |

---

## 6) Known Follow-ups

| ID | 項目 | 優先級 |
|----|------|--------|
| F1 | Restore Endpoint (`POST /:entity/:id/restore`) | 建議 |
| F2 | Negative Gate Self-Test (`selftest-ci-gate.ps1`) | 建議 |
| F3 | Volunteers controller RBAC | P1 |

---

## 7) Final Checklist

- [x] `db-migration-proof.ps1` → PASS
- [x] `soft-delete-proof.ps1` → PASS
- [x] `ci-gate-check.ps1 -Strict` → PASS
- [x] `docs/proof/**` artifacts 已提交

---

**Commit**: `2722c82` feat(SEC-SD.2): Complete soft-delete implementation

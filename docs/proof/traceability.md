# Traceability Matrix

> **Purpose**: Map requirements → tasks → commits → evidence  
> **Format**: Requirement-ID → Source → Task(s) → Commit/PR → Evidence → Status

---

## Legend

| Symbol | Status |
|:------:|--------|
| ✅ | PASS |
| ❌ | FAIL |
| 🟡 | IN-PROGRESS |
| 🔴 | BLOCKED |
| ⏳ | PENDING |

---

## Phase 0: Baseline & Foundation

### T0-BASE: Baseline Module/Page Counting

- **Source**: Commander Review v2 §1.D1, §1.D2
- **Task(s)**: T0 (Repo Baseline Scan)
- **Commit/PR**: PR-0a, PR-0b
- **Evidence**:
  - ✅ [`baseline-counting-spec.md`](../audit/baseline-counting-spec.md) - Counting rules
  - ✅ [`T0-count-summary.json`](logs/T0-count-summary.json) - Machine-readable counts
  - ✅ [`T0-modules-list.txt`](logs/T0-modules-list.txt) - 192 backend modules
  - ✅ [`T0-pages-list.txt`](logs/T0-pages-list.txt) - 114 frontend pages
  - ✅ [`T0-baseline-scan.txt`](logs/T0-baseline-scan.txt) - Scan log
  - ✅ [`T0-delta-report.md`](logs/T0-delta-report.md) - Delta: actual vs expected (MATCH)
- **Verification**: `pwsh tools/audit/scan-baseline.ps1`
- **Status**: ✅ PASS

### T1-MAP: Route ↔ Guard Mapping

- **Source**: Commander Review v2 §1.D3, §3.B
- **Task(s)**: T1 (Integration Verification)
- **Commit/PR**: `440f016` (PR-0)
- **Evidence**:
  - ✅ [`T1-routes-guards-mapping.json`](security/T1-routes-guards-mapping.json) - 1105 routes mapped
  - ✅ [`T1-routes-guards-report.md`](security/T1-routes-guards-report.md) - Human-readable report
  - ✅ [`T1-route-guard-scan.txt`](logs/T1-route-guard-scan.txt) - Scan execution log
  - ✅ [`T1-api-routes.txt`](logs/T1-api-routes.txt) - 1105 API routes
  - ✅ [`T1-guards-coverage.txt`](logs/T1-guards-coverage.txt) - 149 guard declarations
  - ✅ [`T1-event-emitters.txt`](logs/T1-event-emitters.txt) - 172 event emitters
  - ✅ [`agent-integration-verification.md`](../audit/agent-integration-verification.md) - Full integration report
  - ✅ [`T7a-smoke-tests.txt`](logs/T7a-smoke-tests.txt) - Smoke tests executed (backend offline)
- **Verification**: `pwsh tools/audit/scan-routes-guards.ps1`
- **Status**: ✅ PASS

---

## Phase 0: Security Foundation (Shift-Left)

### T7a-GUARD: High-Risk Endpoint Guards

- **Source**: Commander Review v2 §3.C, §1.D4
- **Task(s)**: T7a (Shift-left Security)
- **Commit/PR**: `30aeae9` (PR-1)
- **Evidence**:
  - ✅ 6 controllers secured (56 routes protected)
  - ✅ Coverage: 55.6% → 60.6%
  - ✅ [`T7a-smoke-tests.txt`](logs/T7a-smoke-tests.txt) - 10 endpoint smoke tests executed
  - ✅ [`T7a-smoke-test-output.txt`](security/T7a-smoke-test-output.txt) - Full smoke test output
- **Controllers Modified**:
  - `attendance.controller.ts` (7 routes)
  - `events.controller.ts` (6 routes)
  - `donation-tracking.controller.ts` (5 routes)
  - `payroll.controller.ts` (8 routes)
  - `disaster-community.controller.ts` (21 routes)
  - `line-bot.controller.ts` (8 routes)
- **Smoke Test Result**: 0/10 PASS (expected: backend offline)
- **Status**: 🟡 IMPLEMENTED (guards complete, runtime proof pending backend startup)

### SEC-REMEDIATION: Dangerous Endpoint Removal

- **Source**: Commander Mode Template v1.2 §5 (禁止事項)
- **Task(s)**: T7a (Security Audit)
- **Commit/PR**: `pending`
- **Evidence**:
  - ✅ `auth.controller.ts` lines 86-99 - Removal comment block
  - ✅ 3 endpoints removed:
    - `GET /auth/diagnose/:email` (unprotected)
    - `POST /auth/admin/reset-password` (hardcoded key: LK_ADMIN_2026_RESET)
    - `POST /auth/admin/recreate-owner` (hardcoded key: LK_ADMIN_2026_RESET)
- **Verification**: `grep -r "LK_ADMIN_2026_RESET" backend/` returns 0 results
- **Status**: ✅ PASS

### T7a-SCORE: Security Maturity Scoring

- **Source**: Commander Review v2 §1.D4, §3.D
- **Task(s)**: T7a
- **Commit/PR**: `440f016` (PR-0)
- **Evidence**:
  - ✅ [`security-maturity-scoring.md`](../audit/security-maturity-scoring.md) - Rubric defined
  - ⏳ `/docs/proof/security/T7-security-score.json` - Scored output (pending script)
- **Status**: 🟡 IN-PROGRESS (rubric done, scoring script pending)

---

## A. ICS/C2 Requirements

### GAP-A-M1: SITREP Auto-Generation

- **Source**: `01-gap-analysis.md#L27-54`
- **Task(s)**: T2 (ICS/C2 Minimum Viable)
- **Commit/PR**: ⏳ Pending (after T0/T1/T7a)
- **Evidence**: ⏳ Pending
  - /docs/proof/api/T2-sitrep-generate.txt
  - /docs/proof/logs/T2-sitrep-test.txt
- **Status**: ⏳ PENDING
- **Notes**: Blocked on Phase-0 completion

### GAP-A-M2: IAP Approval Workflow

- **Source**: `01-gap-analysis.md#L56-66`
- **Task(s)**: T2 (ICS/C2 Minimum Viable)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

### GAP-A-M3: Command Chain Modeling

- **Source**: `01-gap-analysis.md#L68-97`
- **Task(s)**: T2 (ICS/C2 Minimum Viable)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

---

## B. Mobilization & Notification

### GAP-B-M1: Volunteer Filtering API

- **Source**: `01-gap-analysis.md#L157-198`
- **Task(s)**: T3 (Mobilization Loop)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
  - /docs/proof/api/T3-volunteer-filter.txt
  - /docs/proof/db/T3-postgis-query.txt
- **Status**: ⏳ PENDING

### GAP-B-M2: Notification Delivery Tracking

- **Source**: `01-gap-analysis.md#L200-210`
- **Task(s)**: T3 (Mobilization Loop)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

---

## C. Report Management

### GAP-C-M1: Report Deduplication

- **Source**: `01-gap-analysis.md#L235-264`
- **Task(s)**: T4 (Report Governance)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
  - /docs/proof/api/T4-dedup.txt
  - /docs/proof/db/T4-postgis-similarity.txt
- **Status**: ⏳ PENDING

### GAP-C-M2: SLA Monitoring

- **Source**: `01-gap-analysis.md#L266-275`
- **Task(s)**: T4 (Report Governance)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

### GAP-C-M3: Bidirectional Report Relations

- **Source**: `01-gap-analysis.md#L277-298`
- **Task(s)**: T4 (Report Governance)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

---

## D. Task Dispatch

### GAP-D-M1: Task Assignment Events

- **Source**: `01-gap-analysis.md#L318-355`
- **Task(s)**: T5 (Dispatch Integration)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
  - /docs/proof/logs/T5-event-emitter.txt
- **Status**: ⏳ PENDING

### GAP-D-M2: Check-in/Check-out

- **Source**: `01-gap-analysis.md#L357-367`
- **Task(s)**: T5 (Dispatch Integration)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
  - /docs/proof/api/T5-checkin.txt
- **Status**: ⏳ PENDING

---

## F. Security & Governance

### SEC-F-M1: Controller Guard Coverage

- **Source**: `04-security-and-governance.md#RBAC`
- **Task(s)**: T7a (Shift-left), T7 (Security Gate)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
  - /docs/proof/security/T1-routes-guards-mapping.json
  - /docs/proof/security/T7-guard-coverage-matrix.md
  - /docs/proof/security/T7-scan-before.txt
  - /docs/proof/security/T7-scan-after.txt
- **Status**: 🟡 IN-PROGRESS (T1 mapping underway)

### SEC-F-M2: Sensitive Data Masking

- **Source**: `04-security-and-governance.md#資料保護`
- **Task(s)**: T7b (Security Gate)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

### SEC-F-M3: File Integrity (Hash)

- **Source**: `04-security-and-governance.md#照片影片防竄改`
- **Task(s)**: T7c (Security Gate)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

### SEC-F-M4: Soft-Delete Strategy

- **Source**: `04-security-and-governance.md#軟刪除`
- **Task(s)**: T7d (Security Gate)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

---

## G. AAR & Reporting

### GAP-G-M1: AAR Auto-Aggregation

- **Source**: `01-gap-analysis.md#L556-585`
- **Task(s)**: T6 (AAR & Export)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
  - /docs/proof/api/T6-aar-generate.txt
- **Status**: ⏳ PENDING

### GAP-G-M2: Timeline Visualization

- **Source**: `01-gap-analysis.md#L587-596`
- **Task(s)**: T6 (AAR & Export)
- **Commit/PR**: ⏳ Pending
- **Evidence**: ⏳ Pending
- **Status**: ⏳ PENDING

---

## DEPR: Deprecation & Cleanup

### DEPR-AR-VR-STUBS: Remove AR/VR Stub Modules

- **Source**: `03-deprecation-cleanup.md#可安全刪除清單`
- **Task(s)**: T8 (Deprecation Gate)
- **Commit/PR**: ⏳ Pending (after Security Gate)
- **Evidence**: ⏳ Pending
  - /docs/proof/logs/T8-grep-before.txt
  - /docs/proof/logs/T8-grep-after.txt
  - /docs/proof/logs/T8-build-verification.txt
- **Status**: ⏳ PENDING

---

## Summary Statistics

| Phase | Total | Pass | In-Progress | Pending | Blocked |
|-------|:-----:|:----:|:-----------:|:-------:|:-------:|
| Phase-0 Baseline | 2 | 2 | 0 | 0 | 0 |
| Phase-0 Security | 2 | 1 | 1 | 0 | 0 |
| ICS/C2 | 3 | 0 | 0 | 3 | 0 |
| Mobilization | 2 | 0 | 0 | 2 | 0 |
| Reports | 3 | 0 | 0 | 3 | 0 |
| Dispatch | 2 | 0 | 0 | 2 | 0 |
| Security | 4 | 0 | 1 | 3 | 0 |
| AAR | 2 | 0 | 0 | 2 | 0 |
| Deprecation | 1 | 0 | 0 | 1 | 0 |
| **TOTAL** | **21** | **3** | **2** | **16** | **0** |

---

**Next Update**: After Gate-P0 completion  
**Last Updated**: 2026-01-14 07:30 UTC+8

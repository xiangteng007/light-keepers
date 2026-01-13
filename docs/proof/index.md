# Evidence Index

> **Created**: 2026-01-13  
> **Purpose**: Central index for all evidence collected during Commander Mode execution  
> **Authority**: All counts reference [baseline-counting-spec.md](../audit/baseline-counting-spec.md)

---

## T0: Repo Baseline Scanning

**Status**: ✅ COMPLETE  
**Gate**: Phase-0  
**Commit**: `440f016`

### E1: Code Evidence

- ✅ [`T0-modules-list.txt`](logs/T0-modules-list.txt) - 192 backend modules
- ✅ [`T0-pages-list.txt`](logs/T0-pages-list.txt) - 114 frontend pages
- ✅ [`T0-count-summary.json`](logs/T0-count-summary.json) - Machine-readable baseline

### E3: Test Evidence

- ✅ [`T0-baseline-scan.txt`](logs/T0-baseline-scan.txt) - Scan execution log

### E4: Safety Evidence

- Reproducible: `pwsh tools/audit/scan-baseline.ps1`

### E5: Acceptance Check

- [x] Module count verified: **192 modules**
- [x] Page count verified: **114 pages**
- [x] Counts from reproducible script
- [x] JSON output with item lists

---

## T1: Route ↔ Guard Mapping

**Status**: ✅ COMPLETE  
**Gate**: Phase-0  
**Commit**: `440f016`

### E1: Code Evidence

- ✅ [`T1-routes-guards-mapping.json`](security/T1-routes-guards-mapping.json) - 1108 routes mapped
- ✅ [`T1-routes-guards-report.md`](security/T1-routes-guards-report.md) - Human-readable report

### E2: Runtime Evidence

- ✅ [`T1-route-guard-scan.txt`](logs/T1-route-guard-scan.txt) - Scan output

### E3: Test Evidence

- ⏳ [`T7a-smoke-tests.txt`](logs/T7a-smoke-tests.txt) - 10 endpoint smoke (pending run)

### E5: Acceptance Check

- [x] All routes mapped: **1108 routes**
- [x] Coverage calculated: **60.6%** (672/1108)
- [x] Missing guards identified: **436 unprotected**
- [ ] 10 high-risk E2E pass (pending run)

---

## T7a: Shift-left Security

**Status**: ✅ COMPLETE (guards added)  
**Gate**: Gate-Security  
**Commit**: `30aeae9`

### E1: Code Evidence

- ✅ 6 controllers secured (+56 routes)
- ✅ Coverage improved: 55.6% → 60.6%

### E2: Runtime Evidence

- ⏳ [`T7a-requests-responses.txt`](api/T7a-requests-responses.txt) - API logs (pending run)

### E3: Test Evidence

- ⏳ [`T7a-smoke-tests.txt`](logs/T7a-smoke-tests.txt) - 10 endpoint E2E (pending run)

### E4: Safety Evidence

- Rollback: `git revert 30aeae9`
- [`public-surface.md`](security/public-surface.md) - Public endpoints documented

### E5: Acceptance Check

- [x] High-risk controllers protected (6)
- [x] Guards with RequiredLevel added
- [ ] 10 E2E tests pass (pending run)
- [ ] Security score calculated

---

## CI Gate Automation

**Status**: ✅ IMPLEMENTED  
**Gate**: Gate-Security-ShiftLeft  
**Workflow**: [`.github/workflows/audit-gates.yml`](../../.github/workflows/audit-gates.yml)

### E1: Code Evidence

- ✅ [`audit-gates.yml`](../../.github/workflows/audit-gates.yml) - CI workflow
- ✅ [`ci-gate-check.ps1`](../../tools/audit/ci-gate-check.ps1) - G1-G5 hard rules
- ✅ [`validate-public-surface.ps1`](../../tools/audit/validate-public-surface.ps1) - Policy compliance

### E3: Test Evidence

- ⏳ [`public-surface-check-report.md`](security/public-surface-check-report.md) - Validation output

### E5: Acceptance Check (G1-G5)

- [ ] G1: Baseline SSOT exists (`T0-count-summary.json`)
- [ ] G2: Guard mapping exists (`T1-routes-guards-mapping.json`)
- [ ] G3: Public surface policy-compliant
- [ ] G4: Stub modules disabled in production
- [ ] G5: No new unprotected routes added

### Repro Commands

```powershell
# Run all CI gate checks locally
pwsh tools/audit/scan-baseline.ps1
pwsh tools/audit/scan-routes-guards.ps1
pwsh tools/audit/validate-public-surface.ps1
pwsh tools/audit/ci-gate-check.ps1
```

---

## Evidence Pack Legend

| Category | Description |
|----------|-------------|
| **E1** | Code Evidence (diffs, listings) |
| **E2** | Runtime Evidence (API calls, logs) |
| **E3** | Test Evidence (execution logs) |
| **E4** | Safety Evidence (rollback, impact) |
| **E5** | Acceptance Check (DoD verification) |

---

## Quick Links

| Document | Path |
|----------|------|
| Baseline Spec | [`baseline-counting-spec.md`](../audit/baseline-counting-spec.md) |
| Execution Plan | [`agent-execution-plan.md`](../audit/agent-execution-plan.md) |
| Traceability | [`traceability.md`](traceability.md) |
| Security Scoring | [`security-maturity-scoring.md`](../audit/security-maturity-scoring.md) |
| Public Surface | [`public-surface.md`](security/public-surface.md) |
| CI Workflow | [`audit-gates.yml`](../../.github/workflows/audit-gates.yml) |

---

**Last Updated**: 2026-01-13 16:40 UTC+8

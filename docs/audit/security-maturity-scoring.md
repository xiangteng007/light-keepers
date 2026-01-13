# Security Maturity Scoring Rubric

> **Created**: 2026-01-13  
> **Purpose**: Define objective, verifiable scoring criteria for security maturity  
> **Baseline Score**: 55.6% (based on T1 route-guard scan)  
> **Target Score**: 91%

---

## Scoring Philosophy

1. **Objective**: Each criterion has a pass/fail condition based on evidence
2. **Weighted**: Criteria are weighted by risk impact
3. **Verifiable**: All inputs come from scan outputs or test logs
4. **Incremental**: Score improves as security controls are added

---

## Scoring Categories

### Category A: Route Protection (40 points max)

| Criterion | Weight | Pass Condition | Evidence Source |
|-----------|:------:|----------------|-----------------|
| A1: High-risk routes have guards | 15 | All routes in `attendance`, `events`, `mission-sessions`, `donations`, `payroll` have `@UseGuards` or `@RequireLevel` | `T1-routes-guards-mapping.json` |
| A2: CRUD operations protected | 10 | All POST/PUT/PATCH/DELETE routes have auth | `T1-routes-guards-mapping.json` |
| A3: Sensitive data routes have level checks | 10 | Routes returning PII have `@RequireLevel(3+)` | Manual review + mapping |
| A4: Rate limiting on public routes | 5 | Public routes have `@Throttle` | `T1-routes-guards-mapping.json` |

**Current Score**: 22/40 (55.6% coverage × 40)

---

### Category B: Authentication & Authorization (25 points max)

| Criterion | Weight | Pass Condition | Evidence Source |
|-----------|:------:|----------------|-----------------|
| B1: JWT guard on all non-public routes | 10 | Global guard or per-controller `@UseGuards(JwtAuthGuard)` | Code scan |
| B2: Role-based access on admin routes | 8 | Admin routes require `@RequireLevel(4+)` or `@Roles('Admin')` | `T1-routes-guards-mapping.json` |
| B3: Ownership validation on resource routes | 7 | Routes with `:id` params validate ownership | E2E tests |

**Current Score**: 10/25 (estimated from scan)

---

### Category C: Data Protection (20 points max)

| Criterion | Weight | Pass Condition | Evidence Source |
|-----------|:------:|----------------|-----------------|
| C1: Sensitive fields masked for low-level users | 8 | PII masked when `roleLevel < 3` | API response tests |
| C2: Audit logging on sensitive access | 6 | `sensitive.controller.ts` logs all access | Code review |
| C3: Soft-delete on core entities | 6 | `events`, `reports`, `tasks`, `volunteers` have `deletedAt` | Entity scan |

**Current Score**: 6/20 (audit logging exists)

---

### Category D: Infrastructure Security (15 points max)

| Criterion | Weight | Pass Condition | Evidence Source |
|-----------|:------:|----------------|-----------------|
| D1: CORS properly configured | 4 | CORS whitelist in production, not `*` | Config review |
| D2: Rate limiting enabled | 4 | Global rate limit configured | `main.ts` or config |
| D3: HTTPS enforced | 3 | Production runs on HTTPS | Deployment config |
| D4: Security headers (CSP, HSTS) | 4 | Helmet.js or equivalent configured | Code review |

**Current Score**: 8/15 (HTTPS + CORS configured)

---

## Score Calculation

### Formula

```
Total Score = (A_score + B_score + C_score + D_score) / 100 × 100%
```

### Current Baseline

| Category | Max | Current | Percentage |
|----------|:---:|:-------:|:----------:|
| A: Route Protection | 40 | 22 | 55% |
| B: Auth & AuthZ | 25 | 10 | 40% |
| C: Data Protection | 20 | 6 | 30% |
| D: Infrastructure | 15 | 8 | 53% |
| **TOTAL** | **100** | **46** | **46%** |

> [!NOTE]
> The initial 74% estimate was based on partial analysis. The comprehensive scan reveals 46% actual coverage. The path to 91% requires addressing unprotected routes first.

---

## Scoring Script Output Schema

The scoring script (`score-security-maturity.ts`) outputs:

```json
{
  "version": "1.0.0",
  "generated_at": "2026-01-13T02:15:00Z",
  "rubric_version": "security-maturity-scoring.md@v1",
  "categories": {
    "A_route_protection": {
      "max": 40,
      "score": 22,
      "criteria": {
        "A1_high_risk_guards": { "pass": false, "evidence": "492 unprotected" },
        "A2_crud_protected": { "pass": false, "evidence": "XX POST/PUT unprotected" },
        "A3_sensitive_level": { "pass": false, "evidence": "needs manual review" },
        "A4_rate_limiting": { "pass": false, "evidence": "0 @Throttle found" }
      }
    },
    ...
  },
  "total_score": 46,
  "total_max": 100,
  "percentage": 46.0,
  "target": 91,
  "gap": 45
}
```

---

## Path to 91%

### Phase 1: T7a Quick Wins (Target: 65%)

| Action | Points Gained | Effort |
|--------|:-------------:|:------:|
| Add guards to `attendance` controller | +3 | 1h |
| Add guards to `events` controller | +3 | 1h |
| Add guards to `mission-sessions/*` controllers | +8 | 3h |
| Add guards to `donations` | +2 | 0.5h |
| Add guards to `payroll` | +2 | 0.5h |
| Add `@RequireLevel` to admin routes | +5 | 2h |

**Subtotal**: +23 points → **69%**

### Phase 2: T7b-d Deep Security (Target: 91%)

| Action | Points Gained | Effort |
|--------|:-------------:|:------:|
| Implement ownership validation (B3) | +7 | 8h |
| Add sensitive data masking (C1) | +8 | 6h |
| Add soft-delete to core entities (C3) | +6 | 4h |
| Add rate limiting to public routes (A4) | +5 | 2h |

**Subtotal**: +26 points → **95%**

---

## Verification Commands

```powershell
# Re-run route-guard scan after fixes
pwsh tools/audit/scan-routes-guards.ps1

# Run scoring script
pwsh tools/audit/score-security-maturity.ps1

# Compare before/after coverage
# Before: 55.6%, After: should be >= 91%
```

---

## Evidence Requirements

For each criterion to pass, the following evidence must exist:

| Criterion | Required Evidence |
|-----------|-------------------|
| A1 | `T1-routes-guards-mapping.json` shows 0 high-risk unprotected |
| A2 | All POST/PUT/DELETE in mapping have `hasGuard: true` |
| B3 | E2E test logs showing 403 on unauthorized resource access |
| C1 | API response comparison (masked vs unmasked) |
| D1 | CORS config file + curl test |

---

**Last Updated**: 2026-01-13  
**Rubric Version**: 1.0.0

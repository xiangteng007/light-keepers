# Public Surface Review

> **Purpose**: Auditable list of intentionally public endpoints  
> **Policy**: **Policy-B** (Level(0) or @Public = public; smoke test required)  
> **Last Updated**: 2026-01-13 16:20 UTC+8

---

## Policy Selection: Policy-B

> [!IMPORTANT]
> **Policy-B Selected**: Endpoints with `@Public()` or `@RequiredLevel(ROLE_LEVELS.PUBLIC)` are treated as public.
> All public endpoints MUST have:
>
> 1. Explicit `@Public()` decorator (preferred) OR `@RequiredLevel(0)`
> 2. `@Throttle()` rate limiting
> 3. Entry in this document
> 4. Smoke test verification (no token → 200)

---

## Public Endpoints Inventory (Exhaustive - No Wildcards)

### Health Endpoints (Intentionally Public)

| # | Method | Path | Controller | Why Public | Data Exposure | @Public | @Throttle | Status |
|---|--------|------|------------|------------|:-------------:|:-------:|:---------:|:------:|
| 1 | GET | `/health` | `health.controller.ts` | K8s liveness | none | ⏳ ADD | ⏳ ADD | REVIEW |
| 2 | GET | `/health/detailed` | `health.controller.ts` | Ops monitoring | low | ⏳ ADD | ⏳ ADD | REVIEW |
| 3 | GET | `/health/live` | `health.controller.ts` | K8s liveness | none | ⏳ ADD | ⏳ ADD | REVIEW |
| 4 | GET | `/health/ready` | `health.controller.ts` | K8s readiness | none | ⏳ ADD | ⏳ ADD | REVIEW |
| 5 | GET | `/health` | `health-only.controller.ts` | CI health | none | ⏳ ADD | ⏳ ADD | REVIEW |
| 6 | GET | `/health/live` | `health-only.controller.ts` | CI liveness | none | ⏳ ADD | ⏳ ADD | REVIEW |
| 7 | GET | `/health/ready` | `health-only.controller.ts` | CI readiness | none | ⏳ ADD | ⏳ ADD | REVIEW |

### Donation Public Stats (Intentionally Public)

| # | Method | Path | Controller | Why Public | Data Exposure | @Public | @Throttle | Status |
|---|--------|------|------------|------------|:-------------:|:-------:|:---------:|:------:|
| 8 | GET | `/api/donations/public/stats` | `donation-tracking.controller.ts` | Transparency | low | ✅ HAS RequiredLevel(0) | ⏳ ADD | PASS |

---

## Stub Modules Attack Surface (NOT Intentionally Public)

> [!CAUTION]
> These modules lack guards but are NOT intended to be public.
> **Required Action**: Disable from production OR apply OWNER-only guard.

| Module | Controller Path | Routes | Current Status | Required Action |
|--------|-----------------|-------:|----------------|-----------------|
| `ar-field-guidance` | `modules/ar-field-guidance/ar-field-guidance.controller.ts` | 19 | Unprotected | **MUST DISABLE** |
| `drone-swarm` | `modules/drone-swarm/drone-swarm.controller.ts` | 23 | Unprotected | **MUST DISABLE** |
| `supply-chain-blockchain` | `modules/supply-chain-blockchain/supply-chain-blockchain.controller.ts` | 12 | Unprotected | **MUST DISABLE** |
| `aerial-image-analysis` | `modules/aerial-image-analysis/aerial-image-analysis.controller.ts` | 11 | Unprotected | **MUST DISABLE** |
| `quantum-routing` | `modules/quantum-routing/quantum-routing.controller.ts` | 8 | Unprotected | **MUST DISABLE** |
| `vr-command` | `modules/vr-command/vr-command.controller.ts` | 10+ | Unprotected | **MUST DISABLE** |

**Total Stub Routes**: ~83 (attack surface)

---

## Production Kill-Switch Strategy

### Option A: Conditional Module Import (SELECTED)

In `app.module.ts`, stub modules will be excluded from production:

```typescript
const STUB_MODULES = [
  ArFieldGuidanceModule,
  DroneSwarmModule,
  SupplyChainBlockchainModule,
  AerialImageAnalysisModule,
  QuantumRoutingModule,
  VrCommandModule,
];

@Module({
  imports: [
    ...CORE_MODULES,
    ...(process.env.ENABLE_STUB_MODULES === 'true' ? STUB_MODULES : []),
  ],
})
export class AppModule {}
```

### Verification

After implementing kill-switch:

1. `runtime mapping` should show 0 routes from stub modules
2. Smoke test: `GET /ar-field-guidance/*` → 404

---

## Rate Limiting Requirements

| Endpoint Type | Limit | Window | Implementation |
|---------------|------:|-------:|----------------|
| Health/liveness | 120 req | 1 min | `@Throttle({ default: { limit: 120, ttl: 60000 } })` |
| Public stats | 30 req | 1 min | `@Throttle({ default: { limit: 30, ttl: 60000 } })` |

---

## Smoke Test Evidence Required

For each public endpoint, smoke test must verify:

- **No token**: Returns 200 (not 401/403)
- **Throttle**: Returns 429 after limit exceeded

Evidence location: `docs/proof/logs/T7a-smoke-tests.txt`

---

## Action Items

- [ ] Add `@Public()` decorator to health endpoints
- [ ] Add `@Throttle()` to all health endpoints
- [ ] Implement stub modules kill-switch in `app.module.ts`
- [ ] Re-run route-guard scan to verify stub routes removed
- [ ] Run smoke tests to verify public endpoints

---

**Reviewed by**: _pending_  
**Approved by**: _pending_

# Public Surface Review

> **Purpose**: Auditable list of intentionally public endpoints  
> **Status**: REVIEW REQUIRED  
> **Last Updated**: 2026-01-13

---

## Rule: All public endpoints MUST have

1. `@Public()` decorator (not just "no guard")
2. Rate limiting / throttling
3. Data exposure classification
4. Entry in this document

---

## Public Endpoints Inventory

| Endpoint | Method | Why Public | Data Exposure | Controls Required | Status |
|----------|--------|------------|:-------------:|-------------------|:------:|
| `/health` | GET | K8s liveness | none | @Public + throttle | ⏳ REVIEW |
| `/health/live` | GET | K8s liveness | none | @Public + throttle | ⏳ REVIEW |
| `/health/ready` | GET | K8s readiness | none | @Public + throttle | ⏳ REVIEW |
| `/health/detailed` | GET | Ops monitoring | low | @Public + throttle + no secrets | ⏳ REVIEW |
| `/api/donations/public/stats` | GET | Transparency | low | @Public + throttle + cache | ✅ HAS @RequiredLevel(0) |
| `/weather/*` | GET | Public forecast | low | Review needed | ⏳ REVIEW |
| `/ncdr-alerts/public` | GET | Emergency alerts | low | Should be public | ⏳ REVIEW |

---

## Stub Modules (Attack Surface - NOT Public Intent)

> [!CAUTION]
> These modules are NOT intended to be public but currently lack guards.
> They must be either disabled from production or protected with OWNER-only guard.

| Module | Routes | Current Status | Required Action |
|--------|-------:|----------------|-----------------|
| `ar-field-guidance` | 19 | Unprotected | Disable OR OWNER-only |
| `drone-swarm` | 23 | Unprotected | Disable OR OWNER-only |
| `supply-chain-blockchain` | 12 | Unprotected | Disable OR OWNER-only |
| `aerial-image-analysis` | 11 | Unprotected | Disable OR OWNER-only |
| `vr-command` | ~10 | Unprotected | Disable OR OWNER-only |
| `quantum-routing` | ~8 | Unprotected | Disable OR OWNER-only |

---

## Controls Specification

### Rate Limiting Requirements

| Endpoint Type | Limit | Window |
|---------------|------:|-------:|
| Health/liveness | 60 req | 1 min |
| Public stats | 30 req | 1 min |
| Weather/forecast | 60 req | 1 min |
| Emergency alerts | 120 req | 1 min |

### Data Exposure Levels

| Level | Definition | Public Allowed? |
|-------|------------|:---------------:|
| none | No user data | ✅ |
| low | Aggregated/anonymous | ✅ with throttle |
| medium | Org-level data | ❌ |
| high | PII/sensitive | ❌ |

---

## Action Items

1. [ ] Add `@Public()` decorator to health endpoints
2. [ ] Add `@Throttle()` to all public endpoints
3. [ ] Disable stub modules in production OR add OWNER-only guard
4. [ ] Review weather endpoints for appropriate access level
5. [ ] Review NCDR public alerts access

---

**Reviewed by**: _pending_  
**Approved by**: _pending_

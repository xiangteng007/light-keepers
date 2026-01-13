<!-- AUTO-GENERATED FILE. DO NOT EDIT MANUALLY. -->
<!-- source: docs/policy/public-surface.policy.json -->
<!-- policySha256: 2abefd5057f5ac9d46c9c7585a980ecc8b122cd8d847b3d3e909809ee2dbedd4 -->

# Public Surface Inventory (AUTO-GENERATED)

> **WARNING**: This file is auto-generated from `docs/policy/public-surface.policy.json`.
> Do NOT edit manually. Run `pwsh tools/audit/generate-public-surface-md.ps1` to regenerate.

- Policy: **Policy-B**
- Version: **1.1.0**
- SSOT: `docs/policy/public-surface.policy.json`
- Endpoints: **8**

---

## Rules

- **Public Definition**: Only `@Public()` or `@RequiredLevel(0)` are considered public.
- **Enforcement**: Unprotected routes not in allowlist are CI gate violations.
- **Requirements**: Each public endpoint must specify: dataExposure, throttle, smokeRequired.

---

## Endpoints

| Endpoint | Intent | Exposure | Throttle | Smoke |
|----------|--------|----------|----------|-------|
| `POST /auth/forgot-password` | Password reset request | none | 5/60000ms | optional |
| `POST /auth/login` | User authentication entry point | medium | 10/60000ms | required |
| `POST /auth/refresh` | Token refresh (requires refresh token cookie) | low | 30/60000ms | required |
| `POST /auth/register` | User registration | medium | 5/60000ms | required |
| `GET /health` | K8s liveness probe | none | 120/60000ms | optional |
| `GET /health/detailed` | Ops monitoring | low | 60/60000ms | optional |
| `GET /health/live` | K8s liveness probe | none | 120/60000ms | optional |
| `GET /health/ready` | K8s readiness probe | none | 120/60000ms | optional |

---

## Stub Modules Blacklist

The following modules are **disabled by default** in production (`ENABLE_STUB_MODULES=false`):

- `ArFieldGuidanceModule`
- `ArNavigationModule`
- `VrCommandModule`
- `DroneSwarmModule`
- `SupplyChainBlockchainModule`
- `AerialImageAnalysisModule`

---

## Verification

```powershell
# Regenerate this file
pwsh tools/audit/generate-public-surface-md.ps1

# Validate (strict mode)
pwsh tools/audit/validate-public-surface.ps1 -Strict

# Full CI gate check
pwsh tools/audit/ci-gate-check.ps1 -Strict
```

<!-- AUTO-GENERATED FILE. DO NOT EDIT MANUALLY. -->
<!-- source: docs/policy/public-surface.policy.json -->
<!-- policySha256: eb9593be08533605795b7b10879653feabc73fc780cb8d788c7dd30c962a6716 -->

# Public Surface Inventory (AUTO-GENERATED)

> **WARNING**: This file is auto-generated from `docs/policy/public-surface.policy.json`.
> Do NOT edit manually. Run `pwsh tools/audit/generate-public-surface-md.ps1` to regenerate.

- Policy: **Policy-B**
- Version: **1.0.0**
- SSOT: `docs/policy/public-surface.policy.json`
- Endpoints: **0**

---

## Rules

- **Public Definition**: Only `@Public()` or `@RequiredLevel(0)` are considered public.
- **Enforcement**: Unprotected routes not in allowlist are CI gate violations.
- **Requirements**: Each public endpoint must specify: dataExposure, throttle, smokeRequired.

---

## Endpoints

> **Phase 0**: No endpoints in allowlist. All unprotected routes are reported as warnings.
> Add `@Public()` decorator to code, then add endpoint to policy.json.

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

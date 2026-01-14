# Public Surface Check Report

- CheckedAt: **2026-01-15T00:46:09.7429890+08:00**
- Policy: **Policy-B**
- OK: **True**

## Summary

| Metric | Value |
|---|---:|
| Policy endpoints | 10 |
| Mapping routes | 1113 |
| Unprotected routes (unique) | 11 |
| Unprotected not allowlisted | 1 |
| Errors | 0 |
| Warnings | 4 |

## Warnings
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health/ready (using first candidate for checks)
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health/live (using first candidate for checks)
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health (using first candidate for checks)
- **UNPROTECTED_NOT_ALLOWLISTED**: Found unprotected routes not allowlisted (non-strict). CI gate will likely fail later. Sample up to 30:
  - GET /auth/me/status

## Artifacts

- JSON: `docs/proof/security/public-surface-check-report.json`
- Mapping: `docs/proof/security/T1-routes-guards-mapping.json`
- Policy: `docs/policy/public-surface.policy.json`


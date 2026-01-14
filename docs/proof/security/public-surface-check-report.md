# Public Surface Check Report

- CheckedAt: **2026-01-15T01:29:13.4092939+08:00**
- Policy: **Policy-B**
- OK: **True**

## Summary

| Metric | Value |
|---|---:|
| Policy endpoints | 10 |
| Mapping routes | 1113 |
| Unprotected routes (unique) | 10 |
| Unprotected not allowlisted | 0 |
| Errors | 0 |
| Warnings | 3 |

## Warnings
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health/ready (using first candidate for checks)
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health/live (using first candidate for checks)
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health (using first candidate for checks)

## Artifacts

- JSON: `docs/proof/security/public-surface-check-report.json`
- Mapping: `docs/proof/security/T1-routes-guards-mapping.json`
- Policy: `docs/policy/public-surface.policy.json`


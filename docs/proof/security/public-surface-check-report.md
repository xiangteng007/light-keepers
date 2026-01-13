# Public Surface Check Report

- CheckedAt: **2026-01-13T20:52:47.5598934+08:00**
- Policy: **Policy-B**
- OK: **True**

## Summary

| Metric | Value |
|---|---:|
| Policy endpoints | 8 |
| Mapping routes | 1105 |
| Unprotected routes (unique) | 436 |
| Unprotected not allowlisted | 428 |
| Errors | 0 |
| Warnings | 4 |

## Warnings
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health/ready (using first candidate for checks)
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health/live (using first candidate for checks)
- **MAPPING_DUPLICATE_KEY**: Multiple routes share the same normalized key: GET /health (using first candidate for checks)
- **UNPROTECTED_NOT_ALLOWLISTED**: Found unprotected routes not allowlisted (non-strict). CI gate will likely fail later. Sample up to 30:
  - POST /aerial-analysis/images
  - GET /aerial-analysis/images/:param
  - GET /aerial-analysis/images/mission/:param
  - GET /aerial-analysis/images/pending
  - POST /aerial-analysis/images/:param/analyze
  - POST /aerial-analysis/images/batch-analyze
  - POST /aerial-analysis/assessments
  - GET /aerial-analysis/assessments
  - GET /aerial-analysis/assessments/:param
  - POST /aerial-analysis/compare
  - GET /aerial-analysis/detections/persons
  - POST /ar/markers
  - GET /ar/markers/:param
  - GET /ar/markers/floor/:param/:param
  - PUT /ar/markers/:param
  - DELETE /ar/markers/:param
  - POST /ar/routes
  - GET /ar/routes/:param
  - POST /ar/routes/shortest
  - POST /ar/routes/evacuation
  - POST /ar/floor-plans
  - GET /ar/floor-plans/:param
  - GET /ar/floor-plans/building/:param
  - POST /ar/sessions
  - PUT /ar/sessions/:param/position
  - GET /ar/sessions/:param
  - GET /ar/sessions/active
  - DELETE /ar/sessions/:param
  - GET /ar/view
  - POST /auth/reset-password

## Artifacts

- JSON: `docs/proof/security/public-surface-check-report.json`
- Mapping: `docs/proof/security/T1-routes-guards-mapping.json`
- Policy: `docs/policy/public-surface.policy.json`


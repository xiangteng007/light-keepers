# Route-Guard Mapping Report

> **Generated**: 2026-01-14T17:29:02.008Z  
> **Script**: scan-routes-guards.ps1  
> **Spec**: baseline-counting-spec.md@v1

---

## Summary

| Metric | Value |
|--------|------:|
| Total Routes | 1113 |
| Protected Routes | 684 |
| Unprotected Routes | 429 |
| Public Routes | 13 |
| **Coverage** | **61.5%** |

---

## Controller Statistics

| Metric | Value |
|--------|------:|
| Total Controllers | 131 |
| With Guards | 81 |
| Without Guards | 50 |

---

## High-Risk Routes (Missing Guards)

> All routes are protected!

---

## Protected Routes by Guard Type

### With RequireLevel

- `GET /webhooks/subscriptions` -> Level 3
- `GET /webhooks/subscriptions/:id` -> Level 3
- `POST /webhooks/subscriptions` -> Level 3
- `PUT /webhooks/subscriptions/:id` -> Level 3
- `DELETE /webhooks/subscriptions/:id` -> Level 3
- `POST /webhooks/subscriptions/:id/regenerate-secret` -> Level 3
- `POST /webhooks/subscriptions/:id/test` -> Level 3
- `POST /webhooks/subscriptions/:id/enable` -> Level 3
- `POST /webhooks/subscriptions/:id/disable` -> Level 3
- `GET /webhooks/event-types` -> Level 3
- `GET /webhooks/logs` -> Level 3
- `GET /webhooks/stats` -> Level 3
- `POST /webhooks/dispatch` -> Level 3


### Explicitly Public

- `GET /health` -> @Public()
- `GET /health/live` -> @Public()
- `GET /health/ready` -> @Public()
- `GET /health` -> @Public()
- `GET /health/detailed` -> @Public()
- `GET /health/live` -> @Public()
- `GET /health/ready` -> @Public()
- `POST /auth/register` -> @Public()
- `POST /auth/login` -> @Public()
- `POST /auth/forgot-password` -> @Public()
- `POST /auth/reset-password` -> @Public()
- `POST /auth/refresh` -> @Public()
- `POST /intake` -> @Public()


---

## Next Steps

1. Review high-risk routes and add appropriate guards
2. Run E2E tests on 10 high-risk endpoints
3. Calculate security maturity score

---

**Full data**: [T1-routes-guards-mapping.json](T1-routes-guards-mapping.json)

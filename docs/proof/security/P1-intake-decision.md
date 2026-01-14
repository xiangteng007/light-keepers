# P1-2: POST /intake Public Decision

## Endpoint Information

- **Method**: POST
- **Path**: `/intake`
- **Controller**: `intake.controller.ts`
- **Current Status**: `@Public() + @Throttle(10/min) + Allowlisted`

## Purpose

統一通報入口，允許匿名用戶提交災難通報/求救資訊。

## Attack Surface Analysis

| Attack Vector | Risk | Mitigation |
|---------------|------|------------|
| Spam/DDoS | HIGH | @Throttle(10/min) ✅ |
| Fake reports | MEDIUM | Requires manual review workflow |
| Data injection | MEDIUM | class-validator DTO validation ✅ |
| Resource exhaustion | LOW | Payload size limit (default NestJS) |

## Decision: **Option A (Maintain Public)**

### Rationale

1. **业务需求**: 災難通報必須允許匿名提交，因為緊急情況下使用者可能無法登入
2. **已有保護措施**:
   - `@Throttle({ default: { limit: 10, ttl: 60000 } })` - 每分鐘最多 10 次
   - GlobalAuthGuard 繞過僅因 `@Public()` 裝飾器
   - ThrottlerGuard 仍對此端點生效
3. **資料曝露**: Low - 只接收通報資料，不回傳敏感資訊

### Additional Recommended Mitigations (Future)

- [ ] Implement CAPTCHA for high-volume scenarios
- [ ] Add IP-based rate limiting (beyond route-level)
- [ ] Content-type strict validation
- [ ] Payload size limit enforcement

## Code Changes

- **File**: `backend/src/modules/intake/intake.controller.ts`
- **Decorators**: `@Public()`, `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- **Policy**: Added to `docs/policy/public-surface.policy.json` endpoints array

## Evidence Paths

- Policy: `docs/policy/public-surface.policy.json`
- Controller: `backend/src/modules/intake/intake.controller.ts`
- Gate Summary: `docs/proof/gates/gate-summary.json` (UnprotectedNotAllowlistedProd=0)

---
**Decision Made**: 2026-01-15
**Reviewer**: AI Agent (SEC-T9+ P1-2)

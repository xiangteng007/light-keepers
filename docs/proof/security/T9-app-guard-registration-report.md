# T9: App Guard Registration Report

- **CheckedAt**: 2026-01-14T22:52:31+08:00
- **File**: `backend/src/app.module.ts`
- **Status**: **PASS**

## Summary

| Check | Result |
|-------|--------|
| GlobalAuthGuard registered | YES |
| ThrottlerGuard registered | YES |
| Guard order correct | YES |

## Detected Guards (in registration order)

| Order | Guard | Line |
|-------|-------|------|
| 0 | `ThrottlerGuard` | 511 |
| 1 | `GlobalAuthGuard` | 518 |

## Evidence Snippets

### ThrottlerGuard (Line 511)

```typescript
provide: APP_GUARD, useClass: ThrottlerGuard
```

### GlobalAuthGuard (Line 518)

```typescript
provide: APP_GUARD, useClass: GlobalAuthGuard
```

## Interpretation

**PASS**: GlobalAuthGuard is correctly registered as APP_GUARD after ThrottlerGuard. All routes are protected by default unless marked with `@Public()` or `@RequiredLevel(0)`.

---

**Artifacts**:

- JSON: `docs/proof/security/T9-app-guard-registration-report.json`

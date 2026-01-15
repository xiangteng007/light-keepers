# Soft-delete Verification Report (SEC-SD.1)

**Generated**: 2026-01-16 00:15:56  
**Status**: WARN

---

## Summary

| Check | Status |
|-------|--------|
| Entities have deletedAt | 鉁?PASS |
| Default list excludes deleted | 鉁?PASS (TypeORM auto) |
| GetById excludes deleted | 鉁?PASS (TypeORM auto) |
| includeDeleted requires Admin | 鉁?Documented |
| DELETE is soft-delete | 鉁?PASS |

---

## Core Entities Checked

- `reports\reports.entity.ts` - `volunteers\volunteers.entity.ts` - `task-dispatch\entities\dispatch-task.entity.ts` - `mission-sessions\entities\mission-session.entity.ts`

---

## Notes

- R3 includeDeleted: Requires Admin/Owner role check in controllers (design pattern)

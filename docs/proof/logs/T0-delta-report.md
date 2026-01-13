# T0 Delta Report - Baseline vs Expected

> **Generated**: 2026-01-13 20:03 UTC+8  
> **Scan Script**: `pwsh tools/audit/scan-baseline.ps1`

---

## Summary

| Metric | Expected (Plan) | Actual (Scan) | Delta |
|--------|-----------------|---------------|-------|
| Backend Modules | 192 | 192 | ✅ 0 |
| Frontend Pages | 114 | 114 | ✅ 0 |

**Result**: ✅ MATCH - No delta between expected and actual counts.

---

## Verification Command

```powershell
pwsh tools/audit/scan-baseline.ps1
```

## Evidence Files

- `docs/proof/logs/T0-count-summary.json` - Module/page counts
- `docs/proof/logs/T0-modules-list.txt` - Backend module list
- `docs/proof/logs/T0-pages-list.txt` - Frontend page list
- `docs/proof/logs/T0-baseline-scan.txt` - Full scan log

---

## Notes

### Stub Modules (ENABLE_STUB_MODULES=false in prod)

The following modules are conditionally loaded and excluded in production:

- ArFieldGuidanceModule
- ArNavigationModule
- VrCommandModule
- DroneSwarmModule
- SupplyChainBlockchainModule
- AerialImageAnalysisModule

These are documented in `docs/policy/public-surface.policy.json` under `stubModulesBlacklist`.

### Recommendation

No cleanup required - counts match expected values.

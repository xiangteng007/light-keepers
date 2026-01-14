---
name: audit-pipeline
description: 執行安全審計管線，生成證據文檔，檢查 Guard Coverage 和 Public Surface 合規性
---

# Audit Pipeline Skill

此技能用於執行 Light Keepers 專案的安全審計管線。

## 執行步驟

### 1. 生成 T9 報告 (App Guard Registration)

```powershell
pwsh tools/audit/generate-app-guard-report.ps1
```

### 2. 掃描路由守衛

```powershell
pwsh tools/audit/scan-routes-guards.ps1 -ProductionMode
```

### 3. 生成 Public Surface 文檔

```powershell
pwsh tools/audit/generate-public-surface-md.ps1
```

### 4. 驗證 Public Surface

```powershell
pwsh tools/audit/validate-public-surface.ps1 -Strict
```

### 5. 執行 CI Gate 檢查

```powershell
pwsh tools/audit/ci-gate-check.ps1 -Strict
```

### 6. 生成證據索引

```powershell
pwsh tools/audit/generate-proof-index.ps1
pwsh tools/audit/generate-traceability.ps1
```

### 7. Drift 檢查

```powershell
git diff --exit-code docs/proof/index.md docs/proof/traceability.md
```

## 關鍵指標

- **strictMode = PASS**: 必須達到才能 release
- **UnprotectedNotAllowlistedProd = 0**: 無未授權公開路由
- **GlobalAuthGuardActive = true**: 全域認證守衛已啟用

## 證據路徑

| 證據 | 路徑 |
|------|------|
| Gate Summary | `docs/proof/gates/gate-summary.json` |
| T9 Report | `docs/proof/security/T9-app-guard-registration-report.json` |
| Route Mapping | `docs/proof/security/T1-routes-guards-mapping.json` |
| Public Surface | `docs/proof/security/public-surface-check-report.json` |

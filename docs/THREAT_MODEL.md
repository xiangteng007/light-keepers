# 🎯 Light Keepers 威脅模型

## STRIDE 分析

### Spoofing (偽冒)

| 威脅 | 風險 | 緩解措施 | 狀態 |
|------|------|---------|------|
| Firebase Token 偽造 | 高 | Firebase Admin 驗證 | ✅ |
| JWT 竄改 | 高 | JWT RS256 簽章 | ✅ |
| Session Hijacking | 中 | Refresh Token Rotation | ✅ |

### Tampering (竄改)

| 威脅 | 風險 | 緩解措施 | 狀態 |
|------|------|---------|------|
| 請求參數竄改 | 高 | class-validator 驗證 | ✅ |
| SQL Injection | 高 | TypeORM 參數化 | ✅ |
| 資料庫直接修改 | 中 | Audit Trail | ✅ |

### Repudiation (否認)

| 威脅 | 風險 | 緩解措施 | 狀態 |
|------|------|---------|------|
| 操作否認 | 中 | 完整 Audit Log | ✅ |
| 時間戳造假 | 低 | 伺服器時間戳 | ✅ |

### Information Disclosure (資訊洩露)

| 威脅 | 風險 | 緩解措施 | 狀態 |
|------|------|---------|------|
| IDOR | 高 | ResourceOwnerGuard | ✅ |
| 跨租戶存取 | 高 | TenantGuard | ✅ |
| 錯誤訊息洩露 | 中 | 通用錯誤訊息 | ⚠️ |
| Log 中 PII | 中 | PII Masking | ⚠️ |

### Denial of Service (阻斷服務)

| 威脅 | 風險 | 緩解措施 | 狀態 |
|------|------|---------|------|
| API 濫用 | 高 | Rate Limiting | ✅ |
| 大檔案上傳 | 中 | 檔案大小限制 | ✅ |
| 資源耗盡 | 中 | Cloud Run 自動擴展 | ✅ |

### Elevation of Privilege (權限提升)

| 威脅 | 風險 | 緩解措施 | 狀態 |
|------|------|---------|------|
| 角色繞過 | 高 | UnifiedRolesGuard | ✅ |
| 垂直權限提升 | 高 | 最小權限原則 | ✅ |
| 水平權限提升 | 高 | ResourceOwnerGuard | ✅ |

---

## 攻擊面

```
                    ┌─────────────┐
                    │   Internet  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Cloud Run  │ ← Rate Limit, WAF
                    │   (API)     │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
  ┌─────▼─────┐     ┌──────▼──────┐    ┌──────▼──────┐
  │ PostgreSQL│     │    Redis    │    │   Storage   │
  │ (Cloud SQL)│    │   (Cache)   │    │    (GCS)    │
  └───────────┘     └─────────────┘    └─────────────┘
```

---

## 風險優先級

| 優先級 | 威脅數 | 狀態 |
|--------|--------|------|
| 高 | 8 | 8/8 已緩解 ✅ |
| 中 | 6 | 4/6 已緩解 ⚠️ |
| 低 | 2 | 2/2 已緩解 ✅ |

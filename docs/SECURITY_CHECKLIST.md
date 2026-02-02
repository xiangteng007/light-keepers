# 🔐 Light Keepers 安全檢查清單

## OWASP Top 10 防護

| # | 風險 | 狀態 | 實作 |
|---|------|------|------|
| A01 | Broken Access Control | ✅ | ResourceOwnerGuard, TenantGuard, UnifiedRolesGuard |
| A02 | Cryptographic Failures | ✅ | bcrypt 密碼雜湊, JWT RS256, HTTPS only |
| A03 | Injection | ✅ | TypeORM 參數化查詢, class-validator |
| A04 | Insecure Design | ✅ | RBAC, 最小權限原則 |
| A05 | Security Misconfiguration | ⚠️ | 需審查 production 配置 |
| A06 | Vulnerable Components | ⚠️ | 需定期更新依賴 |
| A07 | Auth Failures | ✅ | JWT + Refresh Token Rotation |
| A08 | Data Integrity | ✅ | 輸入驗證, soft-delete |
| A09 | Logging Failures | ⚠️ | 需加入 PII masking |
| A10 | SSRF | ✅ | URL 白名單驗證 |

## 認證與授權

- [x] JWT Access Token (15 分鐘有效期)
- [x] Refresh Token Rotation (30 天)
- [x] 六級 RBAC 權限模型
- [x] 資源擁有權驗證 (IDOR 防護)
- [x] 多租戶隔離
- [ ] 2FA 強制啟用 (OFFICER+)

## API 安全

- [x] Rate Limiting (100 req/min)
- [x] CORS 配置白名單
- [ ] CSP Header
- [ ] CSRF Token (for web forms)
- [x] Helmet 安全 Headers

## 資料保護

- [x] 密碼 bcrypt 雜湊 (cost=10)
- [x] 敏感資料加密儲存
- [ ] Log 中 PII masking
- [x] Soft-delete 實作
- [x] Audit Trail

## 基礎設施

- [x] HTTPS only
- [x] Secret Manager 整合
- [x] Cloud Run 安全設定
- [ ] VPC 網路隔離
- [x] Firebase Auth 整合

# 🔐 Light Keepers 安全檢查清單

## OWASP Top 10 防護

| # | 風險 | 狀態 | 實作 |
|---|------|------|------|
| A01 | Broken Access Control | ✅ | GlobalAuthGuard (default-deny), UnifiedRolesGuard (RBAC L0-L5), ResourceOwnerGuard |
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
- [x] RBAC 權限模型（L0–L5）
- [x] 資源擁有權驗證 (IDOR 防護)
- [x] 預設拒絕：所有端點需認證，例外須明示 `@Public()` (GlobalAuthGuard)
- [x] ~~多租戶隔離~~ —— **N/A**：平台為單租戶（單一協會自用），
      不存在跨租戶面。見 `docs/adr/ADR-001-multi-tenant-isolation.md`（Superseded, D9）
- [ ] 2FA 強制啟用 (OFFICER+)

## API 安全

- [x] Rate Limiting —— 全域基準 100 req/min + 10 req/s 突發保護；
      敏感端點收緊：登入/註冊/OTP/密碼重設 5/min、OAuth 10/min、匿名通報 10/min、
      上傳與 AI 推論 20/min、公開查詢 30/min（per IP，見 ADR-004）
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

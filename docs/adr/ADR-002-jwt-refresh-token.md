# ADR-002: JWT 認證與 Refresh Token 策略

## 狀態
已採用

## 背景
平台需要安全的認證機制，同時支援長時間 session 和 token 撤銷。

## 決策
採用 JWT Access Token + Refresh Token Rotation 機制。

### Token 配置

| Token 類型 | 有效期 | 儲存位置 |
|-----------|--------|---------|
| Access Token | 15 分鐘 | Memory / localStorage |
| Refresh Token | 30 天 | HttpOnly Cookie + DB |

### 安全措施

1. **Token Rotation**: 每次使用 refresh token 時產生新的 token
2. **Token Family**: 追蹤 token 家族，偵測 token 竊取
3. **Revocation**: 支援即時撤銷所有 token

## 實作
- `auth/services/refresh-token.service.ts`
- `auth/entities/refresh-token.entity.ts`

## 後果
- ✅ Access Token 短效期降低風險
- ✅ Refresh Token Rotation 防止竊取
- ✅ 支援多裝置登入管理

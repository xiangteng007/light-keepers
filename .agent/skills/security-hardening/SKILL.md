---
name: security-hardening
description: 安全強化檢查清單，包含 OWASP Top 10、認證授權和資料保護
---

# Security Hardening Skill

Light Keepers 安全強化指南。

## OWASP Top 10 檢查

### A01: Broken Access Control

- [x] GlobalAuthGuard 預設拒絕所有請求
- [ ] 所有端點有適當的權限檢查
- [ ] 物件級存取控制已實作
- [ ] CORS 設定正確

### A02: Cryptographic Failures

- [ ] 使用強密碼雜湊 (bcrypt, argon2)
- [ ] JWT 使用足夠長的密鑰
- [ ] 敏感資料加密傳輸 (HTTPS)
- [ ] 不儲存明文密碼

### A03: Injection

- [ ] 使用 TypeORM 參數化查詢
- [ ] 輸入驗證 (class-validator)
- [ ] 輸出編碼

### A05: Security Misconfiguration

- [ ] 生產環境停用 debug 模式
- [ ] 移除預設帳號
- [ ] 設定安全 headers
- [ ] 停用不需要的功能

### A07: Authentication Failures

- [ ] 實作速率限制 (@Throttle)
- [ ] 強密碼政策
- [ ] 安全的密碼重設流程
- [ ] Session 管理

## 安全 Headers

```typescript
// main.ts
app.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
}));
```

## 速率限制

```typescript
// 全域限制
@UseGuards(ThrottlerGuard)

// 客製化限制
@Throttle({ default: { limit: 5, ttl: 60000 } })
```

## 敏感資料處理

### 日誌過濾

```typescript
// 不要記錄敏感資料
this.logger.log('User login', { email: user.email }); // OK
this.logger.log('User login', { password }); // 絕對不行！
```

### 回應過濾

```typescript
// 使用 class-transformer @Exclude()
@Exclude()
password: string;
```

## 定期檢查

1. **依賴更新**: `npm audit`
2. **密鑰輪換**: 每 90 天
3. **存取日誌審計**: 每週
4. **滲透測試**: 每季

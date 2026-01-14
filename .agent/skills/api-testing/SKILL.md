---
name: api-testing
description: 使用 curl 或 HTTP 請求測試 API 端點，包含認證和錯誤處理
---

# API Testing Skill

測試 Light Keepers API 端點。

## 基本測試

### Health Check（公開）

```bash
curl -X GET http://localhost:3000/health
```

### 需要認證的端點

```bash
curl -X GET http://localhost:3000/api/protected \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

## 認證流程

### 1. 登入取得 Token

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### 2. 使用 Token 存取 API

```bash
TOKEN="eyJhbGci..."
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 常見測試場景

### 測試 401 Unauthorized

```bash
# 無 Token 存取保護路由
curl -v -X GET http://localhost:3000/auth/me
# 預期: 401 Missing access token
```

### 測試 403 Forbidden

```bash
# 低權限使用者存取高權限路由
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer $LOW_LEVEL_TOKEN"
# 預期: 403 權限不足
```

### 測試限流

```bash
# 快速連續請求
for i in {1..20}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@test.com", "password": "wrong"}'
done
# 預期: 429 Too Many Requests
```

## 驗證清單

- [ ] 公開端點無需 Token
- [ ] 保護端點無 Token 返回 401
- [ ] 無效 Token 返回 401
- [ ] 過期 Token 返回 401
- [ ] 權限不足返回 403
- [ ] 限流正常運作

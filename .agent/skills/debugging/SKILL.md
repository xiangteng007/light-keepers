---
name: debugging
description: 偵錯 NestJS 後端問題，包含日誌分析、錯誤追蹤和效能診斷
---

# Debugging Skill

偵錯 Light Keepers 後端問題。

## 常見錯誤類型

### 1. 401 Unauthorized

**原因**: Token 缺失、無效或過期

**診斷步驟**:

1. 檢查 request headers 是否有 `Authorization: Bearer <token>`
2. 解碼 JWT 檢查 `exp` 是否過期
3. 檢查 `GlobalAuthGuard` 是否正確掛載
4. 確認端點是否需要 `@Public()` 裝飾器

### 2. 403 Forbidden

**原因**: 權限不足

**診斷步驟**:

1. 檢查使用者 `roleLevel`
2. 檢查端點的 `@RequiredLevel()` 設定
3. 確認 `UnifiedRolesGuard` 邏輯

### 3. 500 Internal Server Error

**原因**: 未捕獲的異常

**診斷步驟**:

1. 查看 Cloud Run 日誌
2. 檢查 `GlobalExceptionFilter` 輸出
3. 追蹤 stack trace

## 日誌查看

### 本地開發

```bash
cd backend
npm run start:dev
# 日誌會輸出到終端
```

### Cloud Run

```bash
gcloud logs read "resource.type=cloud_run_revision" \
  --project=PROJECT_ID \
  --limit=100
```

## 偵錯工具

### 1. 啟用詳細日誌

```typescript
// 在 service 中加入
this.logger.debug('Variable value:', JSON.stringify(variable));
```

### 2. 使用 VS Code 偵錯器

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to NestJS",
  "port": 9229,
  "restart": true
}
```

### 3. 資料庫查詢日誌

```typescript
// 在 TypeORM 設定中
logging: ['query', 'error']
```

## 效能診斷

### 慢查詢

```sql
-- PostgreSQL 慢查詢日誌
EXPLAIN ANALYZE SELECT * FROM table WHERE ...;
```

### 記憶體問題

```bash
# 檢查 Node.js 記憶體使用
node --inspect backend/dist/main.js
```

## 常見問題速查

| 症狀 | 可能原因 | 解法 |
|------|----------|------|
| 啟動失敗 | 缺少環境變數 | 檢查 `.env` |
| DB 連線失敗 | 連線字串錯誤 | 檢查 `DATABASE_URL` |
| 模組未載入 | 循環依賴 | 使用 `forwardRef()` |
| Guard 無效 | 未註冊為 APP_GUARD | 檢查 `app.module.ts` |

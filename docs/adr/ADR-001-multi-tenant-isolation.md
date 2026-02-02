# ADR-001: 多租戶隔離策略

## 狀態
提議中

## 背景
Light Keepers 平台需要支援多個獨立組織（租戶）同時使用，每個租戶的資料必須完全隔離。

## 決策
採用 TypeORM Query Subscriber 在 Query 層級自動注入租戶過濾條件。

### 方案比較

| 方案 | 優點 | 缺點 |
|------|------|------|
| Row-Level Security (RLS) | 資料庫層級強制 | PostgreSQL 特定 |
| Query Subscriber | 應用層透明 | 需要確保覆蓋所有查詢 |
| Repository Override | 明確控制 | 需要修改每個 Repository |

### 選擇：Query Subscriber + Global Guard

1. 建立 `TenantSubscriber` 自動注入 `WHERE tenantId = ?`
2. 建立 `TenantGuard` 驗證請求的租戶權限
3. 所有敏感 Entity 加入 `tenantId` 欄位

## 後果
- ✅ 查詢自動隔離
- ✅ 無需修改現有 Repository
- ⚠️ 需要確保所有 raw query 也加入租戶過濾

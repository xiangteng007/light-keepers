---
name: performance-optimization
description: 效能優化技巧，包含資料庫查詢、快取和前端效能
---

# Performance Optimization Skill

Light Keepers 效能優化指南。

## 資料庫優化

### 1. 索引優化

```sql
-- 查看缺少索引的查詢
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@test.com';

-- 建立索引
CREATE INDEX idx_users_email ON users(email);
```

### 2. 避免 N+1 查詢

```typescript
// ❌ 不好：每個 user 都會發一次查詢
const users = await userRepo.find();
for (const user of users) {
  const profile = await profileRepo.findOne({ userId: user.id });
}

// ✅ 好：使用 relation 一次查詢
const users = await userRepo.find({
  relations: ['profile'],
});
```

### 3. 分頁查詢

```typescript
// 使用 skip/take
const users = await userRepo.find({
  skip: 0,
  take: 20,
  order: { createdAt: 'DESC' },
});
```

## 快取策略

### Redis 快取

```typescript
// 快取熱門資料
const cacheKey = `user:${userId}`;
let user = await redis.get(cacheKey);
if (!user) {
  user = await userRepo.findOne(userId);
  await redis.setex(cacheKey, 3600, JSON.stringify(user));
}
```

### HTTP 快取

```typescript
// 設定快取 headers
@Header('Cache-Control', 'public, max-age=3600')
@Get('static-data')
getStaticData() { ... }
```

## 前端優化

### 1. 程式碼分割

```typescript
// 動態匯入
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

### 2. 圖片優化

```html
<!-- 使用 Next.js Image -->
<Image 
  src="/image.jpg" 
  width={800} 
  height={600}
  loading="lazy"
/>
```

### 3. 虛擬化長列表

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={10000}
  itemSize={50}
>
  {Row}
</FixedSizeList>
```

## 監控指標

| 指標 | 目標 | 工具 |
|------|------|------|
| TTFB | < 200ms | Cloud Monitoring |
| FCP | < 1.5s | Lighthouse |
| API 回應 | < 500ms | APM |
| 資料庫查詢 | < 100ms | slow_query_log |

## 效能測試

```bash
# 使用 autocannon 進行負載測試
npx autocannon -c 100 -d 30 http://localhost:3000/health
```

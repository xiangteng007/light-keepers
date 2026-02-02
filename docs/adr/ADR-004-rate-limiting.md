# ADR-004: API Rate Limiting 策略

## 狀態
已採用

## 背景
保護 API 端點免受 DDoS 攻擊和濫用。

## 決策
採用多層 Rate Limiting：NestJS ThrottlerModule + 自訂 RateLimitGuard。

### 限制配置

| 端點類型 | 限制 | 時間窗口 |
|----------|------|---------|
| 公開端點 | 30 req | 60 sec |
| 認證端點 | 100 req | 60 sec |
| 管理端點 | 200 req | 60 sec |

### 實作層級

1. **全域 ThrottlerModule**: 基本保護
2. **自訂 RateLimitGuard**: 進階控制
   - 用戶 ID 或 IP 識別
   - Redis 計數器
   - 自動封鎖機制

## 實作
- `app.module.ts`: ThrottlerModule 配置
- `common/guards/rate-limit.guard.ts`
- `common/guards/advanced-rate-limit.guard.ts`

## 後果
- ✅ 防止 API 濫用
- ✅ Response Header 顯示限制資訊
- ✅ 支援自動封鎖重複違規者

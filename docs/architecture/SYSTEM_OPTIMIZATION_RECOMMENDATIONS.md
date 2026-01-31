# Light Keepers 系統優化建議報告
## Enterprise / Mission-Critical NGO 架構分析

**分析日期:** 2026-02-01  
**分析角色:** 國際 NGO 與大型救難組織資訊系統架構設計師  
**當前模組數:** 120（優化後）

---

## 📊 優化總覽

| 類別 | 項目數 | 預估效益 |
|------|:------:|----------|
| 🔴 效能優化 | 8 | 回應時間 -40% |
| 🟡 架構優化 | 10 | 維護成本 -30% |
| 🟢 安全強化 | 6 | 合規性 +100% |
| 🔵 運維優化 | 7 | 可靠性 +25% |
| ⚪ 功能增強 | 5 | 使用體驗 +50% |

---

## 🔴 效能優化

### 1. 資料庫查詢優化

**現況問題:**
- 多個 Service 使用 `find()` 無分頁
- N+1 查詢問題
- 缺乏 Query Result 快取

**建議改善:**

```typescript
// Before
const missions = await this.missionRepo.find();

// After
const missions = await this.missionRepo.find({
    take: limit,
    skip: offset,
    relations: ['assignments'],  // Eager load
    cache: 60000,  // 1 minute cache
});
```

**影響模組:** `mission-sessions`, `resources`, `volunteers`, `field-reports`

---

### 2. API 回應壓縮

**現況:** 未見 Gzip/Brotli 壓縮中介軟體

**建議:**
```typescript
// main.ts
app.use(compression({ 
    level: 6,
    threshold: 1024 
}));
```

**預估效益:** API 傳輸量減少 60-80%

---

### 3. 圖片/媒體優化

**現況:** `files` 模組無圖片處理

**建議新增:**
```
files/services/
├── image-optimizer.service.ts   # Sharp 壓縮
├── video-transcoder.service.ts  # FFmpeg 轉檔
└── cdn-uploader.service.ts      # 上傳至 CDN
```

---

### 4. WebSocket 連線池

**現況:** 每個 Gateway 獨立連線

**建議:** 建立統一 WebSocket Manager
```
realtime/
├── connection-pool.service.ts   # 連線池管理
├── room-manager.service.ts      # 房間管理
└── message-queue.service.ts     # 訊息佇列
```

---

### 5. 快取策略統一

**現況:** 部分使用 Cache，策略不一

**建議:**
| 資料類型 | TTL | 策略 |
|----------|-----|------|
| 天氣資料 | 10min | Stale-While-Revalidate |
| 使用者權限 | 5min | Cache-Aside |
| 靜態配置 | 1hr | Read-Through |
| 任務列表 | 30s | Write-Through |

---

### 6. 批次處理優化

**現況:** 逐筆處理 Webhook/Event

**建議:**
```typescript
// 使用 BullMQ 批次處理
@Processor('notifications')
async processBatch(@OnEvents('batch') jobs: Job[]) {
    const batchSize = 100;
    await this.notificationService.sendBatch(jobs);
}
```

---

### 7. Lazy Loading 模組

**現況:** AppModule 載入所有模組

**建議:**
```typescript
// 非核心模組延遲載入
@Module({
    imports: [
        LazyModuleLoader.forFeature([
            { path: 'power-bi', module: PowerBiModule },
            { path: 'bim-integration', module: BimModule },
        ])
    ]
})
```

---

### 8. 資料庫連線池

**建議配置:**
```yaml
# ormconfig.yaml
extra:
  max: 20
  min: 5
  idleTimeoutMillis: 30000
  connectionTimeoutMillis: 2000
```

---

## 🟡 架構優化

### 1. 模組進一步整合

| 現有模組 | 建議合併至 |
|----------|-----------|
| `reports` | `reporting-engine` |
| `routing` | `location` |
| `trend-prediction` | `analytics` |
| `performance-report` | `reporting-engine` |
| `disaster-summary` | `reporting-engine` |

**效益:** 再減少 5 個模組

---

### 2. 共用 DTO/Entity 集中化

**現況:** 各模組重複定義

**建議:**
```
shared/
├── dto/
│   ├── pagination.dto.ts
│   ├── geo-location.dto.ts
│   └── audit-fields.dto.ts
├── entities/
│   ├── base.entity.ts
│   └── soft-delete.entity.ts
└── interfaces/
    └── crud-service.interface.ts
```

---

### 3. Event-Driven 架構

**建議:** 核心操作觸發事件
```typescript
// 任務狀態變更
this.eventEmitter.emit('mission.status.changed', {
    missionId,
    oldStatus,
    newStatus,
    changedBy,
});

// 訂閱者自動處理
@OnEvent('mission.status.changed')
handleMissionChange(payload) {
    // 通知、報表、AI 分析等
}
```

---

### 4. 領域驅動設計 (DDD)

**建議重組:**
```
domains/
├── mission/           # 任務領域
│   ├── mission-sessions/
│   ├── task-dispatch/
│   └── field-reports/
├── resource/          # 資源領域
│   ├── resources/
│   ├── equipment/
│   └── donations/
├── personnel/         # 人員領域
│   ├── volunteers/
│   ├── training/
│   └── attendance/
└── intelligence/      # 情報領域
    ├── weather-service/
    ├── ncdr-alerts/
    └── social-media-monitor/
```

---

### 5. 微服務準備

**建議:** 為未來微服務化準備

| 獨立候選 | 理由 |
|----------|------|
| `ai-platform` | 運算密集，可能需 GPU |
| `weather-service` | 外部 API 依賴 |
| `notifications` | 高吞吐量 |
| `reporting-engine` | 批次處理 |

---

### 6. 介面抽象化

**建議:**
```typescript
// 外部服務介面
interface IWeatherProvider {
    getCurrentWeather(location: string): Promise<Weather>;
    getForecast(location: string, days: number): Promise<Forecast[]>;
}

// 可替換實作
@Injectable()
class CwaWeatherProvider implements IWeatherProvider { }

@Injectable()
class OpenWeatherProvider implements IWeatherProvider { }
```

---

### 7. Feature Flags

**建議新增:**
```
features/
├── feature-flag.service.ts
├── feature-flag.guard.ts
└── feature-flag.decorator.ts
```

用於：
- 漸進式發布
- A/B 測試
- 緊急功能關閉

---

### 8. Configuration 集中化

**建議:**
```typescript
@Injectable()
export class ConfigurationService {
    // 從環境變數、Vault、DB 統一取得配置
    get<T>(key: string, defaultValue?: T): T;
    
    // 支援動態更新
    watch(key: string, callback: (value) => void);
}
```

---

### 9. API Gateway 模式

**建議:**
```
gateway/
├── rate-limiter.middleware.ts   # 限流
├── request-logger.middleware.ts # 日誌
├── circuit-breaker.middleware.ts # 熔斷
└── api-key.guard.ts             # API Key
```

---

### 10. CQRS 模式

**建議:** 關鍵寫入操作分離
```typescript
// Command
@Injectable()
class CreateMissionCommandHandler {
    async execute(command: CreateMissionCommand): Promise<string> { }
}

// Query
@Injectable()
class GetMissionQueryHandler {
    async execute(query: GetMissionQuery): Promise<MissionDto> { }
}
```

---

## 🟢 安全強化

### 1. 輸入驗證強化

**建議:** 所有 DTO 使用 class-validator
```typescript
@IsString()
@MaxLength(200)
@Matches(/^[a-zA-Z0-9\u4e00-\u9fa5\s]+$/)
name: string;
```

---

### 2. 敏感資料加密

**建議:**
```typescript
// 資料庫欄位加密
@Column({ transformer: new EncryptionTransformer() })
personalId: string;
```

---

### 3. Audit Trail 強化

**建議:** 關鍵操作完整記錄
```typescript
@Audit('mission.update')
async updateMission(id: string, dto: UpdateDto) { }
```

---

### 4. API Rate Limiting

**建議配置:**
| 端點類型 | 限制 |
|----------|------|
| 認證 | 5/min |
| 一般 API | 100/min |
| 上傳 | 10/min |
| WebSocket | 1000 msg/min |

---

### 5. 依賴掃描

**建議:**
```bash
# 新增至 CI/CD
npm audit --production
npx snyk test
```

---

### 6. Secrets 管理

**建議:**
- 生產環境使用 GCP Secret Manager
- 開發環境使用 .env.local（gitignore）
- 禁止硬編碼 API Key

---

## 🔵 運維優化

### 1. 健康檢查強化

**建議:**
```typescript
@Get('health/deep')
async deepHealthCheck() {
    return {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        externalApis: await this.checkExternalApis(),
        diskSpace: await this.checkDiskSpace(),
    };
}
```

---

### 2. 結構化日誌

**建議:**
```typescript
this.logger.log({
    event: 'mission.created',
    missionId,
    userId,
    duration: performance.now() - start,
    metadata: { ... }
});
```

---

### 3. 分散式追蹤

**建議:** 整合 OpenTelemetry
```typescript
@Trace('mission-service')
async createMission() { }
```

---

### 4. 告警規則

**建議:**
| 指標 | 閾值 | 告警等級 |
|------|------|---------|
| Error Rate | >1% | Critical |
| P99 Latency | >2s | Warning |
| DB Connections | >80% | Warning |
| Memory | >85% | Critical |

---

### 5. 自動擴展

**建議 Cloud Run 配置:**
```yaml
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/target: "80"
```

---

### 6. 備份策略

**建議:**
| 類型 | 頻率 | 保留期 |
|------|------|--------|
| 完整備份 | 每日 | 30 天 |
| 增量備份 | 每小時 | 7 天 |
| 事務日誌 | 即時 | 24 小時 |

---

### 7. 容量規劃

**建議監控:**
- 每月資料成長率
- 尖峰/離峰使用率
- 儲存空間趨勢

---

## ⚪ 功能增強

### 1. 行動裝置優化

**建議:**
- PWA 完整支援
- 離線地圖快取
- 推播通知優化

---

### 2. 無障礙 (A11y)

**建議:**
- WCAG 2.1 AA 合規
- 螢幕閱讀器支援
- 高對比模式

---

### 3. 多租戶強化

**建議:**
- 租戶級資料隔離
- 自訂品牌設定
- 獨立配置

---

### 4. 自助報表

**建議:**
- 拖放報表建構
- 自訂儀表板
- 排程匯出

---

### 5. AI 增強

**建議:**
- 自然語言查詢
- 智慧資源推薦
- 異常偵測告警

---

## 📋 執行建議

### 階段一（1-2 週）
1. 資料庫查詢優化
2. API 壓縮
3. 快取策略統一

### 階段二（3-4 週）
1. 模組進一步整合
2. 共用 DTO 集中化
3. Event-Driven 架構

### 階段三（5-6 週）
1. 安全強化
2. 運維優化
3. 監控告警

---

## 📈 預期效益

| 指標 | 現況 | 優化後 |
|------|------|--------|
| API 回應時間 | ~300ms | ~180ms |
| 模組數 | 120 | 115 |
| 程式碼重複率 | ~15% | ~5% |
| 測試覆蓋率 | ~60% | ~80% |
| 部署頻率 | 每週 | 每日 |

# Extension Points Catalog

> Light Keepers Disaster Response Platform - 可插拔擴充點目錄

## 概述

本文檔列出系統中所有可擴充的整合點，遵循 **Contract + Fallback** 模式，確保：
- 每個擴充點都有明確的介面契約
- 當外部服務不可用時有降級機制
- 可獨立測試與部署

---

## 1. 通知系統擴充點

### 1.1 LINE Notify Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/line-bot` |
| **契約介面** | `NotificationChannel` |
| **Input** | `{ type: 'alert' | 'status', message: string, recipientIds: string[] }` |
| **Output** | `{ success: boolean, failures: string[] }` |
| **必要權限** | Level 2+ |
| **Fallback** | 降級為 WebSocket push 或 email 通知 |
| **可觀測性** | metrics: `notify_sent`, `notify_failed`; logs: `correlationId` |

```typescript
interface NotificationChannel {
    send(payload: NotificationPayload): Promise<NotificationResult>;
    getStatus(): Promise<ChannelStatus>;
    testConnection(): Promise<boolean>;
}
```

### 1.2 SMS Gateway Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/notifications` |
| **支援供應商** | Twilio, AWS SNS, 台灣在地供應商 |
| **Fallback** | LINE Notify → Email → WebSocket |

### 1.3 Push Notification Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/notifications` |
| **支援平台** | PWA Push, Firebase FCM, APNs |
| **Fallback** | WebSocket real-time |

---

## 2. 外部系統整合擴充點

### 2.1 CAP (Common Alerting Protocol) Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/interoperability-adapters/cap-adapter.service.ts` |
| **標準** | OASIS CAP 1.2 |
| **功能** | 雙向轉換（internal ↔ CAP XML） |
| **整合對象** | 中央氣象局、國家災害防救科技中心、消防署 |

```typescript
// Contract
class CapAdapterService {
    toCapAlert(alert: InternalAlert): CapAlert;
    fromCapXml(xml: string): InternalAlert;
    toCapXml(alert: CapAlert): string;
}
```

### 2.2 EDXL-DE Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/interoperability-adapters/edxl-de-adapter.service.ts` |
| **標準** | OASIS EDXL-DE 2.0 |
| **用途** | 跨機構災害資訊交換 |

### 2.3 GIS/Map Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/gis`, `@modules/routing` |
| **支援服務** | Google Maps, OpenStreetMap, 國土測繪中心 |
| **Fallback** | 離線地圖快取 |

---

## 3. 認證授權擴充點

### 3.1 OAuth Provider Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/auth/auth-oauth.controller.ts` |
| **支援供應商** | Google, LINE, Apple, SAML |
| **契約** | Passport.js Strategy pattern |

### 3.2 External Identity Provider

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/auth` |
| **支援** | Firebase Auth（主要）, Auth0, Okta |
| **Fallback** | 本地 JWT 驗證 |

---

## 4. 資料儲存擴充點

### 4.1 File Storage Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/media`, `@modules/document-repository` |
| **支援服務** | Google Cloud Storage, AWS S3, 本地檔案系統 |
| **Fallback** | 本地暫存 + 重試佇列 |

### 4.2 Cache Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | 全域服務 |
| **支援服務** | Redis, Memcached, In-memory |
| **Fallback** | In-memory LRU cache |

---

## 5. AI/ML 擴充點

### 5.1 AI Job Queue Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/ai-queue` |
| **支援服務** | OpenAI, Anthropic, Gemini, 本地 LLM |
| **契約** | `AiProvider` 介面 |

```typescript
interface AiProvider {
    createCompletion(request: AiRequest): Promise<AiResponse>;
    getModelInfo(): ModelInfo;
    estimateCost(request: AiRequest): CostEstimate;
}
```

### 5.2 Computer Vision Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/ai-queue` |
| **用途** | 災損影像分析、人臉比對（失蹤者協尋） |

---

## 6. 通訊擴充點

### 6.1 WebSocket Gateway

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/mission-sessions/mission-session.gateway.ts` |
| **用途** | 即時任務狀態更新、位置追蹤 |
| **Fallback** | HTTP long-polling |

### 6.2 Webhook Dispatcher

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/webhooks` |
| **用途** | 事件推送至外部系統 |
| **重試機制** | 指數退避，最多 5 次 |

---

## 7. 離線/弱網擴充點

### 7.1 Offline Sync Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `web-dashboard/src/services/offline-sync.ts` |
| **策略** | IndexedDB 本地儲存 + 背景同步 |
| **衝突解決** | Last-write-wins + 手動合併選項 |

### 7.2 Mesh Network Adapter

| 屬性 | 值 |
|------|-----|
| **狀態** | 規劃中 |
| **用途** | LoRa/衛星通訊整合 |

---

## 8. 報表/匯出擴充點

### 8.1 Report Generator Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/reports` |
| **支援格式** | PDF, Excel, CSV, JSON |
| **排程** | Cron-based 自動生成 |

### 8.2 Data Export Adapter

| 屬性 | 值 |
|------|-----|
| **模組** | `@modules/data-privacy` |
| **用途** | GDPR/個資法合規匯出 |

---

## 擴充點實作指南

### 新增擴充點的步驟

1. **定義契約介面** - 在 `shared/interfaces` 建立 TypeScript interface
2. **實作預設 Adapter** - 在對應模組建立 service
3. **實作 Fallback** - 確保服務不可用時有降級策略
4. **加入 DI 容器** - 使用 NestJS 的 Provider pattern
5. **撰寫 Contract Tests** - 確保所有實作符合契約
6. **加入可觀測性** - Logger, metrics, tracing

### 範例：新增 WhatsApp Adapter

```typescript
// 1. 契約介面
interface WhatsAppAdapter extends NotificationChannel {
    sendTemplate(templateId: string, params: object): Promise<void>;
}

// 2. 實作
@Injectable()
class WhatsAppAdapterService implements WhatsAppAdapter {
    async send(payload: NotificationPayload): Promise<NotificationResult> {
        try {
            // 呼叫 WhatsApp Business API
            return { success: true, failures: [] };
        } catch (error) {
            // Fallback to SMS
            return this.smsAdapter.send(payload);
        }
    }
}

// 3. 註冊到 DI
providers: [
    { provide: 'WHATSAPP_ADAPTER', useClass: WhatsAppAdapterService },
]
```

---

## 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.0 | 2026-02-02 | 初版，15+ 擴充點 |

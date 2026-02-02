# 🔧 Light Keepers 擴充點文件

## 概述

平台設計了多個擴充點，允許第三方整合和功能擴展。

---

## EP-01: AI Agent 擴充

```typescript
interface AIAgentExtension {
  name: string;
  capabilities: string[];
  process(input: AIInput): Promise<AIOutput>;
}

// 註冊
@Injectable()
export class CustomAgent implements AIAgentExtension {
  name = 'CustomAgent';
  capabilities = ['analysis', 'prediction'];
  
  async process(input: AIInput): Promise<AIOutput> {
    // 實作
  }
}
```

---

## EP-02: 外部通知渠道

```typescript
interface NotificationChannel {
  name: string;
  send(notification: Notification): Promise<void>;
}

// 範例: LINE Notify
export class LineNotifyChannel implements NotificationChannel {
  name = 'line-notify';
  async send(n: Notification) {
    await this.lineClient.notify(n.message);
  }
}
```

---

## EP-03: 地圖圖層

```typescript
interface MapLayerExtension {
  id: string;
  name: string;
  getFeatures(bounds: Bounds): Promise<GeoJSON>;
  getStyle(): MapStyle;
}
```

---

## EP-04: 資料匯出格式

```typescript
interface ExportFormat {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  export(data: any[]): Promise<Buffer>;
}
```

---

## EP-05: 認證提供者

```typescript
interface AuthProvider {
  name: string;
  authenticate(credentials: any): Promise<AuthResult>;
  validate(token: string): Promise<boolean>;
}
```

---

## EP-06: 物資追蹤整合

```typescript
interface SupplyChainIntegration {
  trackItem(itemId: string): Promise<TrackingInfo>;
  updateInventory(items: InventoryUpdate[]): Promise<void>;
}
```

---

## EP-07: 報告範本

```typescript
interface ReportTemplate {
  id: string;
  name: string;
  generate(data: ReportData): Promise<Buffer>;
}
```

---

## EP-08: Webhook 訂閱

```typescript
// 註冊 Webhook
POST /webhooks
{
  "url": "https://your-server.com/hook",
  "events": ["task.created", "sos.alert"],
  "secret": "your-secret"
}
```

---

## 擴充點清單

| ID | 名稱 | 狀態 |
|----|------|------|
| EP-01 | AI Agent | ✅ 可用 |
| EP-02 | 通知渠道 | ✅ 可用 |
| EP-03 | 地圖圖層 | ✅ 可用 |
| EP-04 | 匯出格式 | ✅ 可用 |
| EP-05 | 認證提供者 | ⚠️ 內部 |
| EP-06 | 供應鏈整合 | 🚧 開發中 |
| EP-07 | 報告範本 | ✅ 可用 |
| EP-08 | Webhook | ✅ 可用 |

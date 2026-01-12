# 社群 AI 監視模組 (Social Media Monitor)

> **版本**: v3.0  
> **最後更新**: 2026-01-12

## 模組概述

社群 AI 監視模組用於監控社群媒體平台上的災害相關貼文，自動分析情緒、緊急度，並在偵測到高風險內容時發送警報。

---

## 支援平台

| 平台 | 代碼 |
|------|------|
| Facebook | `facebook` |
| Instagram | `instagram` |
| Twitter/X | `twitter` |
| Threads | `threads` |
| PTT | `ptt` |
| LINE | `line` |
| 其他 | `other` |

---

## API Endpoints

### 貼文查詢與匯出

| Method | Path | 說明 |
|--------|------|------|
| GET | `/social-monitor/posts` | 取得監控貼文 (支援全部篩選) |
| GET | `/social-monitor/export?format=csv\|json` | 匯出資料 |
| GET | `/social-monitor/trends` | 關鍵字趨勢 |
| GET | `/social-monitor/stats` | 監控統計 |

### 配置管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/social-monitor/keywords` | 取得關鍵字 |
| POST | `/social-monitor/keywords` | 設定關鍵字 |
| GET | `/social-monitor/exclude-words` | 取得排除詞 |
| POST | `/social-monitor/exclude-words` | 設定排除詞 |

### 分析與清理

| Method | Path | 說明 |
|--------|------|------|
| POST | `/social-monitor/analyze` | 手動分析貼文 |
| DELETE | `/social-monitor/purge` | 清除舊資料 |

### 通知配置 CRUD

| Method | Path | 說明 |
|--------|------|------|
| GET | `/social-monitor/notifications` | 取得所有通知配置 |
| POST | `/social-monitor/notifications` | 建立通知配置 |
| PUT | `/social-monitor/notifications/:id` | 更新通知配置 |
| DELETE | `/social-monitor/notifications/:id` | 刪除通知配置 |

---

## 進階篩選參數

| 參數 | 類型 | 說明 |
|------|------|------|
| `platform` | string | 平台篩選 |
| `minUrgency` | number | 最低緊急度 (1-10) |
| `keyword` | string | 關鍵字篩選 |
| `sentiment` | string | 情緒篩選 (positive/negative/neutral) |
| `location` | string | 地區篩選 |
| `from` | ISO date | 開始時間 |
| `to` | ISO date | 結束時間 |
| `minLikes` | number | 最低按讚數 |
| `minComments` | number | 最低留言數 |
| `minShares` | number | 最低分享數 |
| `minViews` | number | 最低瀏覽數 |

---

## 通知頻道

| 頻道 | 配置欄位 |
|------|----------|
| **Telegram** | `botToken`, `chatId` |
| **LINE Notify** | `accessToken` |
| **Webhook** | `url`, `headers` |
| **Email** | `recipients[]` |
| **Slack** | `webhookUrl`, `channel` |

### 範例: 建立 Telegram 通知

```json
POST /social-monitor/notifications
{
  "name": "災情警報群組",
  "channel": "telegram",
  "minUrgency": 7,
  "config": {
    "botToken": "123456:ABC-DEF...",
    "chatId": "-100123456789"
  }
}
```

---

## 事件發送

| 事件 | 觸發條件 |
|------|----------|
| `geo.social_intel.detected` | 偵測到關鍵字貼文 |
| `geo.alert.received` | 緊急度 ≥ 7 |

---

## 關鍵字 (13 個)

```
災害, 地震, 颱風, 水災, 火災, 救災, 避難,
土石流, 停電, 斷水, 道路中斷, 受困, 失蹤
```

## 排除詞 (預設)

```
演習, 測試, 模擬
```

## 支援地區 (13 縣市)

```
台北, 新北, 桃園, 台中, 台南, 高雄, 基隆,
新竹, 嘉義, 屏東, 宜蘭, 花蓮, 台東
```

---

## 變更紀錄

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2025-12 | 初始 Service |
| v2.0 | 2026-01-12 | Controller, Entity, EventEmitter |
| v3.0 | 2026-01-12 | 進階篩選, 匯出, 多頻道通知, 互動指標 |

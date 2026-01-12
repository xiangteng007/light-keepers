# 社群 AI 監視模組 (Social Media Monitor)

> **版本**: v1.0 → v2.0  
> **最後更新**: 2026-01-12

## 模組概述

社群 AI 監視模組用於監控社群媒體平台上的災害相關貼文，自動分析情緒、緊急度，並在偵測到高風險內容時發送警報。

---

## 架構設計

```
┌─────────────────────────────────────────────────────┐
│                Social Media Monitor                  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Facebook   │  │  Instagram  │  │   Twitter   │ │
│  │  Graph API  │  │  Basic API  │  │   (Stub)    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │         │
│         ▼                ▼                ▼         │
│  ┌─────────────────────────────────────────────┐   │
│  │            Post Ingestion Layer             │   │
│  └─────────────────────┬───────────────────────┘   │
│                        │                            │
│                        ▼                            │
│  ┌─────────────────────────────────────────────┐   │
│  │              Analysis Engine                │   │
│  │  • Keyword Matching                         │   │
│  │  • Sentiment Analysis                       │   │
│  │  • Urgency Calculation                      │   │
│  │  • Location Extraction                      │   │
│  └─────────────────────┬───────────────────────┘   │
│                        │                            │
│                        ▼                            │
│  ┌─────────────────────────────────────────────┐   │
│  │           Event Emission Layer              │   │
│  │  → geo.social_intel.detected                │   │
│  │  → geo.alert.received (high urgency)        │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Method | Path | 說明 | RBAC |
|--------|------|------|------|
| GET | `/social-monitor/posts` | 取得監控貼文列表 | L2+ |
| GET | `/social-monitor/trends` | 取得關鍵字趨勢 | L2+ |
| GET | `/social-monitor/stats` | 取得監控統計 | L2+ |
| POST | `/social-monitor/keywords` | 設定監控關鍵字 | L3+ |
| POST | `/social-monitor/analyze` | 手動分析貼文 | L2+ |
| DELETE | `/social-monitor/purge` | 清除舊資料 | L4+ |

---

## 資料模型

### SocialPost Entity

```typescript
@Entity('social_posts')
export class SocialPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    platform: 'facebook' | 'instagram' | 'twitter' | 'ptt' | 'other';

    @Column()
    externalId: string;  // 平台原始 ID

    @Column('text')
    content: string;

    @Column({ nullable: true })
    author: string;

    @Column({ nullable: true })
    url: string;

    @Column({ type: 'jsonb', nullable: true })
    analysis: {
        matchedKeywords: string[];
        sentiment: 'positive' | 'negative' | 'neutral';
        urgency: number;  // 1-10
        location: string | null;
    };

    @Column({ default: false })
    alertSent: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    analyzedAt: Date;
}
```

---

## 事件清單

| 事件 | 觸發條件 | Payload |
|------|----------|---------|
| `geo.social_intel.detected` | 偵測到含關鍵字貼文 | `{ postId, keywords, urgency }` |
| `geo.alert.received` | 緊急度 ≥ 7 | `{ postId, platform, urgency, location }` |

---

## 關鍵字配置

### 預設關鍵字

```typescript
['災害', '地震', '颱風', '水災', '火災', '救災', '避難', 
 '土石流', '停電', '斷水', '道路中斷', '受困', '失蹤']
```

### 情緒詞彙

- **負面**: 危險, 嚴重, 受困, 傷亡, 損失, 崩塌
- **正面**: 安全, 救援成功, 恢復, 感謝

---

## 變更紀錄

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2025-12 | 初始 Service 實作 |
| v2.0 | 2026-01-12 | 新增 Controller, Entity, EventEmitter |

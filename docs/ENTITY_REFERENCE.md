# 📊 Light Keepers 資料實體參考

## 核心實體

### Account (帳號)

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| email | string | 電子郵件 |
| displayName | string | 顯示名稱 |
| roleLevel | int | 權限等級 (0-6) |
| tenantId | UUID | 所屬租戶 |
| isActive | boolean | 啟用狀態 |
| createdAt | timestamp | 建立時間 |

### Task (任務)

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| title | string | 任務標題 |
| description | text | 任務描述 |
| status | enum | pending/in_progress/completed |
| priority | enum | low/medium/high/critical |
| assigneeId | UUID | 負責人 |
| location | point | 地點座標 |
| dueAt | timestamp | 截止時間 |

### FieldReport (現場報告)

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| reporterId | UUID | 回報者 |
| type | enum | 報告類型 |
| content | text | 內容 |
| location | point | 地點 |
| attachments | json | 附件列表 |
| verifiedAt | timestamp | 驗證時間 |

### Resource (物資)

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| name | string | 物資名稱 |
| category | string | 分類 |
| quantity | int | 數量 |
| unit | string | 單位 |
| locationId | UUID | 儲放地點 |
| expiresAt | timestamp | 有效期限 |

### Volunteer (志工)

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| accountId | UUID | 關聯帳號 |
| skills | string[] | 技能標籤 |
| certifications | json | 證照 |
| status | enum | available/busy/offline |
| lastLocationAt | timestamp | 最後位置更新 |

### SOS (緊急求救)

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| volunteerId | UUID | 發送者 |
| location | point | 位置 |
| message | text | 訊息 |
| status | enum | active/resolved |
| resolvedAt | timestamp | 解除時間 |

---

## 關聯圖

```
Account ──1:1── Volunteer
    │
    └──1:N── FieldReport
    │
    └──1:N── Task (as assignee)
    
Tenant ──1:N── Account
       │
       └──1:N── Resource
       │
       └──1:N── Mission
```

---

## 審計欄位

所有實體包含：

| 欄位 | 說明 |
|------|------|
| createdAt | 建立時間 |
| updatedAt | 更新時間 |
| deletedAt | 軟刪除時間 |
| createdBy | 建立者 ID |

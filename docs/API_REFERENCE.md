# 🏗️ Light Keepers API 參考文件

> **版本**: v1.0  
> **Base URL**: `https://api.lightkeepers.app/api/v1`

---

## 認證

所有 API 需要 Bearer Token 認證：

```
Authorization: Bearer <access_token>
```

---

## 核心端點

### Auth 認證模組

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| POST | `/auth/login` | Firebase ID Token 登入 | Public |
| POST | `/auth/refresh` | 刷新 Access Token | Public |
| POST | `/auth/logout` | 登出 | Authenticated |
| GET | `/auth/me` | 取得當前用戶 | Authenticated |

### Tasks 任務模組

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/tasks` | 列出任務 | VOLUNTEER+ |
| POST | `/tasks` | 建立任務 | OFFICER+ |
| GET | `/tasks/:id` | 取得單一任務 | VOLUNTEER+ |
| PATCH | `/tasks/:id` | 更新任務 | TEAM_LEAD+ |
| DELETE | `/tasks/:id` | 刪除任務 | OFFICER+ |
| POST | `/tasks/:id/claim` | 領取任務 | VOLUNTEER+ |
| POST | `/tasks/:id/complete` | 完成任務 | Owner |

### Field Reports 現場報告

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/field-reports` | 列出報告 | VOLUNTEER+ |
| POST | `/field-reports` | 建立報告 | VOLUNTEER+ |
| GET | `/field-reports/:id` | 取得報告 | Owner/OFFICER+ |
| POST | `/field-reports/:id/attachments` | 上傳附件 | Owner |

### Resources 物資模組

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/resources` | 列出物資 | VOLUNTEER+ |
| POST | `/resources` | 新增物資 | SECTION_CHIEF+ |
| POST | `/resource-requests` | 物資請求 | TEAM_LEAD+ |
| PATCH | `/resource-requests/:id/approve` | 審核請求 | SECTION_CHIEF+ |

### Volunteers 志工模組

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/volunteers` | 列出志工 | TEAM_LEAD+ |
| GET | `/volunteers/:id` | 志工詳情 | Self/TEAM_LEAD+ |
| GET | `/volunteers/:id/location` | 即時位置 | TEAM_LEAD+ |
| POST | `/volunteers/:id/check-in` | 報到 | Self |

### SOS 緊急求救

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| POST | `/sos` | 發送 SOS | VOLUNTEER+ |
| GET | `/sos/active` | 活躍警報 | OFFICER+ |
| POST | `/sos/:id/resolve` | 解除警報 | OFFICER+ |

---

## 錯誤回應

```json
{
  "statusCode": 400,
  "message": "驗證失敗",
  "error": "Bad Request"
}
```

| 狀態碼 | 說明 |
|--------|------|
| 400 | 請求格式錯誤 |
| 401 | 未認證 |
| 403 | 無權限 |
| 404 | 資源不存在 |
| 429 | 請求過於頻繁 |
| 500 | 伺服器錯誤 |

---

## Rate Limiting

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1706860800
```

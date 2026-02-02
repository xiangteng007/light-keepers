# 🔌 Light Keepers WebSocket 事件文件

> **Namespace**: `/realtime`  
> **Transport**: Socket.IO 4.x

---

## 連線認證

```javascript
const socket = io('wss://api.lightkeepers.app/realtime', {
  auth: { token: accessToken }
});
```

---

## 事件列表

### 任務事件

| 事件名稱 | 方向 | Payload | 說明 |
|----------|------|---------|------|
| `task.created` | S→C | `{ task: Task }` | 新任務建立 |
| `task.updated` | S→C | `{ task: Task }` | 任務更新 |
| `task.claimed` | S→C | `{ taskId, volunteerId }` | 任務被領取 |
| `task.completed` | S→C | `{ taskId, completedAt }` | 任務完成 |

### 緊急事件

| 事件名稱 | 方向 | Payload | 說明 |
|----------|------|---------|------|
| `sos.alert` | S→C | `{ sos: SOS }` | SOS 警報 |
| `sos.resolved` | S→C | `{ sosId }` | SOS 解除 |

### 位置事件

| 事件名稱 | 方向 | Payload | 說明 |
|----------|------|---------|------|
| `location.update` | C→S | `{ lat, lng, accuracy }` | 更新位置 |
| `location.broadcast` | S→C | `{ volunteerId, lat, lng }` | 位置廣播 |

### 通知事件

| 事件名稱 | 方向 | Payload | 說明 |
|----------|------|---------|------|
| `notification.push` | S→C | `{ type, title, body }` | 推播通知 |
| `announcement.new` | S→C | `{ announcement }` | 新公告 |

### 聊天事件

| 事件名稱 | 方向 | Payload | 說明 |
|----------|------|---------|------|
| `chat.message` | C→S | `{ channelId, content }` | 發送訊息 |
| `chat.receive` | S→C | `{ message: Message }` | 接收訊息 |
| `chat.typing` | C→S | `{ channelId }` | 正在輸入 |

---

## 房間 (Rooms)

```javascript
// 加入任務房間
socket.emit('room.join', { room: `task:${taskId}` });

// 離開房間
socket.emit('room.leave', { room: `task:${taskId}` });
```

| 房間類型 | 格式 | 說明 |
|----------|------|------|
| 任務 | `task:{taskId}` | 任務相關更新 |
| 區域 | `zone:{zoneId}` | 區域廣播 |
| 團隊 | `team:{teamId}` | 團隊通訊 |
| 全域 | `global` | 系統公告 |

---

## 錯誤處理

```javascript
socket.on('error', (error) => {
  // { code: 'AUTH_FAILED', message: '認證失敗' }
});
```

| 錯誤碼 | 說明 |
|--------|------|
| AUTH_FAILED | Token 無效 |
| ROOM_ACCESS_DENIED | 無權加入房間 |
| RATE_LIMITED | 訊息過於頻繁 |

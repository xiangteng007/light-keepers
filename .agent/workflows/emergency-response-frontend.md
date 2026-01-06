---
description: Emergency Response 前端頁面架構與組件文件
---

# Emergency Response 前端頁面

## 📂 檔案結構

```
web-dashboard/src/pages/
├── EmergencyResponsePage.tsx    # 主頁面組件
└── EmergencyResponsePage.css    # 樣式檔案
```

---

## 🎯 頁面功能

### 核心功能
1. **任務管理** - 建立、啟動、結束任務
2. **KPI 儀表板** - 即時統計資訊
3. **任務歷史** - 查看過往任務記錄
4. **權限控制** - Level 2+ 才能進入

### 頁面區塊

```
┌─────────────────────────────────┐
│  Header + 新增任務按鈕           │
├─────────────────────────────────┤
│  KPI Cards (4x Grid)            │
│  ┌────┬────┬────┬────┐          │
│  │狀態│事件│進度│時間│          │
│  └────┴────┴────┴────┘          │
├─────────────────────────────────┤
│  進行中任務卡片                 │
│  ┌─────────────────────┐        │
│  │ 任務標題            │        │
│  │ 指揮官 / 行動按鈕   │        │
│  └─────────────────────┘        │
├─────────────────────────────────┤
│  任務歷史 Grid                  │
│  ┌────┬────┬────┐              │
│  │任務│任務│任務│              │
│  └────┴────┴────┘              │
└─────────────────────────────────┘
```

---

## 🧩 組件結構

### EmergencyResponsePage Component

```typescript
interface MissionSession {
  id: string;
  title: string;
  status: 'preparing' | 'active' | 'paused' | 'completed' | 'cancelled';
  commanderName?: string;
  createdAt: string;
  startedAt?: string;
}

interface SessionStats {
  sessionId: string;
  status: string;
  eventsCount: number;
  tasksCount: number;
  completedTasksCount: number;
  duration: number;  // seconds
}

const EmergencyResponsePage: React.FC = () => {
  const [sessions, setSessions] = useState<MissionSession[]>([]);
  const [activeSession, setActiveSession] = useState<MissionSession | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  
  // ... component logic
}
```

---

## 🎨 主要 UI 組件

### 1. Header

```jsx
<div className="er-header">
  <h1>🚨 緊急應變任務系統</h1>
  <button onClick={() => setShowCreateModal(true)}>
    + 新增任務
  </button>
</div>
```

### 2. KPI Cards

```jsx
<div className="kpi-row">
  <div className="kpi-card">
    <div className="kpi-icon">📊</div>
    <div className="kpi-content">
      <div className="kpi-label">任務狀態</div>
      <div className="kpi-value">{stats.status}</div>
    </div>
  </div>
  
  <div className="kpi-card">
    <div className="kpi-icon">📝</div>
    <div className="kpi-content">
      <div className="kpi-label">事件數</div>
      <div className="kpi-value">{stats.eventsCount}</div>
    </div>
  </div>
  
  <div className="kpi-card">
    <div className="kpi-icon">✅</div>
    <div className="kpi-content">
      <div className="kpi-label">任務進度</div>
      <div className="kpi-value">
        {stats.completedTasksCount}/{stats.tasksCount}
      </div>
    </div>
  </div>
  
  <div className="kpi-card">
    <div className="kpi-icon">⏱️</div>
    <div className="kpi-content">
      <div className="kpi-label">持續時間</div>
      <div className="kpi-value">{formatDuration(stats.duration)}</div>
    </div>
  </div>
</div>
```

### 3. 進行中任務卡片

```jsx
{activeSession && (
  <div className="active-session-card">
    <h2>進行中任務：{activeSession.title}</h2>
    <p>指揮官：{activeSession.commanderName || '未指定'}</p>
    <div className="session-actions">
      <button onClick={() => navigate(`/emergency-response/${activeSession.id}/events`)}>
        查看事件
      </button>
      <button onClick={() => navigate(`/emergency-response/${activeSession.id}/tasks`)}>
        管理任務
      </button>
      <button onClick={() => endSession(activeSession.id)}>
        結束任務
      </button>
    </div>
  </div>
)}
```

### 4. 任務歷史列表

```jsx
<div className="session-grid">
  {sessions.map(session => (
    <div key={session.id} className={`session-card status-${session.status}`}>
      <div className="session-header">
        <h4>{session.title}</h4>
        <span className="status-badge">{getStatusText(session.status)}</span>
      </div>
      <p>指揮官：{session.commanderName}</p>
      <p>建立時間：{new Date(session.createdAt).toLocaleString('zh-TW')}</p>
      
      {session.status === 'preparing' && (
        <button onClick={() => startSession(session.id)}>
          啟動任務
        </button>
      )}
    </div>
  ))}
</div>
```

### 5. 新增任務 Modal

```jsx
{showCreateModal && (
  <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <h3>新增緊急應變任務</h3>
      <input
        type="text"
        placeholder="任務名稱"
        value={newSessionTitle}
        onChange={(e) => setNewSessionTitle(e.target.value)}
      />
      <div className="modal-actions">
        <button onClick={() => setShowCreateModal(false)}>取消</button>
        <button onClick={createSession}>建立</button>
      </div>
    </div>
  </div>
)}
```

---

## 🎨 CSS 樣式重點

### 色彩變數 (使用 Light Theme)

```css
.emergency-response-page {
  --navy-primary: #1E3A6C;
  --gold-primary: #C59750;
  --white-bg: #FFFFFF;
}
```

### KPI Card 樣式

```css
.kpi-card {
  background: white;
  border: 2px solid var(--navy-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(30, 58, 108, 0.15);
}
```

### 進行中任務卡片

```css
.active-session-card {
  background: linear-gradient(135deg, var(--navy-primary) 0%, var(--navy-secondary) 100%);
  color: white;
  border-radius: 16px;
  padding: 32px;
}
```

### 狀態標籤

```css
.status-badge {
  background: var(--navy-secondary);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.session-card.status-active .status-badge {
  background: var(--gold-primary);
}

.session-card.status-completed .status-badge {
  background: #28a745;
}
```

---

## 📡 API 整合

### API 呼叫範例

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 載入任務列表
const loadSessions = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await axios.get(`${API_URL}/mission-sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setSessions(response.data);
};

// 建立新任務
const createSession = async () => {
  const token = localStorage.getItem('accessToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  await axios.post(
    `${API_URL}/mission-sessions`,
    {
      title: newSessionTitle,
      status: 'preparing',
      commanderName: user.displayName || user.email,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  loadSessions();
};

// 啟動任務
const startSession = async (sessionId: string) => {
  const token = localStorage.getItem('accessToken');
  await axios.post(
    `${API_URL}/mission-sessions/${sessionId}/start`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  loadSessions();
};
```

---

## 🛡️ 權限控制

### 路由保護

```tsx
// App.tsx
<Route 
  path="emergency-response" 
  element={
    <ProtectedRoute requiredLevel={2}>
      <EmergencyResponsePage />
    </ProtectedRoute>
  } 
/>
```

### 主 Dashboard 整合

```tsx
// DashboardPage.tsx
{roleLevel >= 2 && (
  <Link to="/emergency-response" className="cc-quick-btn cc-quick-btn--emergency">
    <span className="cc-quick-btn__icon">🚨</span>
    <span className="cc-quick-btn__label">緊急啟動</span>
  </Link>
)}
```

---

## 🎯 工具函數

```typescript
// 格式化持續時間
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

// 狀態文字對照
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    preparing: '準備中',
    active: '進行中',
    paused: '已暫停',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
}
```

---

## 📱 響應式設計

```css
@media (max-width: 768px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }
  
  .session-grid {
    grid-template-columns: 1fr;
  }
  
  .session-actions {
    flex-direction: column;
  }
  
  .session-actions .btn {
    width: 100%;
  }
}
```

---

## 🔗 相關檔案

- 主組件: `web-dashboard/src/pages/EmergencyResponsePage.tsx`
- 樣式: `web-dashboard/src/pages/EmergencyResponsePage.css`
- 路由: `web-dashboard/src/App.tsx`
- Dashboard 整合: `web-dashboard/src/pages/DashboardPage.tsx`

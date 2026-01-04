# Emergency Response 資料模型與 DB Schema

**文件編號**：05  
**版本**：1.0

---

## 1. 資料分類

| 類型 | 表格 | 說明 |
|------|------|------|
| **Reference** | volunteers, resources, manuals, ncdr_sources | 主系統長期資料 |
| **Session** | mission_sessions, events, tasks, reports, inventory_txns, map_markers, audit_logs | 任務資料 |

---

## 2. Entity 定義

### 2.1 MissionSession（任務場次）

```sql
CREATE TABLE mission_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,        -- 任務代碼 e.g. "ER-2026-001"
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft',      -- draft|active|closing|archived|purged
  commander_id UUID REFERENCES users(id),
  location GEOGRAPHY(POINT, 4326),         -- PostGIS 座標
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_status CHECK (status IN ('draft','active','closing','archived','purged'))
);
CREATE INDEX idx_mission_sessions_status ON mission_sessions(status);
CREATE INDEX idx_mission_sessions_created ON mission_sessions(created_at DESC);
```

### 2.2 Event（事件）

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_session_id UUID NOT NULL REFERENCES mission_sessions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium',   -- low|medium|high|critical
  status VARCHAR(20) DEFAULT 'open',       -- open|in_progress|resolved|closed
  location GEOGRAPHY(POINT, 4326),
  reported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_session ON events(mission_session_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_location ON events USING GIST(location);
```

### 2.3 Task（派工）

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_session_id UUID NOT NULL REFERENCES mission_sessions(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',    -- pending|assigned|in_progress|completed|cancelled
  priority VARCHAR(20) DEFAULT 'normal',   -- low|normal|high|urgent
  assignee_id UUID REFERENCES users(id),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tasks_session ON tasks(mission_session_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
```

### 2.4 Report（通報）

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_session_id UUID NOT NULL REFERENCES mission_sessions(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,             -- app|phone|radio|line
  category VARCHAR(50),
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',    -- pending|processing|resolved|archived
  reporter_name VARCHAR(100),
  reporter_contact VARCHAR(100),
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reports_session ON reports(mission_session_id);
```

### 2.5 InventoryTxn（物資異動）

```sql
CREATE TABLE inventory_txns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_session_id UUID NOT NULL REFERENCES mission_sessions(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id),
  txn_type VARCHAR(20) NOT NULL,           -- in|out|transfer
  quantity INTEGER NOT NULL,
  from_location VARCHAR(100),
  to_location VARCHAR(100),
  operator_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_txns_session ON inventory_txns(mission_session_id);
CREATE INDEX idx_inventory_txns_resource ON inventory_txns(resource_id);
```

### 2.6 AuditLog（稽核日誌）

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_session_id UUID REFERENCES mission_sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,             -- session.create|session.end|report.export|...
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_session ON audit_logs(mission_session_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## 3. ER 關係圖（文字）

```
mission_sessions (1) ──< events (N)
mission_sessions (1) ──< tasks (N)
mission_sessions (1) ──< reports (N)
mission_sessions (1) ──< inventory_txns (N)
mission_sessions (1) ──< audit_logs (N)

events (1) ──< tasks (N)
resources (1) ──< inventory_txns (N)
users (1) ──< tasks (N, assignee)
users (1) ──< audit_logs (N)
```

---

## 4. 重置刪除策略

```sql
-- 清除指定 Session 的所有任務資料（主資料不受影響）
DELETE FROM events WHERE mission_session_id = :id;
DELETE FROM tasks WHERE mission_session_id = :id;
DELETE FROM reports WHERE mission_session_id = :id;
DELETE FROM inventory_txns WHERE mission_session_id = :id;
DELETE FROM audit_logs WHERE mission_session_id = :id;
UPDATE mission_sessions SET status = 'purged' WHERE id = :id;
```

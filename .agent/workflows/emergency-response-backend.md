---
description: Emergency Response 後端模組架構與 API 文件
---

# Emergency Response 後端模組

## 📂 模組結構

位置: `backend/src/modules/mission-sessions/`

```
mission-sessions/
├── entities/
│   ├── mission-session.entity.ts    # 任務會話
│   ├── event.entity.ts              # 事件記錄
│   ├── task.entity.ts               # 任務項目
│   └── inventory-transaction.entity.ts  # 物資異動
├── dto/
│   ├── mission-session.dto.ts       # 任務 DTO
│   ├── event.dto.ts                 # 事件 DTO
│   └── task.dto.ts                  # 任務 DTO
├── mission-sessions.controller.ts   # REST API Controller
├── mission-sessions.service.ts      # 業務邏輯
└── mission-sessions.module.ts       # 模組定義
```

---

## 🗃️ 資料模型 (Entities)

### MissionSession Entity

```typescript
@Entity('mission_sessions')
export class MissionSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MissionStatus,
    default: MissionStatus.PREPARING,
  })
  status: MissionStatus;  // preparing | active | paused | completed | cancelled

  @Column({ name: 'commander_id', type: 'varchar', nullable: true })
  commanderId: string;

  @Column({ name: 'commander_name', type: 'varchar', nullable: true })
  commanderName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;

  // Relations
  @OneToMany(() => Event, (event) => event.session)
  events: Event[];

  @OneToMany(() => Task, (task) => task.session)
  tasks: Task[];

  @OneToMany(() => InventoryTransaction, (txn) => txn.session)
  inventoryTransactions: InventoryTransaction[];
}
```

### Event Entity

```typescript
@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;  // info | warning | critical | success

  @Column({ name: 'reporter_id', type: 'varchar', nullable: true })
  reporterId: string;

  @Column({ type: 'jsonb', nullable: true })
  location: number[];  // [lng, lat]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => MissionSession, (session) => session.events)
  session: MissionSession;
}
```

### Task Entity

```typescript
@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: TaskStatus })
  status: TaskStatus;  // todo | in_progress | completed | cancelled

  @Column({ type: 'enum', enum: TaskPriority })
  priority: TaskPriority;  // low | medium | high | urgent

  @Column({ name: 'assignee_id', type: 'varchar', nullable: true })
  assigneeId: string;

  @Column({ name: 'due_at', type: 'timestamp', nullable: true })
  dueAt: Date;

  @ManyToOne(() => MissionSession, (session) => session.tasks)
  session: MissionSession;
}
```

---

## 🔌 REST API 端點

### Mission Sessions

```typescript
// 建立任務 (Level 2+)
POST /mission-sessions
Body: { title, description, commanderId, commanderName }
Response: MissionSession

// 列出任務 (Level 1+)
GET /mission-sessions
Response: MissionSession[]

// 單一任務 (Level 1+)
GET /mission-sessions/:id
Response: MissionSession

// 更新任務 (Level 2+)
PUT /mission-sessions/:id
Body: { title, description, status }
Response: MissionSession

// 啟動任務 (Level 2+)
POST /mission-sessions/:id/start
Response: MissionSession

// 結束任務 (Level 2+)
POST /mission-sessions/:id/end
Response: MissionSession

// 刪除任務 (Level 4+)
DELETE /mission-sessions/:id
Response: void
```

### Events

```typescript
// 新增事件 (Level 2+)
POST /mission-sessions/events
Body: { sessionId, title, type, location }
Response: Event

// 事件列表 (Level 1+)
GET /mission-sessions/:sessionId/events
Response: Event[]
```

### Tasks

```typescript
// 新增任務 (Level 2+)
POST /mission-sessions/tasks
Body: { sessionId, title, priority, assigneeId, dueAt }
Response: Task

// 任務列表 (Level 1+)
GET /mission-sessions/:sessionId/tasks
Response: Task[]

// 更新任務 (Level 2+)
PUT /mission-sessions/tasks/:id
Body: { title, status, priority }
Response: Task

// 刪除任務 (Level 2+)
DELETE /mission-sessions/tasks/:id
Response: void
```

### Statistics

```typescript
// 統計資訊 (Level 1+)
GET /mission-sessions/:id/stats
Response: {
  sessionId: string,
  status: string,
  eventsCount: number,
  tasksCount: number,
  completedTasksCount: number,
  duration: number  // seconds
}
```

---

## 🛡️ 權限控制

使用 `MinLevel` decorator 實現 role-level based access control:

```typescript
import { JwtAuthGuard, RolesGuard, MinLevel } from '../auth/guards';
import { RoleLevel } from '../accounts/entities/role.entity';

@Controller('mission-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MissionSessionsController {
  @Post()
  @MinLevel(RoleLevel.OFFICER)  // Level 2+
  createSession(@Body() dto: CreateMissionSessionDto) {
    return this.service.createSession(dto);
  }

  @Get()
  @MinLevel(RoleLevel.VOLUNTEER)  // Level 1+
  findAllSessions() {
    return this.service.findAllSessions();
  }
}
```

**權限等級**:
- Level 0: PUBLIC (公開)
- Level 1: VOLUNTEER (志工)
- Level 2: OFFICER (幹部)
- Level 3: DIRECTOR (常務理事)
- Level 4: CHAIRMAN (理事長)
- Level 5: OWNER (系統擁有者)

---

## 🔧 Service 層核心方法

```typescript
export class MissionSessionsService {
  // Mission Session CRUD
  async createSession(dto: CreateMissionSessionDto): Promise<MissionSession>
  async findAllSessions(): Promise<MissionSession[]>
  async findSessionById(id: string): Promise<MissionSession>
  async updateSession(id: string, dto: UpdateMissionSessionDto): Promise<MissionSession>
  async startSession(id: string): Promise<MissionSession>
  async endSession(id: string): Promise<MissionSession>
  async deleteSession(id: string): Promise<void>

  // Event CRUD
  async createEvent(dto: CreateEventDto): Promise<Event>
  async findEventsBySession(sessionId: string): Promise<Event[]>

  // Task CRUD
  async createTask(dto: CreateTaskDto): Promise<Task>
  async findTasksBySession(sessionId: string): Promise<Task[]>
  async updateTask(id: string, dto: UpdateTaskDto): Promise<Task>
  async deleteTask(id: string): Promise<void>

  // Statistics
  async getSessionStats(sessionId: string): Promise<SessionStats>
}
```

---

## 🗄️ 資料庫 Schema

```sql
-- Mission Sessions
CREATE TABLE mission_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'preparing',
    commander_id VARCHAR,
    commander_name VARCHAR,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    ended_at TIMESTAMP
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES mission_sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'info',
    reporter_id VARCHAR,
    reporter_name VARCHAR,
    location JSONB,  -- [lng, lat]
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES mission_sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'medium',
    assignee_id VARCHAR,
    assignee_name VARCHAR,
    due_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Inventory Transactions
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES mission_sessions(id) ON DELETE CASCADE,
    item VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    type VARCHAR(50) DEFAULT 'deploy',
    operator_id VARCHAR,
    operator_name VARCHAR,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📝 使用範例

### 本地開發測試

```bash
# 啟動後端
cd backend
npm run start:dev

# 測試 API
curl -X POST http://localhost:3000/mission-sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "地震應變任務",
    "commanderName": "王指揮官"
  }'
```

---

## 🔗 相關檔案

- Module: `backend/src/modules/mission-sessions/mission-sessions.module.ts`
- Controller: `backend/src/modules/mission-sessions/mission-sessions.controller.ts`
- Service: `backend/src/modules/mission-sessions/mission-sessions.service.ts`
- Entities: `backend/src/modules/mission-sessions/entities/`

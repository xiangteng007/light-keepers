# 缺口分析 (Gap Analysis)

> **產出日期**: 2026-01-13  
> **基準**: 社團法人協會災防/救災應變實務需求  
> **分類**: MoSCoW (Must/Should/Could/Won't)

---

## 🎯 總體缺口矩陣

| 功能域 | Must Have 缺口 | Should Have 缺口 | Could Have 缺口 |
|--------|:--------------:|:----------------:|:---------------:|
| **A. 應變指揮 (ICS/C2)** | 5 項 | 3 項 | 2 項 |
| **B. 動員與通知** | 2 項 | 3 項 | 2 項 |
| **C. 災情回報** | 3 項 | 2 項 | 1 項 |
| **D. 任務與派遣** | 4 項 | 3 項 | 2 項 |
| **E. 資源與後勤** | 1 項 | 2 項 | 3 項 |
| **F. 風險治理** | 4 項 | 2 項 | 1 項 |
| **G. 復盤與報表** | 3 項 | 2 項 | 2 項 |

---

## A. 應變指揮 (ICS/C2) 缺口

### 🔴 Must Have

#### A-M1: SITREP 自動產出

- **影響**: ICS 流程不完整，無法快速產出態勢報告
- **現況**: `mission-sessions` 僅有模板，無資料填充邏輯
- **建議方案**:

  ```typescript
  // mission-sessions.service.ts
  async generateSitrep(sessionId: string): Promise<SitrepData> {
    const session = await this.findOne(sessionId);
    const reports = await this.reportsService.findByEvent(session.eventId);
    const tasks = await this.tasksService.findByEvent(session.eventId);
    const resources = await this.resourcesService.getUsageByEvent(session.eventId);
    
    return {
      timestamp: new Date(),
      eventSummary: this.summarizeEvent(session.event),
      incidentMap: this.generateMapSnapshot(reports),
      taskStatus: this.aggregateTaskStatus(tasks),
      resourceStatus: this.aggregateResourceStatus(resources),
      nextActions: this.predictNextActions(reports, tasks),
    };
  }
  ```

- **牽涉模組**: `mission-sessions`, `reports`, `tasks`, `resources`
- **預估工時**: 12h
- **優先序**: P0 (Week 1)

#### A-M2: IAP 簽核流程

- **影響**: 無法追蹤 Action Plan 的核准狀態與版本
- **現況**: IAP 模板存在但無 workflow
- **建議方案**:
  - 新增 `IapApproval` entity (版本、簽核人、時間戳)
  - 實作簽核 API with guard (minLevel: Manager)
  - 發布後自動通知相關人員
- **牽涉模組**: `mission-sessions`, `notifications`, `audit-log`
- **預估工時**: 10h
- **優先序**: P0 (Week 2)

#### A-M3: 指揮鏈建模

- **影響**: 無法明確職責分工 (IC/Section Chiefs)
- **現況**: `org-chart` 存在但未與 `mission-sessions` 關聯
- **建議方案**:

  ```typescript
  // mission-sessions/entities/command-chain.entity.ts
  @Entity()
  export class CommandChain {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @ManyToOne(() => MissionSession)
    session: MissionSession;
    
    @Column({ type: 'enum', enum: ['IC', 'Operations', 'Planning', 'Logistics', 'Finance'] })
    section: ICSSection;
    
    @ManyToOne(() => Account)
    assignee: Account;
    
    @Column({ type: 'timestamp' })
    assignedAt: Date;
  }
  ```

- **牽涉模組**: `mission-sessions`, `org-chart`, `accounts`
- **預估工時**: 8h
- **優先序**: P0 (Week 2)

#### A-M4: 事件分級自動化

- **影響**: 無法根據災情規模自動調整應變等級
- **現況**: 事件建立時手動選擇等級
- **建議方案**:
  - 規則引擎：報案數量、災害類型、影響範圍 → 自動分級
  - 分級變更觸發不同通知策略
- **牽涉模組**: `events`, `ncdr-alerts`, `notifications`
- **預估工時**: 6h
- **優先序**: P1 (Week 3)

#### A-M5: 戰情態勢儀表板即時更新

- **影響**: CommandCenterPage 資料非即時
- **現況**: 頁面僅輪詢，無 WebSocket 推送
- **建議方案**:

  ```typescript
  // realtime.gateway.ts
  @SubscribeMessage('subscribe:event')
  handleEventSubscribe(client: Socket, eventId: string) {
    client.join(`event:${eventId}`);
    this.eventEmitter.on(`event.${eventId}.update`, (data) => {
      this.server.to(`event:${eventId}`).emit('event:update', data);
    });
  }
  ```

- **牽涉模組**: `realtime`, `events`, `reports`, `tasks`
- **預估工時**: 8h
- **優先序**: P1 (Week 4)

### 🟡 Should Have

#### A-S1: COP (Common Operating Picture) 整合

- **影響**: 指揮官缺乏統一態勢圖
- **建議方案**: CommandCenterPage 整合地圖、報表、任務看板
- **預估工時**: 12h

#### A-S2: 多事件並行管理

- **影響**: 僅能處理單一大型事件
- **建議方案**: MissionSession 支援多場次並行
- **預估工時**: 8h

#### A-S3: 歷史事件快速複製

- **影響**: 類似事件無法快速啟動
- **建議方案**: 事件模板系統
- **預估工時**: 6h

---

## B. 動員與通知缺口

### 🔴 Must Have

#### B-M1: 志工召集條件篩選

- **影響**: 無法精準召集符合條件的志工，浪費人力
- **現況**: `volunteer-skill`, `volunteer-vehicle` 存在但無 API
- **建議方案**:

  ```typescript
  // volunteers.service.ts
  async findEligible(criteria: {
    skills?: string[];      // 技能需求
    maxDistance?: number;   // 最大距離 (km)
    hasVehicle?: boolean;   // 是否需車輛
    certifications?: string[]; // 認證需求
    location?: Point;       // 中心點
  }): Promise<Volunteer[]> {
    const query = this.repository.createQueryBuilder('v')
      .leftJoinAndSelect('v.skills', 's')
      .leftJoinAndSelect('v.vehicle', 'vehicle')
      .leftJoinAndSelect('v.certificates', 'cert');
    
    if (criteria.skills) {
      query.andWhere('s.skillName IN (:...skills)', { skills: criteria.skills });
    }
    
    if (criteria.location && criteria.maxDistance) {
      query.andWhere(
        'ST_DWithin(v.lastLocation, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :maxDist)',
        { lng: criteria.location.coordinates[0], lat: criteria.location.coordinates[1], maxDist: criteria.maxDistance * 1000 }
      );
    }
    
    if (criteria.hasVehicle) {
      query.andWhere('vehicle.id IS NOT NULL');
    }
    
    return query.getMany();
  }
  ```

- **牽涉模組**: `volunteers`, `volunteers/assignments`, `task-dispatch`
- **預估工時**: 10h
- **優先序**: P0 (Week 1)

#### B-M2: 通知送達追蹤與回覆機制

- **影響**: 無法確認志工是否收到召集，影響動員效率
- **現況**: 通知發送後無追蹤
- **建議方案**:
  - `NotificationDeliveryLog` entity (已有 webhook-delivery-log 可參考)
  - LINE Bot webhook 接收回覆 → 更新 `VolunteerAssignment.status`
  - 未回覆警報機制
- **牽涉模組**: `notifications`, `line-bot`, `volunteers/assignments`
- **預估工時**: 8h
- **優先序**: P0 (Week 2)

### 🟡 Should Have

#### B-S1: 集合點管理專用邏輯

- **建議方案**: `overlays/Location` 新增 `type: 'assembly_point'` 與相關 API
- **預估工時**: 6h

#### B-S2: 批次通知模板管理

- **建議方案**: 預設模板 + 自訂變數替換
- **預估工時**: 4h

#### B-S3: SMS/Email 實際整合

- **建議方案**: Twilio + SendGrid API 串接
- **預估工時**: 8h

---

## C. 災情回報缺口

### 🔴 Must Have

#### C-M1: 案件去重邏輯

- **影響**: 同一事件重複通報，浪費處理資源
- **現況**: 完全無去重
- **建議方案**:

  ```typescript
  // reports.service.ts
  async checkDuplicate(report: CreateReportDto): Promise<Report | null> {
    const timeWindow = 30 * 60 * 1000; // 30 分鐘
    const distanceThreshold = 100; // 100 公尺
    
    const duplicate = await this.repository
      .createQueryBuilder('r')
      .where('r.createdAt > :since', { since: new Date(Date.now() - timeWindow) })
      .andWhere('r.status != :closed', { closed: 'closed' })
      .andWhere(
        'ST_DWithin(r.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :dist)',
        { lng: report.longitude, lat: report.latitude, dist: distanceThreshold }
      )
      .andWhere('SIMILARITY(r.description, :desc) > 0.6', { desc: report.description })
      .getOne();
    
    return duplicate;
  }
  ```

- **牽涉模組**: `reports`, `intake`
- **預估工時**: 8h
- **優先序**: P0 (Week 1)

#### C-M2: 案件 SLA 監控

- **影響**: 無法追蹤處理時效，高優先案件可能被遺漏
- **現況**: 無 SLA 機制
- **建議方案**:
  - `Report` 新增 `slaDeadline` (根據 severity 計算)
  - 排程任務檢查逾期案件 → 自動升級或警報
- **牽涉模組**: `reports`, `scheduler`, `notifications`
- **預估工時**: 6h
- **優先序**: P0 (Week 2)

#### C-M3: 案件雙向關聯追蹤

- **影響**: 無法從案件查詢關聯的任務與資源使用
- **現況**: FK 存在但無 API
- **建議方案**:

  ```typescript
  // reports.controller.ts
  @Get(':id/related')
  async getRelated(@Param('id') id: string) {
    return {
      report: await this.reportsService.findOne(id),
      tasks: await this.tasksService.findByReport(id),
      resources: await this.resourcesService.findByReport(id),
      fieldReports: await this.fieldReportsService.findByReport(id),
    };
  }
  ```

- **牽涉模組**: `reports`, `tasks`, `resources`, `field-reports`
- **預估工時**: 4h
- **優先序**: P1 (Week 3)

### 🟡 Should Have

#### C-S1: EXIF 資料自動提取

- **建議方案**: 上傳照片自動提取 GPS、時間戳
- **預估工時**: 6h

#### C-S2: 照片/影片防竄改 (Hash)

- **建議方案**: SHA-256 hash + 上傳時間戳存入 DB
- **預估工時**: 4h

---

## D. 任務與派遣缺口

### 🔴 Must Have

#### D-M1: 任務狀態變更觸發通知

- **影響**: 被指派志工不知道任務狀態變化
- **現況**: `task-dispatch` 未發送事件
- **建議方案**:

  ```typescript
  // task-dispatch.service.ts
  async assignTask(taskId: string, volunteerId: string) {
    const assignment = await this.createAssignment(taskId, volunteerId);
    
    // 發送事件
    this.eventEmitter.emit('task.assigned', {
      taskId,
      volunteerId,
      assignmentId: assignment.id,
    });
    
    return assignment;
  }
  
  // notifications.service.ts (監聽器)
  @OnEvent('task.assigned')
  async handleTaskAssigned(payload: TaskAssignedEvent) {
    const volunteer = await this.accountsService.findOne(payload.volunteerId);
    const task = await this.tasksService.findOne(payload.taskId);
    
    await this.sendToUser(volunteer.id, {
      title: '🎯 新任務指派',
      body: `您已被指派任務: ${task.title}`,
      data: { taskId: task.id, type: 'task_assigned' },
    });
  }
  ```

- **牽涉模組**: `task-dispatch`, `notifications`
- **預估工時**: 4h
- **優先序**: P0 (Week 1)

#### D-M2: 簽到/簽退機制

- **影響**: 無法追蹤志工實際出勤與工時
- **現況**: `attendance` 與 `tasks` 未串接
- **建議方案**:
  - `TaskAttendance` entity (FK to Task + Account)
  - 簽到 API: 驗證 GPS 在任務地點範圍內
  - 簽退 API: 計算工時 → 更新 Task.status
- **牽涉模組**: `tasks`, `attendance`, `location`
- **預估工時**: 8h
- **優先序**: P0 (Week 2)

#### D-M3: 智慧派遣策略實作

- **影響**: 手動派遣效率低，無法最佳化資源配置
- **現況**: `DispatcherAgent` 僅框架
- **建議方案**:

  ```typescript
  // ai/services/dispatcher-agent.service.ts
  async suggestAssignments(taskId: string): Promise<VolunteerSuggestion[]> {
    const task = await this.tasksService.findOne(taskId);
    const eligibleVolunteers = await this.volunteersService.findEligible({
      skills: task.requiredSkills,
      location: task.location,
      maxDistance: 10, // km
    });
    
    return eligibleVolunteers.map(v => ({
      volunteer: v,
      score: this.calculateScore(v, task),
      distance: this.calculateDistance(v.lastLocation, task.location),
      currentLoad: this.getCurrentTaskCount(v.id),
    })).sort((a, b) => b.score - a.score);
  }
  ```

- **牽涉模組**: `ai`, `task-dispatch`, `volunteers`
- **預估工時**: 16h
- **優先序**: P1 (Week 3-4)

#### D-M4: 地圖派遣整合

- **影響**: 派遣時無視覺化輔助
- **現況**: `tactical-maps` 與 `task-dispatch` 未串接
- **建議方案**:
  - EmergencyResponsePage 地圖整合派遣 UI
  - 點擊地圖標記 → 快速指派
  - 顯示志工分佈與任務分佈
- **牽涉模組**: `tactical-maps`, `task-dispatch`, EmergencyResponsePage
- **預估工時**: 10h
- **優先序**: P1 (Week 4)

### 🟡 Should Have

#### D-S1: 失聯警報機制

- **建議方案**: Location tracking 斷線 > 10 分鐘 → 自動警報
- **預估工時**: 6h

#### D-S2: 路徑規劃整合

- **建議方案**: `routing` module 整合到任務派遣流程
- **預估工時**: 8h

#### D-S3: 禁制區/熱區警報

- **建議方案**: 志工進入危險區域自動警報
- **預估工時**: 6h

---

## E. 資源與後勤缺口

### 🔴 Must Have

#### E-M1: Resources 模組簡化

- **影響**: 40+ entities 過於複雜，維護困難
- **現況**: 功能完整但過度工程化
- **建議方案**:
  - 合併相似 entities (Lot + Batch)
  - 移除未使用的 entities (需 dead code 分析)
  - 保留核心流程：庫存 → 交易 → 稽核
- **牽涉模組**: `resources`
- **預估工時**: 12h (重構)
- **優先序**: P2 (Week 6)

### 🟡 Should Have

#### E-S1: 資源需求預測

- **建議方案**: `ForecasterAgent` 分析歷史資料 → 預測物資需求
- **預估工時**: 12h

#### E-S2: 車輛/裝備統一管理

- **建議方案**: 合併 `equipment`, `volunteer-vehicle` 至 `resources`
- **預估工時**: 8h

---

## F. 風險治理與合規缺口

### 🔴 Must Have

#### F-M1: Controller Guard 全面檢查

- **影響**: 部分端點無權限驗證，安全漏洞
- **現況**: `task-dispatch.controller`, `aar-analysis.controller` 等無 guard
- **建議方案**:

  ```bash
  # 掃描所有 Controller
  grep -r "@Controller" --include="*.controller.ts" | \
  while read file; do
    if ! grep -q "@UseGuards" "$file"; then
      echo "Missing guard: $file"
    fi
  done
  ```

  - 為所有 Controller 補上 `@UseGuards(UnifiedRolesGuard)`
  - 敏感操作補上 `@RequireLevel(3)`
- **牽涉模組**: 所有 controllers
- **預估工時**: 8h
- **優先序**: P0 (Week 1)

#### F-M2: 敏感資料遮罩策略

- **影響**: 個資外洩風險
- **現況**: `resources/sensitive.controller` 有 SensitiveReadLog 但未全面實施
- **建議方案**:
  - 定義敏感欄位清單 (身分證、電話、地址)
  - Interceptor 自動遮罩（roleLevel < 3 時）

  ```typescript
  @Injectable()
  export class SensitiveDataInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler) {
      const req = context.switchToHttp().getRequest();
      return next.handle().pipe(
        map(data => {
          if (req.user?.roleLevel < 3) {
            return this.maskSensitiveFields(data);
          }
          return data;
        })
      );
    }
  }
  ```

- **牽涉模組**: `common/interceptors`, `volunteers`, `accounts`
- **預估工時**: 10h
- **優先序**: P0 (Week 2)

#### F-M3: 照片/影片證據鏈

- **影響**: 無法證明照片未被竄改
- **現況**: 僅存 URL
- **建議方案**:
  - Upload 時計算 SHA-256
  - 存入 `Upload` entity: `hash`, `uploadedAt`, `uploadedBy`
  - 驗證 API: 重新計算 hash 比對
- **牽涉模組**: `uploads`, `reports`
- **預估工時**: 6h
- **優先序**: P1 (Week 3)

#### F-M4: 刪除策略統一

- **影響**: 資料一致性風險
- **現況**: 混用硬刪與軟刪
- **建議方案**:
  - 核心 entity (Reports, Events, Tasks) 一律軟刪 (`deletedAt`)
  - 輔助資料 (Logs, Temp data) 可硬刪
  - 提供 restore API (roleLevel >= 4)
- **牽涉模組**: 所有有刪除操作的模組
- **預估工時**: 8h
- **優先序**: P1 (Week 3)

### 🟡 Should Have

#### F-S1: CORS/CSP 強化

- **建議方案**: 生產環境嚴格 CORS + CSP header
- **預估工時**: 4h

#### F-S2: Rate Limiting 細化

- **建議方案**: 不同端點不同限流策略
- **預估工時**: 4h

---

## G. 復盤與報表缺口

### 🔴 Must Have

#### G-M1: AAR 自動關聯資料

- **影響**: 復盤效率低，資料手動彙整
- **現況**: `aar-analysis` 僅 stub
- **建議方案**:

  ```typescript
  // aar-analysis.service.ts
  async generateAar(eventId: string): Promise<AarData> {
    const event = await this.eventsService.findOne(eventId);
    const reports = await this.reportsService.findByEvent(eventId);
    const tasks = await this.tasksService.findByEvent(eventId);
    const resources = await this.resourcesService.getUsageByEvent(eventId);
    const volunteers = await this.volunteersService.getParticipants(eventId);
    
    return {
      eventSummary: this.summarizeEvent(event),
      timeline: this.buildTimeline(reports, tasks),
      taskStatistics: this.analyzeTaskCompletion(tasks),
      resourceUsage: this.analyzeResourceUsage(resources),
      volunteerPerformance: this.analyzeVolunteers(volunteers),
      lessonsLearned: [], // 手動填寫
      recommendations: [], // 手動填寫
    };
  }
  ```

- **牽涉模組**: `aar-analysis`, `events`, `reports`, `tasks`, `resources`
- **預估工時**: 10h
- **優先序**: P1 (Week 4)

#### G-M2: 時間線視覺化串接

- **影響**: 無法直觀查看事件演進
- **現況**: `timeline-visualization` 未串接
- **建議方案**:
  - EmergencyResponsePage 整合時間線組件
  - 自動彙整 Reports, Tasks, FieldReports 的時間戳
- **牽涉模組**: `timeline-visualization`, EmergencyResponsePage
- **預估工時**: 8h
- **優先序**: P1 (Week 4)

#### G-M3: 報表匯出整合

- **影響**: AAR 無法批次匯出
- **現況**: `reports-export` 未與 `aar-analysis` 串接
- **建議方案**:
  - AAR → PDF (含圖表)
  - AAR → Excel (資料表)
- **牽涉模組**: `aar-analysis`, `pdf-generator`, `excel-export`
- **預估工時**: 6h
- **優先序**: P1 (Week 5)

### 🟡 Should Have

#### G-S1: 成效指標儀表板

- **建議方案**: AnalyticsPage 整合 AAR 指標
- **預估工時**: 8h

#### G-S2: 歷史事件比較分析

- **建議方案**: 跨事件指標對比
- **預估工時**: 10h

---

## 📋 缺口總結與優先序

### P0 (必須實作，Week 1-2)

| 編號 | 缺口 | 工時 | Week |
|:----:|------|:----:|:----:|
| A-M1 | SITREP 自動產出 | 12h | 1 |
| A-M2 | IAP 簽核流程 | 10h | 2 |
| A-M3 | 指揮鏈建模 | 8h | 2 |
| B-M1 | 志工召集條件篩選 | 10h | 1 |
| B-M2 | 通知送達追蹤 | 8h | 2 |
| C-M1 | 案件去重邏輯 | 8h | 1 |
| C-M2 | 案件 SLA 監控 | 6h | 2 |
| D-M1 | 任務通知事件 | 4h | 1 |
| D-M2 | 簽到/簽退機制 | 8h | 2 |
| F-M1 | Controller Guard 全面檢查 | 8h | 1 |
| F-M2 | 敏感資料遮罩 | 10h | 2 |

**P0 小計**: 92h (~2.3 週 / 2 人團隊)

### P1 (重要功能，Week 3-5)

| 編號 | 缺口 | 工時 | Week |
|:----:|------|:----:|:----:|
| A-M4 | 事件分級自動化 | 6h | 3 |
| A-M5 | 態勢儀表板即時更新 | 8h | 4 |
| C-M3 | 案件雙向關聯 | 4h | 3 |
| D-M3 | 智慧派遣策略 | 16h | 3-4 |
| D-M4 | 地圖派遣整合 | 10h | 4 |
| F-M3 | 照片證據鏈 | 6h | 3 |
| F-M4 | 刪除策略統一 | 8h | 3 |
| G-M1 | AAR 自動關聯 | 10h | 4 |
| G-M2 | 時間線視覺化 | 8h | 4 |
| G-M3 | 報表匯出整合 | 6h | 5 |

**P1 小計**: 82h (~2 週 / 2 人團隊)

### P2 (優化改進，Week 6+)

| 編號 | 缺口 | 工時 |
|:----:|------|:----:|
| E-M1 | Resources 簡化 | 12h |
| A-S1 | COP 整合 | 12h |
| D-S1 | 失聯警報 | 6h |
| E-S1 | 資源需求預測 | 12h |

---

## Won't Have (明確不做)

- AR/VR 模組
- Blockchain 供應鏈
- Drone Swarm
- Robot Rescue
- LoRa/MQTT (除非有實際斷網場景需求)

---

**下一步**: 產出 Roadmap (F)

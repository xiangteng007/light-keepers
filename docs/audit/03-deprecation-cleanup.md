# 淘汰與清理策略 (Deprecation Cleanup)

> **產出日期**: 2026-01-13  
> **目的**: 識別可安全刪除、需封存、需遷移的資料與程式碼

---

## 🎯 總體清理矩陣

| 類別 | 可安全刪除 | 需封存 | 需遷移 | 保留 |
|------|:----------:|:------:|:------:|:----:|
| **後端模組** | 8 個 | 2 個 | 3 個 | 162 個 |
| **Entities** | 5 個 | 3 個 | 2 個 | 90+ 個 |
| **前端頁面** | 2 個 | 1 個 | 0 個 | 106 個 |
| **API Routes** | 4 個 | 0 個 | 1 個 | 125+ 個 |

---

## 🗑️ 可安全刪除清單

### 後端模組

#### 1. `push-notification-v2/` ✅ **已刪除**

- **原因**: 功能被 `notifications/` 涵蓋，無外部依賴
- **狀態**: Week 1 整合時已刪除
- **驗證**: Backend build 通過

#### 2. AR/VR/未來科技模組 (8 個)

| 模組 | 原因 | 風險 |
|------|------|:----:|
| `ar-field-guidance` | Stub，無實質功能 | 低 |
| `ar-navigation` | Stub，無實質功能 | 低 |
| `vr-command` | Stub，無實質功能 | 低 |
| `drone-swarm` | Stub，無實質功能 | 低 |
| `robot-rescue` | Stub，無實質功能 | 低 |
| `blockchain` | Stub，無實質功能 | 低 |
| `supply-chain-blockchain` | Stub，無實質功能 | 低 |
| `cesium-3d` | Stub，未與主流程整合 | 低 |

**刪除命令** (待執行):

```powershell
# 刪除 AR/VR 相關模組
$modules = @(
  'ar-field-guidance',
  'ar-navigation', 
  'vr-command',
  'drone-swarm',
  'robot-rescue',
  'blockchain',
  'supply-chain-blockchain',
  'cesium-3d'
)

foreach ($m in $modules) {
  Remove-Item -Recurse -Force "backend/src/modules/$m"
}

# 從 app.module.ts 移除 imports
# (需手動編輯，約 16 行 import + 16 行 module import)
```

**影響評估**:

- ❌ 無外部依賴
- ❌ 無資料表
- ❌ 無 API 端點被使用
- ✅ 可安全刪除

---

### 前端頁面

#### 1. `pages/TacticalMapPage.tsx` (root) ✅ **已刪除**

- **原因**: 與 `pages/geo/TacticalMapPage.tsx` 重複
- **狀態**: Week 1 整合時已刪除

#### 2. `pages/CommandPostMapPage.tsx`

- **原因**: 功能與 `MapPage.tsx` 高度重疊
- **建議**: 合併至 `MapPage` 或 `EmergencyResponsePage`
- **風險**: 中 (需確認無獨特功能)

**檢查命令**:

```powershell
# 檢查是否被路由引用
Select-String -Path "web-dashboard/src/App.tsx" -Pattern "CommandPostMapPage"
```

---

### Dead Code (未使用的檔案)

#### DTOs 重複檢查

```typescript
// 需檢查是否有未被 Controller 引用的 DTO
// 例如：
// - modules/*/dto/*.dto.ts 但無對應 @Body() 使用
```

**掃描腳本**:

```powershell
# 找出所有 DTO
Get-ChildItem -Recurse -Filter "*.dto.ts" | ForEach-Object {
  $dtoName = $_.BaseName
  # 檢查是否在 controller 中被引用
  $usage = Select-String -Path "**/*.controller.ts" -Pattern $dtoName
  if (-not $usage) {
    Write-Host "Unused DTO: $($_.FullName)"
  }
}
```

---

## 📦 需封存清單

### 後端模組

#### 1. `mock-data/`

- **原因**: 開發時使用，生產環境不需要
- **建議**: 移至 `test/fixtures/` 或單獨 git branch
- **風險**: 低

#### 2. `swagger-auto-docs/`

- **原因**: 開發工具，非核心功能
- **建議**: 封存但保留 (開發環境使用)
- **風險**: 低

---

## 🔄 需遷移清單

### Entities 合併

#### 1. Resources 模組簡化 (Week 6 執行)

**合併計劃**:

```typescript
// 現有 40+ entities → 簡化為 20 個核心

// === 可合併 ===
Lot + ResourceBatch → ResourceBatch (統一批次管理)
Asset + Equipment → Asset (統一資產)
DonationSource + Warehouse → StorageLocation (統一來源)

// === 保留核心 ===
Resource (物資主檔)
ResourceTransaction (交易流水)
Warehouse (倉庫)
StorageLocation (儲位)
InventoryAudit (稽核)
DispatchOrder (調撥)

// === 可移除 ===
LabelTemplate (改為配置檔)
LabelPrintLog (移至 audit-log)
SensitiveReadLog (移至 audit-log)
```

**Migration 設計**:

```typescript
// migrations/1705123456-simplify-resources.ts
export class SimplifyResources1705123456 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 合併 lot → resource_batch
    await queryRunner.query(`
      INSERT INTO resource_batch (id, resource_id, quantity, batch_number, created_at)
      SELECT id, resource_id, quantity, lot_number, created_at FROM lot
    `);
    
    // 2. 刪除舊表
    await queryRunner.dropTable('lot');
    
    // 3. 合併 asset + equipment
    // ...
  }
  
  async down(queryRunner: QueryRunner): Promise<void> {
    // 回滾邏輯
  }
}
```

**風險**: 中高 (需完整測試)

---

#### 2. 通知模組整合 ✅ **已完成**

- `notification/` 服務已被 `notifications/` 使用
- 狀態：Facade pattern 已實作
- 剩餘：可考慮刪除獨立的 `notification/` 資料夾

---

#### 3. 地圖頁面整合 ✅ **已完成**

- `MapPage` + `TacticalMapPage` 已統一至 `/geo/map`
- 狀態：路由已合併

---

## 🚨 高風險欄位與常數

### Enum 一致性檢查

#### 問題：多處定義的狀態碼

**發現**:

```typescript
// reports.entity.ts
export enum ReportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

// events.entity.ts  
export enum EventStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

// tasks.entity.ts
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress', 
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
```

**風險**: 狀態碼不一致導致流程錯誤

**建議**: 統一至 `common/enums/status.enum.ts`

```typescript
// common/enums/status.enum.ts
export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

// 各模組引用統一 enum
```

**Migration**:

```sql
-- 需檢查現有資料是否符合新 enum
SELECT DISTINCT status FROM reports;
SELECT DISTINCT status FROM events;
SELECT DISTINCT status FROM tasks;
```

---

### 角色碼一致性

**問題**: Level (0-5) vs Role (string)

**現況**:

```typescript
// auth/permission-level.enum.ts
export enum PermissionLevel {
  Anonymous = 0,
  Volunteer = 1,
  Supervisor = 2,
  Manager = 3,
  Admin = 4,
  Owner = 5
}

// 但部分地方使用 string
account.role = '志工' // ❌ 不一致
```

**建議**: 全面使用 `PermissionLevel` enum

---

## 📋 DB 欄位清理

### 未使用欄位掃描

**需檢查的表**:

```sql
-- 檢查近 30 天未更新的欄位（可能已廢棄）
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%_deprecated%'
  OR column_name LIKE '%_legacy%';
```

### 建議新增欄位

**軟刪除統一**:

```typescript
// 為核心 Entity 新增 deletedAt
@DeleteDateColumn()
deletedAt?: Date;

// 需新增的表：
// - reports
// - events  
// - tasks
// - mission_sessions
// - volunteers
```

**Migration**:

```sql
ALTER TABLE reports ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP;
-- ...

-- 更新既有軟刪邏輯（如果有 is_deleted 欄位）
UPDATE reports SET deleted_at = updated_at WHERE is_deleted = true;
ALTER TABLE reports DROP COLUMN is_deleted;
```

---

## 🔍 Dead Code 掃描結果

### 未引用的 Service

**掃描方法**:

```bash
# 找出所有 service
find . -name "*.service.ts" | while read service; do
  serviceName=$(basename "$service" .service.ts)
  # 檢查是否被 module 引用
  if ! grep -r "$serviceName" --include="*.module.ts" >/dev/null; then
    echo "Unused service: $service"
  fi
done
```

**已識別**:

- `modules/notification/services/push-notification.service.ts` - 被 `notifications/` 使用 ✅
- 其他需實際掃描確認

---

### 未引用的 Controller

**掃描命令**:

```powershell
# 檢查 Controller 是否在 module 中註冊
Get-ChildItem -Recurse -Filter "*.controller.ts" | ForEach-Object {
  $controllerName = $_.BaseName
  $modulePath = $_.DirectoryName + "/*.module.ts"
  if (-not (Select-String -Path $modulePath -Pattern $controllerName)) {
    Write-Host "Orphan controller: $($_.FullName)"
  }
}
```

---

## 📊 清理執行計劃

### Phase 1: 安全刪除 (Week 2)

| # | 項目 | 風險 | 工時 |
|:-:|------|:----:|:----:|
| 1 | 刪除 8 個 AR/VR 模組 | 低 | 2h |
| 2 | 清理 app.module.ts imports | 低 | 1h |
| 3 | 驗證 build 通過 | 低 | 0.5h |

**回滾方案**: Git revert

---

### Phase 2: 封存處理 (Week 6)

| # | 項目 | 風險 | 工時 |
|:-:|------|:----:|:----:|
| 1 | 移動 mock-data 至 test/ | 低 | 1h |
| 2 | 確認 swagger-auto-docs 使用方式 | 低 | 0.5h |

---

### Phase 3: 資料遷移 (Week 6-7)

| # | 項目 | 風險 | 工時 |
|:-:|------|:----:|:----:|
| 1 | Resources 簡化 Migration | 高 | 8h |
| 2 | 統一 Status Enum | 中 | 4h |
| 3 | 新增 deletedAt 欄位 | 中 | 3h |
| 4 | 測試與驗證 | 高 | 4h |

**回滾方案**:

- 保留舊 entities 1 個月
- Migration down 腳本完整
- 生產環境先建立 DB snapshot

---

## ✅ 清理驗收標準

### 後端

- [ ] 模組數量 175 → 167 (-8)
- [ ] Entities < 90 個
- [ ] 所有 build 通過
- [ ] E2E 測試通過
- [ ] Migration up/down 測試通過

### 前端

- [ ] 頁面 109 → 107 (-2)
- [ ] 無 404 broken links
- [ ] Routing 正常

### 資料庫

- [ ] 所有表都有 deletedAt (核心表)
- [ ] Enum 統一使用
- [ ] 無孤立欄位

---

## 🚨 風險清單

| 風險 | 機率 | 影響 | 緩解 |
|------|:----:|:----:|------|
| Resources 遷移破壞現有功能 | M | H | 完整測試覆蓋 + Snapshot |
| Enum 統一導致歷史資料不符 | L | M | Migration 前完整掃描 |
| 刪除模組後 import 遺漏 | L | L | TypeScript compiler 會報錯 |

---

**下一份文件**: Security & Governance (E)

# 安全與治理 (Security & Governance)

> **產出日期**: 2026-01-13  
> **目的**: RBAC/IDOR/審計軌跡/資料保護/資安基線強化

---

## 🎯 安全治理總覽

| 領域 | 目前狀態 | 目標狀態 | 缺口 |
|------|:--------:|:--------:|:----:|
| **RBAC (權限控制)** | 60% | 95% | 9 項 |
| **IDOR 防護** | 40% | 90% | 6 項 |
| **審計軌跡** | 70% | 95% | 4 項 |
| **資料保護** | 50% | 90% | 7 項 |
| **操作留痕** | 65% | 95% | 3 項 |
| **刪除策略** | 40% | 90% | 5 項 |
| **資安基線** | 75% | 95% | 8 項 |

---

## 🔐 RBAC (Role-Based Access Control)

### 當前權限模型

```typescript
// auth/permission-level.enum.ts
export enum PermissionLevel {
  Anonymous = 0,     // 未登入訪客
  Volunteer = 1,     // 一般志工
  Supervisor = 2,    // 督導/組長
  Manager = 3,       // 幹部/管理者
  Admin = 4,         // 系統管理員
  Owner = 5          // 理事長/系統擁有者
}
```

### Guard 覆蓋率分析

**已套用 Guard 的 Controllers** (✅):

```typescript
// reports.controller.ts
@UseGuards(UnifiedRolesGuard)
@RequireLevel(PermissionLevel.Volunteer)
export class ReportsController { }

// webhooks-admin.controller.ts
@UseGuards(UnifiedRolesGuard)
@RequireLevel(PermissionLevel.Admin)
export class WebhooksAdminController { }

// resources.controller.ts
@UseGuards(UnifiedRolesGuard, ResourceOwnerGuard)
export class ResourcesController { }
```

**未套用 Guard 的 Controllers** (❌):

| Controller | 風險等級 | 影響 |
|-----------|:--------:|------|
| `task-dispatch.controller` | 🔴 H | 任何人可派遣任務 |
| `aar-analysis.controller` | 🟡 M | 復盤資料可被任意存取 |
| `biometric-auth.controller` | 🔴 H | 生物辨識端點無保護 |
| `audit-log.controller` | 🔴 H | 稽核日誌可被竄改 |
| `weather-hub.controller` | 🟢 L | 公開資料，低風險 |

**修補建議**:

```typescript
// task-dispatch.controller.ts
import { UseGuards } from '@nestjs/common';
import { UnifiedRolesGuard } from '../shared/guards/unified-roles.guard';
import { RequireLevel } from '../shared/decorators/require-level.decorator';
import { PermissionLevel } from '../auth/permission-level.enum';

@Controller('task-dispatch')
@UseGuards(UnifiedRolesGuard)  // ← 新增
@RequireLevel(PermissionLevel.Supervisor)  // ← 新增 (最低 Level 2)
export class TaskDispatchController {
  
  @Post('assign')
  @RequireLevel(PermissionLevel.Supervisor)  // 派遣需 L2
  async assignTask() { }
  
  @Post('auto-dispatch')
  @RequireLevel(PermissionLevel.Manager)  // 自動派遣需 L3
  async autoDispatch() { }
}
```

---

### RBAC 缺口與修補

#### 缺口 1: 部分端點無權限檢查

**工時**: 8h (Week 1)

**檢查腳本**:

```powershell
# 掃描所有 Controller，找出未使用 @UseGuards 的
Get-ChildItem -Recurse -Filter "*.controller.ts" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  if ($content -match '@Controller' -and $content -notmatch '@UseGuards') {
    Write-Host "Missing guard: $($_.FullName)"
  }
}
```

**修補清單**:

| Controller | 建議 minLevel | 工時 |
|-----------|:-------------:|:----:|
| task-dispatch | L2 (Supervisor) | 1h |
| aar-analysis | L3 (Manager) | 1h |
| biometric-auth | L4 (Admin) | 1h |
| audit-log | L4 (Admin) | 1h |
| tactical-maps | L1 (Volunteer) | 0.5h |
| social-media-monitor | L3 (Manager) | 0.5h |

---

#### 缺口 2: 細粒度權限控制不足

**影響**: 志工可能看到不該看的資料

**案例**:

```typescript
// ❌ 問題：任何 Volunteer 都能查詢所有志工資料
@Get()
@RequireLevel(PermissionLevel.Volunteer)
async findAll() {
  return this.volunteersService.findAll();  // 回傳所有志工
}

// ✅ 改進：根據 roleLevel 限制查詢範圍
@Get()
@RequireLevel(PermissionLevel.Volunteer)
async findAll(@CurrentUser() user: Account) {
  if (user.roleLevel < PermissionLevel.Supervisor) {
    // L1 志工僅能看自己
    return this.volunteersService.findOne(user.id);
  } else {
    // L2+ 可看所有志工
    return this.volunteersService.findAll();
  }
}
```

**工時**: 6h (Week 2)

---

## 🛡️ IDOR (Insecure Direct Object Reference) 防護

### 當前防護狀況

**已實作 IDOR 防護** (✅):

```typescript
// resources.controller.ts
@UseGuards(ResourceOwnerGuard)
@Patch(':id')
async update(@Param('id') id: string, @CurrentUser() user: Account) {
  // ResourceOwnerGuard 驗證 user 是否為資源擁有者
  return this.resourcesService.update(id, data);
}
```

**未實作 IDOR 防護** (❌):

| 端點 | 風險 | 攻擊場景 |
|------|:----:|----------|
| `PATCH /volunteers/:id` | 🔴 H | 志工 A 可修改志工 B 的資料 |
| `DELETE /reports/:id` | 🔴 H | 任何人可刪除他人通報 |
| `PUT /tasks/:id` | 🟡 M | 志工可修改他人任務 |
| `GET /mission-sessions/:id` | 🟡 M | 可查看其他組織的任務場次 |

---

### IDOR 修補方案

#### 方案 1: ResourceOwnerGuard 擴充

**建立通用 Guard**:

```typescript
// common/guards/ownership.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const OWNERSHIP_CHECK_KEY = 'ownershipCheck';

export interface OwnershipConfig {
  entity: string;           // 'Volunteer', 'Report', 'Task'
  ownerField: string;       // 'accountId', 'createdBy', 'assignedTo'
  allowRoles?: number[];    // 允許跳過檢查的 roleLevel
}

export const CheckOwnership = (config: OwnershipConfig) => 
  SetMetadata(OWNERSHIP_CHECK_KEY, config);

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<OwnershipConfig>(
      OWNERSHIP_CHECK_KEY,
      context.getHandler(),
    );
    
    if (!config) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;
    
    // Admin 以上可跳過
    if (config.allowRoles && config.allowRoles.includes(user.roleLevel)) {
      return true;
    }
    
    // 檢查資源擁有者
    const repository = this.dataSource.getRepository(config.entity);
    const resource = await repository.findOne({ where: { id: resourceId } });
    
    if (!resource) {
      throw new ForbiddenException('Resource not found');
    }
    
    if (resource[config.ownerField] !== user.id) {
      throw new ForbiddenException('You do not own this resource');
    }
    
    return true;
  }
}
```

**使用範例**:

```typescript
// volunteers.controller.ts
@Patch(':id')
@UseGuards(UnifiedRolesGuard, OwnershipGuard)
@CheckOwnership({
  entity: 'Volunteer',
  ownerField: 'accountId',
  allowRoles: [PermissionLevel.Supervisor, PermissionLevel.Manager, PermissionLevel.Admin, PermissionLevel.Owner]
})
async update(@Param('id') id: string) { }
```

**工時**: 12h (Week 2-3)

---

## 📜 審計軌跡 (Audit Trail)

### 當前審計覆蓋率

**已實作審計**:

- ✅ `audit-log` 模組存在
- ✅ 敏感操作有記錄 (`resources/sensitive-read-log`)
- ⚠️ 但未全面覆蓋

**審計缺口**:

| 操作類型 | 目前狀況 | 建議 |
|----------|:--------:|------|
| 權限變更 | ❌ 無 | 需審計 |
| 資料修改 | ⚠️ 部分 | 全面覆蓋 |
| 資料刪除 | ❌ 無 | 需審計 |
| 敏感查詢 | ✅ 有 | 維持 |
| IAP 簽核 | ❌ 無 | 需審計 |
| 任務派遣 | ❌ 無 | 需審計 |

---

### 審計強化方案

#### 方案: 全域 Audit Interceptor

```typescript
// common/interceptors/audit.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../modules/audit-log/audit-log.service';

const AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditLogService: AuditLogService) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, params } = request;
    
    // 僅審計變更操作
    if (!AUDITED_METHODS.includes(method)) {
      return next.handle();
    }
    
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap({
        next: (response) => {
          this.auditLogService.log({
            userId: user?.id,
            action: `${method} ${url}`,
            resourceType: this.extractResourceType(url),
            resourceId: params.id,
            changes: body,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            duration: Date.now() - startTime,
            status: 'success',
          });
        },
        error: (error) => {
          this.auditLogService.log({
            userId: user?.id,
            action: `${method} ${url}`,
            resourceType: this.extractResourceType(url),
            resourceId: params.id,
            changes: body,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            duration: Date.now() - startTime,
            status: 'failed',
            errorMessage: error.message,
          });
        }
      })
    );
  }
  
  private extractResourceType(url: string): string {
    const match = url.match(/\/api\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }
}
```

**註冊為全域 Interceptor**:

```typescript
// app.module.ts
{
  provide: APP_INTERCEPTOR,
  useClass: AuditInterceptor,
}
```

**工時**: 8h (Week 3)

---

## 🔒 資料保護

### 敏感資料清單

| 資料類型 | Entity/欄位 | 當前保護 | 建議 |
|----------|------------|:--------:|------|
| 身分證字號 | `volunteers.nationalId` | ❌ 明文 | 加密 + 遮罩 |
| 電話號碼 | `volunteers.phone`, `emergencyContactPhone` | ❌ 明文 | 遮罩 |
| 地址 | `volunteers.address` | ❌ 明文 | 遮罩 |
| GPS 座標 | `volunteers.lastLocation` | ⚠️ 部分 | 精度降低 |
| 照片 URL | `reports.photos` | ❌ 公開 | 簽名 URL |

---

### 敏感資料遮罩實作

#### 方案: Sensitive Data Interceptor

```typescript
// common/interceptors/sensitive-data.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

const SENSITIVE_FIELDS = {
  nationalId: (val: string) => val ? `${val.substring(0, 3)}****${val.substring(7)}` : null,
  phone: (val: string) => val ? `${val.substring(0, 4)} *** ***` : null,
  address: (val: string) => val ? val.split(' ')[0] + ' (隱藏)' : null,
  emergencyContactPhone: (val: string) => val ? `09** *** ***` : null,
};

@Injectable()
export class SensitiveDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return next.handle().pipe(
      map(data => {
        // Level < 3 需遮罩
        if (!user || user.roleLevel < 3) {
          return this.maskSensitiveData(data);
        }
        return data;
      })
    );
  }
  
  private maskSensitiveData(data: any): any {
    if (!data) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }
    
    if (typeof data === 'object') {
      const masked = { ...data };
      
      for (const [field, maskFn] of Object.entries(SENSITIVE_FIELDS)) {
        if (masked[field]) {
          masked[field] = maskFn(masked[field]);
        }
      }
      
      return masked;
    }
    
    return data;
  }
}
```

**工時**: 10h (Week 2)

---

### 照片/影片防竄改

**目前問題**:

- 上傳後僅存 URL
- 無 hash 驗證
- 可能被替換或刪除

**解決方案**:

```typescript
// uploads/uploads.service.ts
import * as crypto from 'crypto';
import * as fs from 'fs';

async uploadFile(file: Express.Multer.File): Promise<Upload> {
  // 1. 計算 SHA-256
  const fileBuffer = fs.readFileSync(file.path);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  
  // 2. 上傳至 Cloud Storage (或本地)
  const url = await this.storageService.upload(file);
  
  // 3. 存入資料庫
  const upload = this.uploadRepository.create({
    filename: file.originalname,
    url,
    hash,                    // ← 新增
    size: file.size,
    mimeType: file.mimetype,
    uploadedBy: user.id,
    uploadedAt: new Date(),
  });
  
  return this.uploadRepository.save(upload);
}

async verifyIntegrity(uploadId: string): Promise<boolean> {
  const upload = await this.uploadRepository.findOne({ where: { id: uploadId } });
  
  // 重新下載檔案並計算 hash
  const fileBuffer = await this.storageService.download(upload.url);
  const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  
  return currentHash === upload.hash;
}
```

**Migration**:

```sql
ALTER TABLE uploads ADD COLUMN hash VARCHAR(64);
ALTER TABLE uploads ADD INDEX idx_hash (hash);
```

**工時**: 6h (Week 3)

---

## 🗑️ 刪除策略統一

### 當前問題

- 部分 Entity 硬刪 (真刪除)
- 部分 Entity 軟刪 (`deletedAt`)
- 不一致導致資料追蹤困難

### 統一策略

**規則**:

```typescript
// 核心業務資料：軟刪除
const SOFT_DELETE_ENTITIES = [
  'Report',
  'Event',
  'Task',
  'MissionSession',
  'Volunteer',
  'Resource',
  'FieldReport',
];

// 輔助資料：硬刪除
const HARD_DELETE_ENTITIES = [
  'AccessLog',
  'NotificationDeliveryLog',
  'WebhookDeliveryLog',
  'TempFile',
];
```

**實作**:

```typescript
// Base Entity (所有核心 Entity 繼承)
export abstract class SoftDeletableEntity {
  @DeleteDateColumn()
  deletedAt?: Date;
  
  @Column({ nullable: true })
  deletedBy?: string;
}

// 使用範例
@Entity()
export class Report extends SoftDeletableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  // ...
}
```

**Restore API**:

```typescript
// reports.controller.ts
@Post(':id/restore')
@UseGuards(UnifiedRolesGuard)
@RequireLevel(PermissionLevel.Admin)
async restore(@Param('id') id: string) {
  return this.reportsService.restore(id);
}

// reports.service.ts
async restore(id: string): Promise<Report> {
  await this.repository.restore(id);  // TypeORM restore
  return this.repository.findOne({ where: { id }, withDeleted: true });
}
```

**工時**: 8h (Week 3)

---

## 🌐 資安基線 (Security Baseline)

### CORS 配置

**當前狀態** (開發模式):

```typescript
// main.ts
app.enableCors({
  origin: '*',  // ❌ 過於寬鬆
  credentials: true,
});
```

**生產環境建議**:

```typescript
// main.ts
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://lightkeepers.org.tw', 'https://app.lightkeepers.org.tw']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.enableCors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**工時**: 2h (Week 9)

---

### CSP (Content Security Policy)

**建議 Header**:

```typescript
// common/middleware/security-headers.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // CSP
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://apis.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "connect-src 'self' https://api.line.me https://generativelanguage.googleapis.com;"
    );
    
    // Other security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    next();
  }
}
```

**工時**: 2h (Week 9)

---

### Rate Limiting 細化

**當前狀態**:

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 10 },
  { name: 'long', ttl: 60000, limit: 100 },
])
```

**細化建議**:

```typescript
// 敏感端點獨立限流
@UseGuards(ThrottlerGuard)
@Throttle({ short: { ttl: 60000, limit: 5 } })  // 1 分鐘 5 次
@Post('login')
async login() { }

@Throttle({ short: { ttl: 60000, limit: 3 } })  // 1 分鐘 3 次
@Post('forgot-password')
async forgotPassword() { }

@Throttle({ short: { ttl: 1000, limit: 30 } })  // 1 秒 30 次
@Post('reports')  // 緊急通報允許較高頻率
async createReport() { }
```

**工時**: 4h (Week 9)

---

## 🚨 高風險端點清單

| 端點 | 風險 | 攻擊向量 | 修補建議 | 優先度 |
|------|:----:|----------|----------|:------:|
| `POST /task-dispatch/assign` | 🔴 | 無權限檢查 | 加 Guard + L2 | P0 |
| `DELETE /reports/:id` | 🔴 | IDOR | 加 Ownership Guard | P0 |
| `PATCH /volunteers/:id` | 🔴 | IDOR | 加 Ownership Guard | P0 |
| `POST /audit-log` | 🔴 | 日誌竄改 | 加 L4 Guard | P0 |
| `GET /volunteers` | 🟡 | 資料外洩 | 遮罩敏感欄位 | P1 |
| `POST /webhooks/:id/test` | 🟡 | SSRF | 驗證 URL whitelist | P1 |
| `POST /uploads` | 🟡 | 檔案炸彈 | 檔案大小+類型限制 | P1 |

---

## ✅ 安全檢查清單 (Checklist)

### Week 1-2

- [ ] 所有 Controller 加上 `@UseGuards`
- [ ] 高風險端點加上 minLevel 限制
- [ ] 實作 OwnershipGuard
- [ ] 敏感資料 Interceptor

### Week 3

- [ ] 全域 Audit Interceptor
- [ ] 照片 hash 驗證機制
- [ ] 軟刪除統一實作
- [ ] Restore API

### Week 9

- [ ] CORS 白名單
- [ ] CSP Header
- [ ] Rate Limiting 細化
- [ ] Security Headers Middleware

### 上線前

- [ ] 安全測試 (OWASP Top 10)
- [ ] 滲透測試報告
- [ ] 敏感資料掃描
- [ ] API 權限矩陣文件

---

## 📊 安全成熟度評分

| 項目 | 當前 | 目標 | 差距 |
|------|:----:|:----:|:----:|
| 認證機制 | 85% | 95% | +10% |
| 授權控制 | 60% | 95% | +35% |
| 資料保護 | 50% | 90% | +40% |
| 審計軌跡 | 70% | 95% | +25% |
| 輸入驗證 | 80% | 95% | +15% |
| 錯誤處理 | 75% | 90% | +15% |
| 加密傳輸 | 90% | 95% | +5% |
| 會話管理 | 85% | 95% | +10% |

**總分**: 74% → **91%** (目標)

---

**稽核完成**！6 份文件已產出。

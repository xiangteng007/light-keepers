---
name: nestjs-module
description: 創建 NestJS 模組，包含 Controller、Service、Module 和 DTOs
---

# NestJS Module Skill

創建標準 NestJS 模組結構。

## 標準模組結構

```
backend/src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── dto/
│   └── <module-name>.dto.ts
├── entities/
│   └── <module-name>.entity.ts
└── interfaces/
    └── <module-name>.interface.ts
```

## 創建步驟

### 1. Module 檔案

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleNameController } from './module-name.controller';
import { ModuleNameService } from './module-name.service';
import { ModuleNameEntity } from './entities/module-name.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ModuleNameEntity])],
    controllers: [ModuleNameController],
    providers: [ModuleNameService],
    exports: [ModuleNameService],
})
export class ModuleNameModule {}
```

### 2. Controller 檔案

- 使用 `@Controller('route-path')` 裝飾器
- 加入 `@ApiTags()` for Swagger
- 保護路由使用 `@UseGuards()` 或全域 Guard

### 3. Service 檔案

- 注入 Repository
- 實作 CRUD 操作
- 加入業務邏輯

### 4. Entity 檔案

- 使用 TypeORM 裝飾器
- 定義關聯

## 安全注意事項

- 預設所有路由受 GlobalAuthGuard 保護
- 公開路由需加 `@Public()` 裝飾器
- 公開路由需加 `@Throttle()` 限流
- 需加入 `docs/policy/public-surface.policy.json` allowlist

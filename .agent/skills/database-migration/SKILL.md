---
name: database-migration
description: 創建和執行 TypeORM 資料庫遷移，管理 schema 變更
---

# Database Migration Skill

管理 TypeORM 資料庫遷移。

## 創建遷移

### 自動生成（從 Entity 變更）

```bash
cd backend
npm run migration:generate -- src/migrations/DescriptiveName
```

### 手動創建空白遷移

```bash
cd backend
npm run migration:create -- src/migrations/DescriptiveName
```

## 執行遷移

### 運行所有待執行遷移

```bash
npm run migration:run
```

### 回滾上一次遷移

```bash
npm run migration:revert
```

### 查看遷移狀態

```bash
npm run migration:show
```

## 遷移檔案結構

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class DescriptiveName1234567890 implements MigrationInterface {
    name = 'DescriptiveName1234567890';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 升級操作
        await queryRunner.query(`ALTER TABLE ...`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 回滾操作
        await queryRunner.query(`ALTER TABLE ...`);
    }
}
```

## 最佳實踐

1. **命名規範**: 使用描述性名稱，如 `AddUserEmailIndex`
2. **原子性**: 每個遷移只做一件事
3. **可回滾**: 確保 `down()` 方法正確實作
4. **測試**: 在開發環境先測試遷移
5. **備份**: 生產環境執行前先備份資料庫

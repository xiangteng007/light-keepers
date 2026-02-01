/**
 * Infrastructure Core Module - 基礎設施
 * 
 * 整合模組: database, health, cache, files, metrics
 * 
 * 職責:
 * - 資料庫連線管理
 * - 快取服務
 * - 檔案存儲
 * - 健康檢查
 * - 系統監控
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../modules/database/database.module';
import { HealthModule } from '../../modules/health/health.module';
import { FilesModule } from '../../modules/files/files.module';
import { MetricsModule } from '../../modules/metrics/metrics.module';

@Module({
    imports: [
        DatabaseModule.forRoot(),
        HealthModule,
        FilesModule,
        MetricsModule,
    ],
    exports: [HealthModule, FilesModule, MetricsModule],
})
export class InfrastructureCoreModule { }


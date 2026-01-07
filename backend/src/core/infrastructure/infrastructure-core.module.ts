/**
 * Infrastructure Core Module - 基礎設施
 * 
 * 整合模組: database, health, cache, redis-cache, uploads,
 *           file-upload, files, mock-data, i18n-api, swagger-auto-docs,
 *           offline-sync, offline-mesh, mobile-sync, device-management,
 *           media-streaming
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
import { UploadsModule } from '../../modules/uploads/uploads.module';
import { MetricsModule } from '../../modules/metrics/metrics.module';

@Module({
    imports: [
        DatabaseModule.forRoot(),
        HealthModule,
        UploadsModule,
        MetricsModule,
        // 未來整合: CacheModule, I18nModule, etc.
    ],
    exports: [HealthModule, UploadsModule, MetricsModule],
})
export class InfrastructureCoreModule { }

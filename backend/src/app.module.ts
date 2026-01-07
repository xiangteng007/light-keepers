import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './modules/database/database.module';
import { SharedAuthModule } from './modules/shared/shared-auth.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { EventsModule } from './modules/events/events.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NcdrAlertsModule } from './modules/ncdr-alerts/ncdr-alerts.module';
import { PublicResourcesModule } from './modules/public-resources/public-resources.module';
import { PublicModule } from './modules/public/public.module';
import { ManualsModule } from './modules/manuals/manuals.module';
import { ReportsModule } from './modules/reports/reports.module';
import { VolunteersModule } from './modules/volunteers/volunteers.module';
import { TrainingModule } from './modules/training/training.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReportsExportModule } from './modules/reports-export/reports-export.module';
import { LineBotModule } from './modules/line-bot/line-bot.module';
import { AccessLogModule } from './modules/access-log/access-log.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { MenuConfigModule } from './modules/menu-config/menu-config.module';
import { WeatherForecastModule } from './modules/weather-forecast/weather-forecast.module';
import { DonationsModule } from './modules/donations/donations.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { CommunityModule } from './modules/community/community.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { BackupModule } from './modules/backup/backup.module';
import { TenantModule } from './modules/tenants/tenant.module';
// PR3: 核心 E2E 模組
import { MissionSessionsModule } from './modules/mission-sessions/mission-sessions.module';
import { FieldReportsModule } from './modules/field-reports/field-reports.module';
import { OverlaysModule } from './modules/overlays/overlays.module';
// PR4: 觀測性模組
import { MetricsModule } from './modules/metrics/metrics.module';
// PR5: 重構模組
import { WeatherHubModule } from './modules/weather-hub/weather-hub.module';
// PR6: P1 缺失模組 (E2E 閉環必需)
import { TriageModule } from './modules/triage/triage.module';
import { LocationModule } from './modules/location/location.module';
import { TaskDispatchModule } from './modules/task-dispatch/task-dispatch.module';
// Core Domains 聚合模組
import { CoreDomainsModule } from './core/core-domains.module';
// ==============================================
// Batch 2: E2E Closed Loop Modules
// ==============================================
// P1 Modules
import { EquipmentModule } from './modules/equipment/equipment.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { VoiceModule } from './modules/voice/voice.module';
import { OrgChartModule } from './modules/org-chart/org-chart.module';
import { AiQueueModule } from './modules/ai-queue/ai-queue.module';
// P2 Modules
import { ShiftCalendarModule } from './modules/shift-calendar/shift-calendar.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { FeaturesModule } from './modules/features/features.module';
import { FilesModule } from './modules/files/files.module';
import { AuditModule } from './modules/audit/audit.module';
import { CacheModule as AppCacheModule } from './modules/cache/cache.module';
import { ErrorTrackingModule } from './modules/error-tracking/error-tracking.module';
import { PrometheusModule } from './modules/prometheus/prometheus.module';
import { CloudLoggerService } from './common/services/cloud-logger.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        // 排程模組 (NCDR 自動同步)
        ScheduleModule.forRoot(),

        // Rate Limiting (API Gateway)
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000,   // 1秒
                limit: 10,   // 最多10請求
            },
            {
                name: 'long',
                ttl: 60000,  // 1分鐘
                limit: 100,  // 最多100請求
            },
        ]),

        // Cloud SQL 連線 - 條件式初始化
        // 當 DB_REQUIRED=false 時，完全跳過 TypeORM 和 database 依賴
        DatabaseModule.forRoot(),

        // 共用認證模組 (Global)
        SharedAuthModule,

        // 功能模組
        HealthModule,
        AuthModule,
        AccountsModule,
        EventsModule,
        TasksModule,
        NcdrAlertsModule,
        PublicResourcesModule,
        PublicModule, // 🌐 Level0 公開端點
        ManualsModule,
        ReportsModule,
        VolunteersModule,
        TrainingModule,
        NotificationsModule,
        ResourcesModule,
        RealtimeModule,
        ReportsExportModule,
        LineBotModule,
        AccessLogModule, // 🔐 存取日誌
        UploadsModule,   // 📁 檔案上傳
        MenuConfigModule, // 📋 選單設定
        WeatherForecastModule, // ☁️ 氣象預報
        DonationsModule, // 💰 捐款系統
        AnnouncementsModule, // 📢 公告系統
        ActivitiesModule, // 📅 活動報名
        CommunityModule, // 💬 社群牆
        AnalyticsModule, // 📊 AI 趨勢預測
        IntegrationsModule, // 🔗 外部 API 整合
        BackupModule, // 💾 數據備份
        TenantModule, // 🏢 多租戶
        // PR3: 緊急應變核心模組
        MissionSessionsModule, // 🚨 任務場次 (ICS C2)
        FieldReportsModule, // 📡 現場回報 (GPS)
        OverlaysModule, // 🗺️ 戰術地圖圖層
        // PR4: 觀測性
        MetricsModule, // 📊 API 效能監控
        // PR5: 重構整併
        WeatherHubModule, // 🌤️ 氣象整合中心
        // PR6: P1 缺失模組 (E2E 閉環必需)
        TriageModule, // 🏥 檢傷分類 (START)
        LocationModule, // 📍 地理圍欄服務
        TaskDispatchModule, // 🔄 智慧任務派遣
        // Core Domains 聚合
        CoreDomainsModule, // 🏛️ 核心領域聚合
        // ==============================================
        // Batch 2: E2E Closed Loop Modules
        // ==============================================
        // P1 Modules
        EquipmentModule, // 🔧 裝備管理
        AttendanceModule, // 📋 出勤簽到
        SchedulerModule, // 📅 排程服務
        VoiceModule, // 🎙️ 語音通訊
        OrgChartModule, // 🏢 組織架構
        AiQueueModule, // 🤖 AI 任務佇列
        // P2 Modules
        ShiftCalendarModule, // 📆 班表日曆
        PayrollModule, // 💰 薪資計算
        FeaturesModule, // 🎛️ 功能開關
        FilesModule, // 📁 檔案管理
        AuditModule, // 📝 稽核日誌
        AppCacheModule, // ⚡ 快取服務
        ErrorTrackingModule, // 🐛 錯誤追蹤
        PrometheusModule, // 📊 Prometheus 監控
    ],
    providers: [
        CloudLoggerService,
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter,
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
    exports: [CloudLoggerService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggingMiddleware)
            .forRoutes('*');
    }
}

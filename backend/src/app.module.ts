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
import { MissionSessionsModule } from './modules/mission-sessions/mission-sessions.module';
import { OverlaysModule } from './modules/overlays/overlays.module'; // 🗺️ 戰術地圖模組
import { FieldReportsModule } from './modules/field-reports/field-reports.module'; // 📡 即時回報系統
import { AiQueueModule } from './modules/ai-queue/ai-queue.module'; // 🤖 AI 隊列平台
import { AuditModule } from './modules/audit/audit.module'; // 🔒 稽核日誌
import { CacheModule } from './modules/cache/cache.module'; // 🚀 快取服務
import { ErrorTrackingModule } from './modules/error-tracking/error-tracking.module'; // 📊 錯誤追蹤
import { SystemModule } from './modules/system/system.module'; // ⚙️ 系統管理
import { LocationModule } from './modules/location/location.module'; // 📍 地理圍欄
import { SchedulerModule } from './modules/scheduler/scheduler.module'; // ⏰ 排程任務
import { MetricsModule } from './modules/metrics/metrics.module'; // 📈 API 指標
import { WebhooksModule } from './modules/webhooks/webhooks.module'; // 🔗 Webhooks
import { FeaturesModule } from './modules/features/features.module'; // 🚩 Feature Flags
import { FilesModule } from './modules/files/files.module'; // 📁 檔案管理
// v2.0 擴充模組
import { DrillSimulationModule } from './modules/drill-simulation/drill-simulation.module'; // 🎮 演練模擬
import { OfflineMeshModule } from './modules/offline-mesh/offline-mesh.module'; // 📡 離線網狀
import { PsychologicalSupportModule } from './modules/psychological-support/psychological-support.module'; // ❤️ 心理支持
import { IntegrityLedgerModule } from './modules/integrity-ledger/integrity-ledger.module'; // 🔗 責信區塊鏈
// v3.0 擴充模組
import { TriageModule } from './modules/triage/triage.module'; // 🏥 E-Triage 檢傷
import { VoiceModule } from './modules/voice/voice.module'; // 🎤 語音轉錄
import { RoutingModule } from './modules/routing/routing.module'; // 🛣️ 路徑規劃
import { ReunificationModule } from './modules/reunification/reunification.module'; // 🔍 災民協尋
import { EquipmentModule } from './modules/equipment/equipment.module'; // 📦 設備管理
import { TacticalMapsModule } from './modules/tactical-maps/tactical-maps.module'; // 🗺️ 3D 戰術
import { IndoorPositioningModule } from './modules/indoor-positioning/indoor-positioning.module'; // 📍 室內定位
import { DroneOpsModule } from './modules/drone-ops/drone-ops.module'; // 🛸 無人機
import { SpectrumAnalysisModule } from './modules/spectrum-analysis/spectrum-analysis.module'; // 📡 頻譜分析
// v3.0 擴展模組
import { NfcModule } from './modules/nfc/nfc.module'; // 📲 NFC 手環
import { QrScannerModule } from './modules/qr-scanner/qr-scanner.module'; // 📷 QR 掃描
import { PttModule } from './modules/ptt/ptt.module'; // 🎙️ PTT 對講機
import { OfflineTilesModule } from './modules/offline-tiles/offline-tiles.module'; // 🗺️ 離線地圖
// v3.0 中期擴展
import { Cesium3dModule } from './modules/cesium-3d/cesium-3d.module'; // 🌐 3D 沙盤
import { MediaStreamingModule } from './modules/media-streaming/media-streaming.module'; // 📹 影像串流
import { AiVisionModule } from './modules/ai-vision/ai-vision.module'; // 🤖 AI 辨識
// v3.0 長期擴展
import { AiPredictionModule } from './modules/ai-prediction/ai-prediction.module'; // 📊 AI 預測
import { PushNotificationModule } from './modules/push-notification/push-notification.module'; // 🔔 推播通知
// v4.0 未來擴展模組
import { ArNavigationModule } from './modules/ar-navigation/ar-navigation.module'; // 🥽 AR 導航
import { SatelliteCommModule } from './modules/satellite-comm/satellite-comm.module'; // 🛰️ 衛星通訊
import { BlockchainModule } from './modules/blockchain/blockchain.module'; // ⛓️ 區塊鏈追蹤
import { WeatherModule } from './modules/weather/weather.module'; // 🌦️ 氣象雷達
import { WearableModule } from './modules/wearable/wearable.module'; // ⌚ 穿戴裝置
import { VrCommandModule } from './modules/vr-command/vr-command.module'; // 🕶️ VR 指揮
import { RobotRescueModule } from './modules/robot-rescue/robot-rescue.module'; // 🤖 機器人搜救
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
        MissionSessionsModule, // 🚨 緊急應變任務系統
        OverlaysModule, // 🗺️ 戰術地圖模組
        FieldReportsModule, // 📡 即時回報系統
        AiQueueModule, // 🤖 AI 隊列平台
        AuditModule, // 🔒 稽核日誌
        CacheModule, // 🚀 快取服務
        ErrorTrackingModule, // 📊 錯誤追蹤
        SystemModule, // ⚙️ 系統管理
        LocationModule, // 📍 地理圍欄
        SchedulerModule, // ⏰ 排程任務
        MetricsModule, // 📈 API 指標
        WebhooksModule, // 🔗 Webhooks
        FeaturesModule, // 🚩 Feature Flags
        FilesModule, // 📁 檔案管理
        // v2.0 擴充模組
        DrillSimulationModule, // 🎮 演練模擬
        OfflineMeshModule, // 📡 離線網狀
        PsychologicalSupportModule, // ❤️ 心理支持
        IntegrityLedgerModule, // 🔗 責信區塊鏈
        // v3.0 擴充模組
        TriageModule, // 🏥 E-Triage 檢傷
        VoiceModule, // 🎤 語音轉錄
        RoutingModule, // 🛣️ 路徑規劃
        ReunificationModule, // 🔍 災民協尋
        EquipmentModule, // 📦 設備管理
        TacticalMapsModule, // 🗺️ 3D 戰術
        IndoorPositioningModule, // 📍 室內定位
        DroneOpsModule, // 🛸 無人機
        SpectrumAnalysisModule, // 📡 頻譜分析
        // v3.0 擴展模組
        NfcModule, // 📲 NFC 手環
        QrScannerModule, // 📷 QR 掃描
        PttModule, // 🎙️ PTT 對講機
        OfflineTilesModule, // 🗺️ 離線地圖
        // v3.0 中期擴展模組
        Cesium3dModule, // 🌐 3D 沙盤
        MediaStreamingModule, // 📹 影像串流
        AiVisionModule, // 🤖 AI 辨識
        // v3.0 長期擴展模組
        AiPredictionModule, // 📊 AI 預測
        PushNotificationModule, // 🔔 推播通知
        // v4.0 未來擴展模組
        ArNavigationModule, // 🥽 AR 導航
        SatelliteCommModule, // 🛰️ 衛星通訊
        BlockchainModule, // ⛓️ 區塊鏈追蹤
        WeatherModule, // 🌦️ 氣象雷達
        WearableModule, // ⌚ 穿戴裝置
        VrCommandModule, // 🕶️ VR 指揮
        RobotRescueModule, // 🤖 機器人搜救
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

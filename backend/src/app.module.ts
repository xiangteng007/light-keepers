import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './modules/database/database.module';
import { SharedAuthModule, GlobalAuthGuard } from './modules/shared/shared-auth.module';
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
// ==============================================
// Batch 3: Low Side-Effect Modules (CRUD-only)
// ==============================================
// Dashboard & Visualization (Note: DashboardModule has no module file)
import { DashboardAnalyticsModule } from './modules/dashboard-analytics/dashboard-analytics.module';
import { DashboardBuilderModule } from './modules/dashboard-builder/dashboard-builder.module';
import { HeatmapAnalyticsModule } from './modules/heatmap-analytics/heatmap-analytics.module';
import { TimelineVisualizationModule } from './modules/timeline-visualization/timeline-visualization.module';
import { D3ChartModule } from './modules/d3-chart/d3-chart.module';
// Reports
import { ReportBuilderModule } from './modules/report-builder/report-builder.module';
import { ReportSchedulerModule } from './modules/report-scheduler/report-scheduler.module';
import { PerformanceReportModule } from './modules/performance-report/performance-report.module';
import { ExcelExportModule } from './modules/excel-export/excel-export.module';
import { PdfGeneratorModule } from './modules/pdf-generator/pdf-generator.module';
// Operations
import { DroneOpsModule } from './modules/drone-ops/drone-ops.module';
import { AirOpsModule } from './modules/air-ops/air-ops.module';
import { TacticalMapsModule } from './modules/tactical-maps/tactical-maps.module';
import { RoutingModule } from './modules/routing/routing.module';
// Community
import { ReunificationModule } from './modules/reunification/reunification.module';
import { FamilyReunificationModule } from './modules/family-reunification/family-reunification.module';
import { PsychologicalSupportModule } from './modules/psychological-support/psychological-support.module';
import { PsychologicalTrackingModule } from './modules/psychological-tracking/psychological-tracking.module';
import { CommunityResilienceModule } from './modules/community-resilience/community-resilience.module';
import { DisasterCommunityModule } from './modules/disaster-community/disaster-community.module';
import { CrowdReportingModule } from './modules/crowd-reporting/crowd-reporting.module';
// Volunteer
import { RewardsModule } from './modules/rewards/rewards.module';
import { VolunteerPointsModule } from './modules/volunteer-points/volunteer-points.module';
import { VolunteerCertificationModule } from './modules/volunteer-certification/volunteer-certification.module';
// Equipment & Misc
import { EquipmentQrModule } from './modules/equipment-qr/equipment-qr.module';
import { MockDataModule } from './modules/mock-data/mock-data.module';
import { I18nApiModule } from './modules/i18n-api/i18n-api.module';
import { SwaggerAutoDocsModule } from './modules/swagger-auto-docs/swagger-auto-docs.module';
import { SystemModule } from './modules/system/system.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
// ==============================================
// Batch 4: High Side-Effect Modules
// ==============================================
// Webhooks & Integrations
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { NgoApiModule } from './modules/ngo-api/ngo-api.module';
import { NgoIntegrationModule } from './modules/ngo-integration/ngo-integration.module';
import { Fire119Module } from './modules/fire-119/fire-119.module';
import { CitizenAppModule } from './modules/citizen-app/citizen-app.module';
import { SatelliteCommModule } from './modules/satellite-comm/satellite-comm.module';
import { SlackIntegrationModule } from './modules/slack-integration/slack-integration.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
// AI & ML
import { AiPredictionModule } from './modules/ai-prediction/ai-prediction.module';
import { AiVisionModule } from './modules/ai-vision/ai-vision.module';
import { ImageRecognitionModule } from './modules/image-recognition/image-recognition.module';
import { AerialImageAnalysisModule } from './modules/aerial-image-analysis/aerial-image-analysis.module';
import { EmotionAnalysisModule } from './modules/emotion-analysis/emotion-analysis.module';
import { EventAiModule } from './modules/event-ai/event-ai.module';
import { AIModule } from './modules/ai/ai.module';
import { AutoSummaryModule } from './modules/auto-summary/auto-summary.module';
import { ChatbotAssistantModule } from './modules/chatbot-assistant/chatbot-assistant.module';
import { RagKnowledgeModule } from './modules/rag-knowledge/rag-knowledge.module';
import { DisasterSummaryModule } from './modules/disaster-summary/disaster-summary.module';
import { FatigueDetectionModule } from './modules/fatigue-detection/fatigue-detection.module';
import { DocumentOcrModule } from './modules/document-ocr/document-ocr.module';
import { TranslationModule } from './modules/translation/translation.module';
// Scheduling & Dispatch
import { AutoDispatchModule } from './modules/auto-dispatch/auto-dispatch.module';
import { SmartSchedulingModule } from './modules/smart-scheduling/smart-scheduling.module';
import { ScheduledTasksModule } from './modules/scheduled-tasks/scheduled-tasks.module';
// Weather & Climate
import { WeatherModule } from './modules/weather/weather.module';
import { WeatherAlertIntegrationModule } from './modules/weather-alert-integration/weather-alert-integration.module';
import { TccipClimateModule } from './modules/tccip-climate/tccip-climate.module';
import { TrendPredictionModule } from './modules/trend-prediction/trend-prediction.module';
import { SocialMediaMonitorModule } from './modules/social-media-monitor/social-media-monitor.module';
// ==============================================
// Batch 5: Remaining Infrastructure Modules (FINAL)
// ==============================================
// AR/VR
import { ArFieldGuidanceModule } from './modules/ar-field-guidance/ar-field-guidance.module';
import { ArNavigationModule } from './modules/ar-navigation/ar-navigation.module';
import { VrCommandModule } from './modules/vr-command/vr-command.module';
// Offline & Mobile
import { OfflineSyncModule } from './modules/offline-sync/offline-sync.module';
import { OfflineMeshModule } from './modules/offline-mesh/offline-mesh.module';
import { OfflineMapCacheModule } from './modules/offline-map-cache/offline-map-cache.module';
import { OfflineTilesModule } from './modules/offline-tiles/offline-tiles.module';
import { MobileSyncModule } from './modules/mobile-sync/mobile-sync.module';
import { DeviceManagementModule } from './modules/device-management/device-management.module';
// Push Notifications
import { PushNotificationModule } from './modules/push-notification/push-notification.module';
// LINE & Social
import { LineLiffModule } from './modules/line-liff/line-liff.module';
import { LineNotifyModule } from './modules/line-notify/line-notify.module';
// Blockchain & Security
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { IntegrityLedgerModule } from './modules/integrity-ledger/integrity-ledger.module';
import { SupplyChainBlockchainModule } from './modules/supply-chain-blockchain/supply-chain-blockchain.module';
import { BiometricAuthModule } from './modules/biometric-auth/biometric-auth.module';
import { TwoFactorAuthModule } from './modules/two-factor-auth/two-factor-auth.module';
import { SecretRotationModule } from './modules/secret-rotation/secret-rotation.module';
import { GdprComplianceModule } from './modules/gdpr-compliance/gdpr-compliance.module';
import { IpWhitelistModule } from './modules/ip-whitelist/ip-whitelist.module';
import { SessionTimeoutModule } from './modules/session-timeout/session-timeout.module';
import { DataEncryptionModule } from './modules/data-encryption/data-encryption.module';
// Simulation & Training
import { DrillSimulationModule } from './modules/drill-simulation/drill-simulation.module';
import { EvacuationSimModule } from './modules/evacuation-sim/evacuation-sim.module';
import { DamageSimulationModule } from './modules/damage-simulation/damage-simulation.module';
// Specialty
import { AarAnalysisModule } from './modules/aar-analysis/aar-analysis.module';
import { BimIntegrationModule } from './modules/bim-integration/bim-integration.module';
import { Cesium3dModule } from './modules/cesium-3d/cesium-3d.module';
import { DroneSwarmModule } from './modules/drone-swarm/drone-swarm.module';
import { InsaragModule } from './modules/insarag/insarag.module';
import { RobotRescueModule } from './modules/robot-rescue/robot-rescue.module';
import { SpectrumAnalysisModule } from './modules/spectrum-analysis/spectrum-analysis.module';
import { WaterResourcesModule } from './modules/water-resources/water-resources.module';
import { WearableModule } from './modules/wearable/wearable.module';
// Communication
import { PttModule } from './modules/ptt/ptt.module';
import { BluetoothAudioModule } from './modules/bluetooth-audio/bluetooth-audio.module';
import { MediaStreamingModule } from './modules/media-streaming/media-streaming.module';
import { RealtimeChatModule } from './modules/realtime-chat/realtime-chat.module';
import { SpeechToTextModule } from './modules/speech-to-text/speech-to-text.module';
import { VoiceAssistantModule } from './modules/voice-assistant/voice-assistant.module';
// Infrastructure
import { RedisCacheModule } from './modules/redis-cache/redis-cache.module';
import { SentryModule } from './modules/sentry/sentry.module';
import { QrScannerModule } from './modules/qr-scanner/qr-scanner.module';
import { NfcModule } from './modules/nfc/nfc.module';
import { IndoorPositioningModule } from './modules/indoor-positioning/indoor-positioning.module';
import { GeofenceAlertModule } from './modules/geofence-alert/geofence-alert.module';
// Note: GeoIntelModule has no module file (only agents subfolder)
// Resource Management
import { ResourceMatchingModule } from './modules/resource-matching/resource-matching.module';
import { ResourceOptimizationModule } from './modules/resource-optimization/resource-optimization.module';
import { DonationTrackingModule } from './modules/donation-tracking/donation-tracking.module';
import { PredictiveMaintenanceModule } from './modules/predictive-maintenance/predictive-maintenance.module';
// Admin & Finance
import { MultiEocModule } from './modules/multi-eoc/multi-eoc.module';
import { MultiTenantModule } from './modules/multi-tenant/multi-tenant.module';
import { PublicFinanceModule } from './modules/public-finance/public-finance.module';
import { ExpenseReimbursementModule } from './modules/expense-reimbursement/expense-reimbursement.module';
import { PowerBiModule } from './modules/power-bi/power-bi.module';
// Misc
import { MicroTaskModule } from './modules/micro-task/micro-task.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { EmailTemplateModule } from './modules/email-template/email-template.module';
import { CloudLoggerService } from './common/services/cloud-logger.service';
import { EventPublisherModule } from './common/services/event-publisher.module';
import { StorageModule } from './common/storage';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
// v2.1 SSOT: 統一通報入口
import { IntakeModule } from './modules/intake/intake.module';
// v4.0: Hub 服務整合
import { HubServicesModule } from './common/services/hub-services.module';

// ==============================================
// STUB MODULES (Disabled in production by default)
// Set ENABLE_STUB_MODULES=true to enable
// @see docs/proof/security/public-surface.md
// ==============================================
const STUB_MODULES = [
    ArFieldGuidanceModule,
    ArNavigationModule,
    VrCommandModule,
    DroneSwarmModule,
    SupplyChainBlockchainModule,
    AerialImageAnalysisModule,
    MockDataModule, // T8: Mock data should not load in production
];

const ENABLE_STUB_MODULES = process.env.ENABLE_STUB_MODULES === 'true';

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

        // P3: Outbox Pattern - 事件驅動
        EventPublisherModule,

        // P4: Storage 統一抽象
        StorageModule.forRoot(),

        // v4.0: Hub 服務整合 (Global)
        HubServicesModule,

        // 功能模組
        HealthModule,
        AuthModule,
        AccountsModule,
        EventsModule,
        TasksModule,
        NcdrAlertsModule,
        PublicResourcesModule,
        PublicModule, // 🌐 Level0 公開端點
        IntakeModule, // 📥 v2.1 SSOT 統一通報入口
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
        // ==============================================
        // Batch 3: Low Side-Effect Modules (CRUD-only)
        // ==============================================
        // Dashboard & Visualization
        DashboardAnalyticsModule, // 📊 儀表板分析
        DashboardBuilderModule, // 🔧 儀表板建構器
        HeatmapAnalyticsModule, // 🗺️ 熱力圖
        TimelineVisualizationModule, // 📅 時間軸視覺化
        D3ChartModule, // 📈 D3 圖表
        // Reports
        ReportBuilderModule, // 📄 報表建構器
        ReportSchedulerModule, // 📅 報表排程
        PerformanceReportModule, // 📊 效能報告
        ExcelExportModule, // 📊 Excel 匯出
        PdfGeneratorModule, // 📑 PDF 產生器
        // Operations
        DroneOpsModule, // 🚁 無人機運作
        AirOpsModule, // ✈️ 空中作業
        TacticalMapsModule, // 🗺️ 戰術地圖
        RoutingModule, // 🛣️ 路徑規劃
        // Community
        ReunificationModule, // 👨‍👩‍👧 家庭團聚
        FamilyReunificationModule, // 👨‍👩‍👧‍👦 家屬尋人
        PsychologicalSupportModule, // 🧠 心理支援
        PsychologicalTrackingModule, // 📊 心理追蹤
        CommunityResilienceModule, // 💪 社區韌性
        DisasterCommunityModule, // 🏘️ 災區社群
        CrowdReportingModule, // 📢 群眾回報
        // Volunteer
        RewardsModule, // 🏆 獎勵系統
        VolunteerPointsModule, // ⭐ 志工積分
        VolunteerCertificationModule, // 🎓 志工認證
        // Equipment & Misc
        EquipmentQrModule, // 📱 裝備 QR 碼
        // MockDataModule - moved to STUB_MODULES (T8: not loaded in production)
        I18nApiModule, // 🌐 多語系 API
        SwaggerAutoDocsModule, // 📚 Swagger 文件
        SystemModule, // ⚙️ 系統管理
        AuditLogModule, // 📜 稽核日誌
        // ==============================================
        // Batch 4: High Side-Effect Modules
        // ==============================================
        // Webhooks & Integrations
        WebhooksModule, // 🔗 Webhook 接收
        NgoApiModule, // 🏢 NGO API
        NgoIntegrationModule, // 🤝 NGO 整合
        Fire119Module, // 🚒 119 消防整合
        CitizenAppModule, // 📱 市民 App
        SatelliteCommModule, // 🛰️ 衛星通訊
        SlackIntegrationModule, // 💬 Slack 整合
        TelegramBotModule, // 🤖 Telegram Bot
        // AI & ML
        AiPredictionModule, // 🔮 AI 預測
        AiVisionModule, // 👁️ AI 視覺
        ImageRecognitionModule, // 🖼️ 圖像辨識
        // AerialImageAnalysisModule - moved to STUB_MODULES (conditionally loaded)
        EmotionAnalysisModule, // 😊 情緒分析
        EventAiModule, // 🧠 事件 AI
        AIModule, // 🤖 智慧派遣/物資預判
        AutoSummaryModule, // 📝 自動摘要
        ChatbotAssistantModule, // 💬 聊天機器人
        RagKnowledgeModule, // 📚 RAG 知識庫
        DisasterSummaryModule, // 📊 災情摘要
        FatigueDetectionModule, // 😴 疲勞偵測
        DocumentOcrModule, // 📄 文件 OCR
        TranslationModule, // 🌐 翻譯服務
        // Scheduling & Dispatch
        AutoDispatchModule, // 🚀 自動派遣
        SmartSchedulingModule, // 📅 智慧排程
        ScheduledTasksModule, // ⏰ 排程任務
        // Weather & Climate
        WeatherModule, // ☀️ 氣象服務
        WeatherAlertIntegrationModule, // ⚠️ 氣象警報
        TccipClimateModule, // 🌡️ TCCIP 氣候
        TrendPredictionModule, // 📈 趨勢預測
        SocialMediaMonitorModule, // 📱 社群監控
        // ==============================================
        // Batch 5: Remaining Infrastructure Modules (FINAL)
        // ==============================================
        // AR/VR (CONDITIONALLY LOADED - see STUB_MODULES)
        // ArFieldGuidanceModule, ArNavigationModule, VrCommandModule
        // are loaded conditionally below via ENABLE_STUB_MODULES
        // Offline & Mobile
        OfflineSyncModule, // 📴 離線同步
        OfflineMeshModule, // 🔗 Mesh 網路
        OfflineMapCacheModule, // 🗺️ 離線地圖
        OfflineTilesModule, // 🔲 離線圖磚
        MobileSyncModule, // 📱 行動同步
        DeviceManagementModule, // 📲 裝置管理
        // Push Notifications
        PushNotificationModule, // 🔔 推播通知
        // LINE & Social
        LineLiffModule, // 💚 LINE LIFF
        LineNotifyModule, // 📢 LINE Notify
        // Blockchain & Security
        BlockchainModule, // ⛓️ 區塊鏈
        IntegrityLedgerModule, // 📜 完整性帳本
        // SupplyChainBlockchainModule - moved to STUB_MODULES (conditionally loaded)
        BiometricAuthModule, // 👆 生物辨識
        TwoFactorAuthModule, // 🔐 雙因素驗證
        SecretRotationModule, // 🔄 密鑰輪換
        GdprComplianceModule, // 🇪🇺 GDPR 合規
        IpWhitelistModule, // 🔒 IP 白名單
        SessionTimeoutModule, // ⏱️ 工作階段逾時
        DataEncryptionModule, // 🔐 資料加密
        // Simulation & Training
        DrillSimulationModule, // 🎯 演習模擬
        EvacuationSimModule, // 🏃 疏散模擬
        DamageSimulationModule, // 💥 損害模擬
        // Specialty
        AarAnalysisModule, // 📊 AAR 分析
        BimIntegrationModule, // 🏗️ BIM 整合
        Cesium3dModule, // 🌍 Cesium 3D
        // DroneSwarmModule - moved to STUB_MODULES (conditionally loaded)
        InsaragModule, // 🏥 INSARAG
        RobotRescueModule, // 🤖 機器人救援
        SpectrumAnalysisModule, // 📡 頻譜分析
        WaterResourcesModule, // 💧 水資源
        WearableModule, // ⌚ 穿戴裝置
        // Communication
        PttModule, // 📻 PTT 對講
        BluetoothAudioModule, // 🎧 藍牙音訊
        MediaStreamingModule, // 📺 媒體串流
        RealtimeChatModule, // 💬 即時聊天
        SpeechToTextModule, // 🎤 語音轉文字
        VoiceAssistantModule, // 🗣️ 語音助理
        // Infrastructure
        RedisCacheModule, // ⚡ Redis 快取
        SentryModule, // 🐛 Sentry 監控
        QrScannerModule, // 📱 QR 掃描
        NfcModule, // 📲 NFC
        IndoorPositioningModule, // 📍 室內定位
        GeofenceAlertModule, // 🗺️ 地理圍欄
        // Resource Management
        ResourceMatchingModule, // 🎯 資源媒合
        ResourceOptimizationModule, // ⚡ 資源優化
        DonationTrackingModule, // 💰 捐贈追蹤
        PredictiveMaintenanceModule, // 🔧 預測維護
        // Admin & Finance
        MultiEocModule, // 🏢 多 EOC
        MultiTenantModule, // 🏢 多租戶
        PublicFinanceModule, // 💰 公共財務
        ExpenseReimbursementModule, // 💳 費用報銷
        PowerBiModule, // 📊 Power BI
        // Misc
        MicroTaskModule, // ✅ 微任務
        FileUploadModule, // 📤 檔案上傳
        EmailTemplateModule, // 📧 郵件範本
        // ==============================================
        // STUB MODULES (Conditionally Loaded)
        // Only enabled when ENABLE_STUB_MODULES=true
        // @see docs/proof/security/public-surface.md
        // ==============================================
        ...(ENABLE_STUB_MODULES ? STUB_MODULES : [])
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
        // T7 Strict Gate Compliance: All routes protected by default
        // Use @Public() decorator on endpoints that should be public
        // @see docs/policy/public-surface.policy.json
        {
            provide: APP_GUARD,
            useClass: GlobalAuthGuard,
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

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
// v5.0 進階擴展模組
import { VoiceAssistantModule } from './modules/voice-assistant/voice-assistant.module'; // 🎙️ 語音助手
import { TranslationModule } from './modules/translation/translation.module'; // 🌐 即時翻譯
import { EmotionAnalysisModule } from './modules/emotion-analysis/emotion-analysis.module'; // 💭 情緒辨識
import { CrowdReportingModule } from './modules/crowd-reporting/crowd-reporting.module'; // 📱 群眾回報
import { MicroTaskModule } from './modules/micro-task/micro-task.module'; // 📋 微任務
import { RewardsModule } from './modules/rewards/rewards.module'; // 🏆 獎勵積分
import { BimIntegrationModule } from './modules/bim-integration/bim-integration.module'; // 🏗️ BIM 整合
import { MultiEocModule } from './modules/multi-eoc/multi-eoc.module'; // 🏛️ 跨縣市 EOC
import { DisasterSummaryModule } from './modules/disaster-summary/disaster-summary.module'; // 📝 災情摘要
import { ResourceOptimizationModule } from './modules/resource-optimization/resource-optimization.module'; // 📊 資源最佳化
import { AarAnalysisModule } from './modules/aar-analysis/aar-analysis.module'; // 📋 AAR 分析
import { DamageSimulationModule } from './modules/damage-simulation/damage-simulation.module'; // 🏚️ 損壞模擬
import { EvacuationSimModule } from './modules/evacuation-sim/evacuation-sim.module'; // 🚶 疏散模擬
import { NgoIntegrationModule } from './modules/ngo-integration/ngo-integration.module'; // 🤝 NGO 整合
import { InsaragModule } from './modules/insarag/insarag.module'; // 🌍 INSARAG
// v6.0 組織特色模組
import { CommunityResilienceModule } from './modules/community-resilience/community-resilience.module'; // 🏠 社區韌性
import { VolunteerCertificationModule } from './modules/volunteer-certification/volunteer-certification.module'; // 🎓 志工認證
import { PsychologicalTrackingModule } from './modules/psychological-tracking/psychological-tracking.module'; // 🧠 心理追蹤
import { ResourceMatchingModule } from './modules/resource-matching/resource-matching.module'; // 🤝 物資媒合
// v7.0 深度整合模組
import { LineLiffModule } from './modules/line-liff/line-liff.module'; // 📱 LINE LIFF
import { CitizenAppModule } from './modules/citizen-app/citizen-app.module'; // 👥 公民 App
import { BluetoothAudioModule } from './modules/bluetooth-audio/bluetooth-audio.module'; // 🎧 藍牙音訊
import { NgoApiModule } from './modules/ngo-api/ngo-api.module'; // 🏛️ NGO API
// v8.0 數據分析與整合模組
import { PowerBiModule } from './modules/power-bi/power-bi.module'; // 📊 Power BI
import { TrendPredictionModule } from './modules/trend-prediction/trend-prediction.module'; // 📈 趨勢預測
import { PerformanceReportModule } from './modules/performance-report/performance-report.module'; // 📋 績效報表
import { GeofenceAlertModule } from './modules/geofence-alert/geofence-alert.module'; // 📍 地理圍欄
import { SmartSchedulingModule } from './modules/smart-scheduling/smart-scheduling.module'; // 🤖 智慧排班
import { FatigueDetectionModule } from './modules/fatigue-detection/fatigue-detection.module'; // 😴 疲勞偵測
import { Fire119Module } from './modules/fire-119/fire-119.module'; // 🚒 消防 119
import { WaterResourcesModule } from './modules/water-resources/water-resources.module'; // 💧 水利署
import { TccipClimateModule } from './modules/tccip-climate/tccip-climate.module'; // 🌡️ TCCIP 氣候
import { DonationTrackingModule } from './modules/donation-tracking/donation-tracking.module'; // 💰 捐款追蹤
import { ExpenseReimbursementModule } from './modules/expense-reimbursement/expense-reimbursement.module'; // 🧾 經費核銷
import { PublicFinanceModule } from './modules/public-finance/public-finance.module'; // 📊 公開財報
// v9.0 基礎設施模組
import { RedisCacheModule } from './modules/redis-cache/redis-cache.module'; // 🗃️ Redis 快取
import { FileUploadModule } from './modules/file-upload/file-upload.module'; // 📎 檔案上傳
import { AuditLogModule } from './modules/audit-log/audit-log.module'; // 📝 審計日誌
import { MultiTenantModule } from './modules/multi-tenant/multi-tenant.module'; // 🏢 多租戶
import { ScheduledTasksModule } from './modules/scheduled-tasks/scheduled-tasks.module'; // ⏰ 排程任務
import { I18nApiModule } from './modules/i18n-api/i18n-api.module'; // 🌐 國際化
// v10.0 安全與監控模組
import { PrometheusModule } from './modules/prometheus/prometheus.module'; // 📊 Prometheus
import { SentryModule } from './modules/sentry/sentry.module'; // 🚨 Sentry
import { SecretRotationModule } from './modules/secret-rotation/secret-rotation.module'; // 🔐 金鑰輪替
// v11.0 AI 進階模組
import { RagKnowledgeModule } from './modules/rag-knowledge/rag-knowledge.module'; // 🧠 RAG 知識庫
import { ImageRecognitionModule } from './modules/image-recognition/image-recognition.module'; // 🖼️ 圖像辨識
import { SpeechToTextModule } from './modules/speech-to-text/speech-to-text.module'; // 🎴 語音轉文字
import { AutoSummaryModule } from './modules/auto-summary/auto-summary.module'; // 📝 自動摘要
// v12.0 前端支援模組
import { OfflineSyncModule } from './modules/offline-sync/offline-sync.module'; // 📡 離線同步
// v13.0 進階整合模組
import { LineNotifyModule } from './modules/line-notify/line-notify.module'; // 📱 LINE Notify
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module'; // 🤖 Telegram Bot
import { SlackIntegrationModule } from './modules/slack-integration/slack-integration.module'; // 💬 Slack
import { EmailTemplateModule } from './modules/email-template/email-template.module'; // 📧 Email 模板
// v14.0 資料視覺化模組
import { DashboardBuilderModule } from './modules/dashboard-builder/dashboard-builder.module'; // 📊 儀表板配置
import { HeatmapAnalyticsModule } from './modules/heatmap-analytics/heatmap-analytics.module'; // 🔥 熱點分析
import { TimelineVisualizationModule } from './modules/timeline-visualization/timeline-visualization.module'; // ⏱️ 時序視覺化
import { D3ChartModule } from './modules/d3-chart/d3-chart.module'; // 📈 D3 圖表
// v15.0 AI 自動化模組
import { ChatbotAssistantModule } from './modules/chatbot-assistant/chatbot-assistant.module'; // 💬 AI 問答
import { AutoDispatchModule } from './modules/auto-dispatch/auto-dispatch.module'; // 🚀 自動派遣
import { PredictiveMaintenanceModule } from './modules/predictive-maintenance/predictive-maintenance.module'; // 🔧 設備預測
import { DocumentOcrModule } from './modules/document-ocr/document-ocr.module'; // 📝 OCR 數位化
// v16.0 合規與安全模組
import { GdprComplianceModule } from './modules/gdpr-compliance/gdpr-compliance.module'; // 🔒 GDPR
import { TwoFactorAuthModule } from './modules/two-factor-auth/two-factor-auth.module'; // 🔐 2FA
import { IpWhitelistModule } from './modules/ip-whitelist/ip-whitelist.module'; // 🛡️ IP 白名單
import { DataEncryptionModule } from './modules/data-encryption/data-encryption.module'; // 🔑 欄位加密
// v17.0 行動端強化模組
import { PushNotificationV2Module } from './modules/push-notification-v2/push-notification-v2.module'; // 🔔 FCM 推播
import { OfflineMapCacheModule } from './modules/offline-map-cache/offline-map-cache.module'; // 🗺️ 離線地圖
import { BiometricAuthModule } from './modules/biometric-auth/biometric-auth.module'; // 👆 生物辨識
// v18.0 組織管理模組
import { OrgChartModule } from './modules/org-chart/org-chart.module'; // 🏢 組織架構
import { ShiftCalendarModule } from './modules/shift-calendar/shift-calendar.module'; // 📅 排班日曆
import { AttendanceModule } from './modules/attendance/attendance.module'; // ⏰ 出勤打卡
import { PayrollModule } from './modules/payroll/payroll.module'; // 💰 補助計算
// v20.0 報表與匯出模組
import { PdfGeneratorModule } from './modules/pdf-generator/pdf-generator.module'; // 📄 PDF 產生
import { ExcelExportModule } from './modules/excel-export/excel-export.module'; // 📊 Excel 匯出
import { ReportSchedulerModule } from './modules/report-scheduler/report-scheduler.module'; // ⏰ 排程報表
// v21.0 災情追蹤強化模組
import { SocialMediaMonitorModule } from './modules/social-media-monitor/social-media-monitor.module'; // 📱 社群監控
// v22.0 開發者體驗模組
import { SwaggerAutoDocsModule } from './modules/swagger-auto-docs/swagger-auto-docs.module'; // 📚 API 文件
import { MockDataModule } from './modules/mock-data/mock-data.module'; // 🎭 假資料
// v23.0 進階安全模組
import { DeviceManagementModule } from './modules/device-management/device-management.module'; // 📱 裝置管理
import { SessionTimeoutModule } from './modules/session-timeout/session-timeout.module'; // ⏱️ Session 逾時
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
        // v5.0 進階擴展模組
        VoiceAssistantModule, // 🎙️ 語音助手
        TranslationModule, // 🌐 即時翻譯
        EmotionAnalysisModule, // 💭 情緒辨識
        CrowdReportingModule, // 📱 群眾回報
        MicroTaskModule, // 📋 微任務
        RewardsModule, // 🏆 獎勵積分
        BimIntegrationModule, // 🏗️ BIM 整合
        MultiEocModule, // 🏛️ 跨縣市 EOC
        DisasterSummaryModule, // 📝 災情摘要
        ResourceOptimizationModule, // 📊 資源最佳化
        AarAnalysisModule, // 📋 AAR 分析
        DamageSimulationModule, // 🏚️ 損壞模擬
        EvacuationSimModule, // 🚶 疏散模擬
        NgoIntegrationModule, // 🤝 NGO 整合
        InsaragModule, // 🌍 INSARAG
        // v6.0 組織特色模組
        CommunityResilienceModule, // 🏠 社區韌性
        VolunteerCertificationModule, // 🎓 志工認證
        PsychologicalTrackingModule, // 🧠 心理追蹤
        ResourceMatchingModule, // 🤝 物資媒合
        // v7.0 深度整合模組
        LineLiffModule, // 📱 LINE LIFF
        CitizenAppModule, // 👥 公民 App
        BluetoothAudioModule, // 🎧 藍牙音訊
        NgoApiModule, // 🏛️ NGO API
        // v8.0 數據分析與整合模組
        PowerBiModule, // 📊 Power BI
        TrendPredictionModule, // 📈 趨勢預測
        PerformanceReportModule, // 📋 績效報表
        GeofenceAlertModule, // 📍 地理圍欄
        SmartSchedulingModule, // 🤖 智慧排班
        FatigueDetectionModule, // 😴 疲勞偵測
        Fire119Module, // 🚒 消防 119
        WaterResourcesModule, // 💧 水利署
        TccipClimateModule, // 🌡️ TCCIP 氣候
        DonationTrackingModule, // 💰 捐款追蹤
        ExpenseReimbursementModule, // 🧾 經費核銷
        PublicFinanceModule, // 📊 公開財報
        // v9.0 基礎設施模組
        RedisCacheModule, // 🗃️ Redis 快取
        FileUploadModule, // 📎 檔案上傳
        AuditLogModule, // 📝 審計日誌
        MultiTenantModule, // 🏢 多租戶
        ScheduledTasksModule, // ⏰ 排程任務
        I18nApiModule, // 🌐 國際化
        // === v10.0 安全與監控 ===
        PrometheusModule, // 📊 Prometheus 監控
        SentryModule, // 🚨 錯誤追蹤
        SecretRotationModule, // 🔐 金鑰輪替
        // === v11.0 AI 進階 ===
        RagKnowledgeModule, // 🧠 RAG 知識庫
        ImageRecognitionModule, // 🖼️ 圖像辨識
        SpeechToTextModule, // 🎴 語音轉文字
        AutoSummaryModule, // 📝 自動摘要 SITREP
        // === v12.0 前端支援 ===
        OfflineSyncModule, // 📡 離線同步
        // === v13.0 進階整合 ===
        LineNotifyModule, // 📱 LINE Notify
        TelegramBotModule, // 🤖 Telegram Bot
        SlackIntegrationModule, // 💬 Slack
        EmailTemplateModule, // 📧 Email 模板
        // === v14.0 資料視覺化 ===
        DashboardBuilderModule, // 📊 儀表板配置
        HeatmapAnalyticsModule, // 🔥 熱點分析
        TimelineVisualizationModule, // ⏱️ 時序視覺化
        D3ChartModule, // 📈 D3 圖表
        // === v15.0 AI 自動化 ===
        ChatbotAssistantModule, // 💬 AI 問答
        AutoDispatchModule, // 🚀 自動派遣
        PredictiveMaintenanceModule, // 🔧 設備預測
        DocumentOcrModule, // 📝 OCR 數位化
        // === v16.0 合規與安全 ===
        GdprComplianceModule, // 🔒 GDPR 合規
        TwoFactorAuthModule, // 🔐 2FA
        IpWhitelistModule, // 🛡️ IP 白名單
        DataEncryptionModule, // 🔑 欄位加密
        // === v17.0 行動端強化 ===
        PushNotificationV2Module, // 🔔 FCM 推播
        OfflineMapCacheModule, // 🗺️ 離線地圖
        BiometricAuthModule, // 👆 生物辨識
        // === v18.0 組織管理 ===
        OrgChartModule, // 🏢 組織架構
        ShiftCalendarModule, // 📅 排班日曆
        AttendanceModule, // ⏰ 出勤打卡
        PayrollModule, // 💰 補助計算
        // === v20.0 報表與匯出 ===
        PdfGeneratorModule, // 📄 PDF 產生
        ExcelExportModule, // 📊 Excel 匯出
        ReportSchedulerModule, // ⏰ 排程報表
        // === v21.0 災情追蹤強化 ===
        SocialMediaMonitorModule, // 📱 社群監控
        // === v22.0 開發者體驗 ===
        SwaggerAutoDocsModule, // 📚 API 文件
        MockDataModule, // 🎭 假資料
        // === v23.0 進階安全 ===
        DeviceManagementModule, // 📱 裝置管理
        SessionTimeoutModule, // ⏱️ Session 逾時
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

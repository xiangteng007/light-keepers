import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { LineBotModule } from './modules/line-bot/line-bot.module';
import { MenuConfigModule } from './modules/menu-config/menu-config.module';
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
// PR6: P1 缺失模組 (E2E 閉環必需)
import { TriageModule } from './modules/triage/triage.module';
import { LocationModule } from './modules/location/location.module';
import { TaskDispatchModule } from './modules/task-dispatch/task-dispatch.module';
// E2E Scenario Modules
import { SheltersModule } from './modules/shelters/shelters.module';
import { StructuralAssessmentModule } from './modules/structural-assessment/structural-assessment.module';
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
// REMOVED: ErrorTrackingModule - consolidated to SentryModule
import { PrometheusModule } from './modules/prometheus/prometheus.module';
// ==============================================
// Batch 3: Low Side-Effect Modules (CRUD-only)
// ==============================================
// Dashboard & Visualization (Note: DashboardModule has no module file)
import { TimelineVisualizationModule } from './modules/timeline-visualization/timeline-visualization.module';
// Reports
import { PerformanceReportModule } from './modules/performance-report/performance-report.module';
// Operations
import { TacticalMapsModule } from './modules/tactical-maps/tactical-maps.module';
import { RoutingModule } from './modules/routing/routing.module';
// Community
import { ReunificationModule } from './modules/reunification/reunification.module';
import { PsychologicalSupportModule } from './modules/psychological-support/psychological-support.module';
// Volunteer
import { VolunteerPointsModule } from './modules/volunteer-points/volunteer-points.module';
import { VolunteerCertificationModule } from './modules/volunteer-certification/volunteer-certification.module';
// Equipment & Misc
import { EquipmentQrModule } from './modules/equipment-qr/equipment-qr.module';
// REMOVED: MockDataModule - deleted
// REMOVED: SwaggerAutoDocsModule - Swagger handled by decorators
import { SystemModule } from './modules/system/system.module';
// ==============================================
// Batch 4: High Side-Effect Modules
// ==============================================
// Webhooks & Integrations
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { Fire119Module } from './modules/fire-119/fire-119.module';
// REMOVED: SatelliteCommModule - requires specialized equipment
// AI & ML
import { FatigueDetectionModule } from './modules/fatigue-detection/fatigue-detection.module';
import { TranslationModule } from './modules/translation/translation.module';
// Scheduling & Dispatch
// Weather & Climate
import { TccipClimateModule } from './modules/tccip-climate/tccip-climate.module';
import { TrendPredictionModule } from './modules/trend-prediction/trend-prediction.module';
import { SocialMediaMonitorModule } from './modules/social-media-monitor/social-media-monitor.module';
// ==============================================
// P0: International NGO Standards (v5.0)
// ==============================================
import { HumanitarianStandardsModule } from './modules/humanitarian-standards/humanitarian-standards.module';
import { StaffSecurityModule } from './modules/staff-security/staff-security.module';
// ==============================================
// v5.1: Extended NGO Features
// ==============================================
import { ClusterCoordinationModule } from './modules/cluster-coordination/cluster-coordination.module';
import { DonorReportingModule } from './modules/donor-reporting/donor-reporting.module';
import { IcsFormsModule } from './modules/ics-forms/ics-forms.module';
import { InteroperabilityAdaptersModule } from './modules/interoperability-adapters/interoperability-adapters.module';
// ==============================================
// Batch 5: Remaining Infrastructure Modules (FINAL)
// ==============================================
// AR/VR
// Offline & Mobile
import { OfflineMeshModule } from './modules/offline-mesh/offline-mesh.module';
// Push Notifications
// LINE & Social - CONSOLIDATED into LineBotModule
// LineLiffModule and LineNotifyModule services are now provided by LineBotModule
// Blockchain & Security
import { IntegrityLedgerModule } from './modules/integrity-ledger/integrity-ledger.module';
// REMOVED: SupplyChainBlockchainModule - use traditional database
// REMOVED: GdprComplianceModule - consolidated to audit module
// Simulation & Training
import { DrillSimulationModule } from './modules/drill-simulation/drill-simulation.module';
// REMOVED: EvacuationSimModule - stub module deleted
// Specialty
// REMOVED: AarAnalysisModule, BimIntegrationModule, InsaragModule - stub modules deleted
// REMOVED: RobotRescueModule, SpectrumAnalysisModule - R&D/specialized equipment
import { WaterResourcesModule } from './modules/water-resources/water-resources.module';
// REMOVED: WearableModule - hardware dependent, use third-party API
// Communication
// REMOVED: BluetoothAudioModule - hardware dependent, use native app
// RealtimeChatModule - CONSOLIDATED into RealtimeModule
import { SpeechToTextModule } from './modules/speech-to-text/speech-to-text.module';
import { VoiceAssistantModule } from './modules/voice-assistant/voice-assistant.module';
// Infrastructure
import { SentryModule } from './modules/sentry/sentry.module';
// REMOVED: NfcModule - hardware dependent, use QR instead
// Note: GeoIntelModule has no module file (only agents subfolder)
// Resource Management
// Admin & Finance
// REMOVED: MultiTenantModule - consolidated to tenants module
import { PublicFinanceModule } from './modules/public-finance/public-finance.module';
import { ExpenseReimbursementModule } from './modules/expense-reimbursement/expense-reimbursement.module';
// Misc
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
// REMOVED: STUB_MODULES - all stub modules deleted
const STUB_MODULES: any[] = [];

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
            }]),

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
        LineBotModule,
        MenuConfigModule, // 📱 LINE 選單設定
        DonationsModule, // 💝 物資捐贈
        AnnouncementsModule, // 📢 公告系統
        ActivitiesModule, // 📅 活動報名
        CommunityModule, // 💬 社群牆
        AnalyticsModule, // 📊 AI 趨勢預測
        IntegrationsModule, // 🔗 外部 API 整合
        BackupModule, // 💾 數據備份
        TenantModule, // 🏢 多租戶
        // ==============================================
        // P0: International NGO Standards (v5.0)
        // ==============================================
        HumanitarianStandardsModule, // 🌍 人道主義標準 (HXL, IATI, 3W, Sphere)
        StaffSecurityModule, // 🛡️ 人員安全管理
        // ==============================================
        // v5.1: Extended NGO Features
        // ==============================================
        ClusterCoordinationModule, // 🤝 OCHA Cluster 協調 (4W)
        DonorReportingModule, // 💰 捐助者報告與補助款管理
        IcsFormsModule, // 📋 P0-1 FEMA ICS Forms (ICS-201 to ICS-214)
        InteroperabilityAdaptersModule, // 🔗 P1-3 Multi-Agency (CAP 1.2, EDXL-DE 2.0, NIEM)
        // PR3: 緊急應變核心模組
        MissionSessionsModule, // 🚨 任務場次 (ICS C2)
        FieldReportsModule, // 📡 現場回報 (GPS)
        OverlaysModule, // 🗺️ 戰術地圖圖層
        // PR4: 觀測性
        MetricsModule, // 📊 API 效能監控
        // PR5: 重構整併
        // PR6: P1 缺失模組 (E2E 閉環必需)
        TriageModule, // 🏥 檢傷分類 (START)
        LocationModule, // 📍 地理圍欄服務
        TaskDispatchModule, // 🔄 智慧任務派遣
        // Core Domains 聚合
        CoreDomainsModule, // 🏛️ 核心領域聚合
        // E2E Scenario Modules
        SheltersModule, // 🏠 避難所管理
        StructuralAssessmentModule, // 🏗️ 建物結構評估
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
        // REMOVED: ErrorTrackingModule - consolidated to SentryModule
        PrometheusModule, // 📊 Prometheus 監控
        // ==============================================
        // Batch 3: Low Side-Effect Modules (CRUD-only)
        // ==============================================
        // Dashboard & Visualization
        TimelineVisualizationModule, // 📅 時間軸視覺化
        // Reports
        PerformanceReportModule, // 📊 效能報告
        // Operations
        TacticalMapsModule, // 🗺️ 戰術地圖
        RoutingModule, // 🛣️ 路徑規劃
        // Community
        ReunificationModule, // 👨‍👩‍👧 家庭團聚
        PsychologicalSupportModule, // 🧠 心理支援
        // Volunteer
        VolunteerPointsModule, // ⭐ 志工積分
        VolunteerCertificationModule, // 🎓 志工認證
        // Equipment & Misc
        EquipmentQrModule, // 📱 裝備 QR 碼
        // REMOVED: MockDataModule, SwaggerAutoDocsModule - deleted
        SystemModule, // ⚙️ 系統管理
        // ==============================================
        // Batch 4: High Side-Effect Modules
        // ==============================================
        // Webhooks & Integrations
        WebhooksModule, // 🔗 Webhook 接收
        Fire119Module, // 🚒 119 消防整合
        // REMOVED: SatelliteCommModule - requires specialized equipment
        // AI & ML
        FatigueDetectionModule, // 😴 疲勞偵測
        TranslationModule, // 🌐 翻譯服務
        // Scheduling & Dispatch
        // Weather & Climate
        TccipClimateModule, // 🌦️ TCCIP 氣候資料
        TrendPredictionModule, // 📈 趨勢預測
        SocialMediaMonitorModule, // 📱 社群監控
        // ==============================================
        // Batch 5: Remaining Infrastructure Modules (FINAL)
        // ==============================================
        // AR/VR (CONDITIONALLY LOADED - see STUB_MODULES)
        //
        // Offline & Mobile
        OfflineMeshModule, // 🔗 Mesh 網路
        // Push Notifications
        // LINE & Social - CONSOLIDATED: LineLiffModule and LineNotifyModule merged into LineBotModule
        // Blockchain & Security
        IntegrityLedgerModule, // 📜 完整性帳本
        // SupplyChainBlockchainModule - moved to STUB_MODULES (conditionally loaded)
        DrillSimulationModule, // 🎯 演習模擬
        // REMOVED: EvacuationSimModule, GdprComplianceModule - stub modules deleted
        // Specialty
        // REMOVED: AarAnalysisModule, BimIntegrationModule, InsaragModule - stub modules deleted
        // REMOVED: RobotRescueModule, SpectrumAnalysisModule, WearableModule - R&D/hardware dependent
        WaterResourcesModule, // 💧 水資源
        // Communication
        // REMOVED: BluetoothAudioModule - hardware dependent
        // RealtimeChatModule - CONSOLIDATED into RealtimeModule
        SpeechToTextModule, // 🎤 語音轉文字
        VoiceAssistantModule, // 🗣️ 語音助理
        // Infrastructure
        SentryModule, // 🐛 Sentry 監控
        // REMOVED: NfcModule - hardware dependent, use QR instead
        // Resource Management
        // Admin & Finance
        // REMOVED: MultiTenantModule - consolidated to tenants
        PublicFinanceModule, // 💰 公共財務
        ExpenseReimbursementModule, // 💳 費用報銷
        // Misc
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
        }],
    exports: [CloudLoggerService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggingMiddleware)
            .forRoutes('*');
    }
}

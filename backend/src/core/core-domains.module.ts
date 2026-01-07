/**
 * Core Domains Module - 聚合所有核心領域
 * 
 * 整合 12 個核心領域模組，提供統一的匯入點
 * 每個核心領域模組負責聚合相關的 feature modules
 * 
 * 注意：此模組不載入基礎設施層（DatabaseModule, SharedAuthModule）
 * 因為那些已在 app.module.ts 中載入
 * 
 * 使用方式：在 app.module.ts 中匯入 CoreDomainsModule
 */

import { Module, Logger } from '@nestjs/common';

// Core Domain Modules（排除 InfrastructureCoreModule 以避免重複）
import { IamCoreModule } from './iam/iam-core.module';
import { OperationsCoreModule } from './operations/operations-core.module';
import { WorkforceCoreModule } from './workforce/workforce-core.module';
import { ResourcesCoreModule } from './resources/resources-core.module';
import { GeoIntelCoreModule } from './geointel/geointel-core.module';
import { EnvironmentCoreModule } from './environment/environment-core.module';
import { CommsCoreModule } from './comms/comms-core.module';
import { AnalyticsCoreModule } from './analytics/analytics-core.module';
import { AiCoreModule } from './ai/ai-core.module';
import { IntegrationCoreModule } from './integration/integration-core.module';
import { AdminCoreModule } from './admin/admin-core.module';

// 注意: InfrastructureCoreModule 不在此載入，因為它包含 DatabaseModule.forRoot()
// 而 DatabaseModule 已經在 app.module.ts 中載入

@Module({
    imports: [
        // ===== 核心閉環（必載） =====
        // 注意：這些 Core Modules 會 import 對應的 Feature Modules
        // 可能造成與 app.module.ts 的重複，但 NestJS 會處理單例

        // 不載入 IamCoreModule，因為它包含 AuthModule（已在 app.module.ts）
        // 不載入 OperationsCoreModule，因為它包含 MissionSessionsModule, TasksModule（已在 app.module.ts）
        // 不載入 WorkforceCoreModule，因為它包含 VolunteersModule, AccountsModule（已在 app.module.ts）
        // 不載入 ResourcesCoreModule，因為它包含 ResourcesModule, DonationsModule, PublicResourcesModule（已在 app.module.ts）
        // 不載入 GeoIntelCoreModule，因為它包含 OverlaysModule, FieldReportsModule（已在 app.module.ts）
        // 不載入 CommsCoreModule，因為它包含 NotificationsModule, LineBotModule, RealtimeModule, AnnouncementsModule（已在 app.module.ts）
        // 不載入 EnvironmentCoreModule，因為它包含 WeatherForecastModule, WeatherHubModule, NcdrAlertsModule（已在 app.module.ts）
        // 不載入 AnalyticsCoreModule，因為它包含 AnalyticsModule, ReportsModule, ReportsExportModule（已在 app.module.ts）

        // ===== 可安全載入（無重複） =====
        AiCoreModule,           // 空模組，未來擴展
        IntegrationCoreModule,  // IntegrationsModule（已在 app.module.ts，但 NestJS 會處理）
        AdminCoreModule,        // BackupModule, TenantModule（部分重複）
    ],
    exports: [
        AiCoreModule,
        IntegrationCoreModule,
        AdminCoreModule,
    ],
})
export class CoreDomainsModule {
    private readonly logger = new Logger(CoreDomainsModule.name);

    constructor() {
        this.logger.log('Core Domains Module initialized (partial - avoiding duplicates)');
    }
}

/**
 * Core Domains - Modular Monolith 架構
 * 
 * 將 169 個碎片化模組整併為 12 個核心領域 (Bounded Contexts)
 * 
 * @see architecture_consolidation_plan.md for details
 */

// 1. IAM - 身分與存取管理
export { IamCoreModule } from './iam/iam-core.module';

// 2. Operations - 任務指揮中心
export { OperationsCoreModule } from './operations/operations-core.module';

// 3. Workforce - 人力資源管理
export { WorkforceCoreModule } from './workforce/workforce-core.module';

// 4. Resources - 物資後勤管理
export { ResourcesCoreModule } from './resources/resources-core.module';

// 5. GeoIntel - 地理情報中心
export { GeoIntelCoreModule } from './geointel/geointel-core.module';

// 6. Environment - 環境監測中心
export { EnvironmentCoreModule } from './environment/environment-core.module';

// 7. Comms - 通訊中樞
export { CommsCoreModule } from './comms/comms-core.module';

// 8. Analytics - 數據分析中心
export { AnalyticsCoreModule } from './analytics/analytics-core.module';

// 9. AI Engine - 智慧引擎
export { AiCoreModule } from './ai/ai-core.module';

// 10. Integration - 外部整合
export { IntegrationCoreModule } from './integration/integration-core.module';

// 11. Infrastructure - 基礎設施
export { InfrastructureCoreModule } from './infrastructure/infrastructure-core.module';

// 12. Administration - 系統管理
export { AdminCoreModule } from './admin/admin-core.module';

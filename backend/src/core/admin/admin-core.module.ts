/**
 * Administration Core Module - 系統管理
 * 
 * 整合模組: tenants, multi-tenant, org-chart, menu-config, features,
 *           audit, audit-log, access-log, error-tracking, sentry,
 *           prometheus, metrics, integrity-ledger, blockchain, backup
 * 
 * 職責:
 * - 多租戶管理
 * - 組織架構
 * - 稽核日誌
 * - 系統備份
 * - 監控告警
 */

import { Module } from '@nestjs/common';
import { TenantModule } from '../../modules/tenants/tenant.module';
import { MenuConfigModule } from '../../modules/menu-config/menu-config.module';
import { BackupModule } from '../../modules/backup/backup.module';

@Module({
    imports: [
        TenantModule,
        MenuConfigModule,BackupModule,
        // 未來整合: AuditModule, OrgChartModule, etc.
    ],
    exports: [TenantModule, MenuConfigModule,BackupModule],
})
export class AdminCoreModule { }

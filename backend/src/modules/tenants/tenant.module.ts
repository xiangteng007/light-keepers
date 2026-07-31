/**
 * Tenant Module —— 組織資料管理（Organization Profile Management）
 *
 * 【定位（2026-08-01, D9 / DA-2 單租戶降級後）】
 * 本模組**不再**用於多租戶隔離。平台已正式定位為單租戶（單一協會自用），
 * 詳見 docs/adr/ADR-001-multi-tenant-isolation.md（已標記 Superseded）。
 *
 * 現行職責：管理**協會自身**的組織資料——
 *   - 組織檔案（名稱、代碼、聯絡資訊、品牌 logo / 主色）
 *   - 成員名冊與組織內角色（TenantMember）
 *   - 方案（plan）與功能配額（quota）設定
 *
 * 【命名說明】
 * 「Tenant」為歷史名稱。模組／控制器／路由（/tenants）刻意維持原名以避免
 * API breaking change；請以本註解與 ADR-001 的新定位為準，勿據名稱推論
 * 系統具備跨租戶隔離能力——**它沒有**。
 *
 * 授權邊界由 RBAC（ADR-005）與 ResourceOwnerGuard（ADR-003）承擔。
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant, TenantMember } from './tenant.entity';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

@Module({
    imports: [TypeOrmModule.forFeature([Tenant, TenantMember])],
    controllers: [TenantController],
    providers: [TenantService],
    exports: [TenantService],
})
export class TenantModule { }

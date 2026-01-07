/**
 * Resources Core Module - 物資後勤管理
 * 
 * 整合模組: resources, equipment, equipment-qr, donations,
 *           donation-tracking, public-resources, water-resources,
 *           resource-matching, resource-optimization,
 *           supply-chain-blockchain, predictive-maintenance
 * 
 * 職責:
 * - 物資庫存管理
 * - 設備追蹤 (QR Code)
 * - 捐贈流程
 * - 資源媒合與優化
 */

import { Module } from '@nestjs/common';
import { ResourcesModule } from '../../modules/resources/resources.module';
import { DonationsModule } from '../../modules/donations/donations.module';
import { PublicResourcesModule } from '../../modules/public-resources/public-resources.module';

@Module({
    imports: [
        ResourcesModule,
        DonationsModule,
        PublicResourcesModule,
        // 未來整合: EquipmentModule, etc.
    ],
    exports: [ResourcesModule, DonationsModule, PublicResourcesModule],
})
export class ResourcesCoreModule { }

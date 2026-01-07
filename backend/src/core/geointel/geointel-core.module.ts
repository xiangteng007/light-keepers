/**
 * GeoIntel Core Module - 地理情報中心
 * 
 * 整合模組: location, tactical-maps, overlays, geofence-alert,
 *           indoor-positioning, cesium-3d, routing,
 *           offline-map-cache, offline-tiles
 * 
 * 職責:
 * - 地圖服務
 * - GPS 位置追蹤
 * - 戰術圖層管理
 * - 地理圍欄警報
 * - 離線地圖支援
 */

import { Module } from '@nestjs/common';
import { OverlaysModule } from '../../modules/overlays/overlays.module';
import { FieldReportsModule } from '../../modules/field-reports/field-reports.module';

@Module({
    imports: [
        OverlaysModule,
        FieldReportsModule,
        // 未來整合: LocationModule, TacticalMapsModule, etc.
    ],
    exports: [OverlaysModule, FieldReportsModule],
})
export class GeoIntelCoreModule { }

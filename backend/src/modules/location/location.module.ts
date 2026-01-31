/**
 * Location Module (Unified Geo Platform)
 * 
 * 整合所有地理位置相關功能：
 * - 地理圍欄
 * - 室內定位
 * - 路由規劃
 * - 3D 地圖
 * - 地理情報
 * 
 * 取代舊模組：geofence-alert, indoor-positioning, geo-intel, cesium-3d
 */

import { Module, Global } from '@nestjs/common';
import { GeofencingService } from './geofencing.service';
import { GeofencingController } from './geofencing.controller';
import { IndoorPositioningService } from './services/indoor-positioning.service';
import { RoutingService } from './services/routing.service';
import { Map3DService } from './services/map-3d.service';

@Global()
@Module({
    providers: [
        GeofencingService,
        IndoorPositioningService,
        RoutingService,
        Map3DService,
    ],
    controllers: [GeofencingController],
    exports: [GeofencingService, IndoorPositioningService, RoutingService, Map3DService],
})
export class LocationModule { }

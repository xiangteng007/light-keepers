/**
 * Tactical Maps Module
 * Phase 6.1: 3D 戰術沙盤與視域分析
 * 
 * 後端 API 支援:
 * 1. 3D 建築物資料
 * 2. 視域分析計算
 * 3. 戰術標記 CRUD
 * 4. Mapbox 地圖服務 (v6.0)
 * 5. INSARAG 標記 (Phase 4)
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TacticalMarker } from './entities/tactical-marker.entity';
import { TacticalMapsService } from './tactical-maps.service';
import { TacticalMapsController } from './tactical-maps.controller';
import { MapboxService } from './services/mapbox.service';
import { InsaragMarkingService } from './insarag-marking.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TacticalMarker]),
        EventEmitterModule.forRoot(),
        forwardRef(() => AuthModule), // For JwtAuthGuard
    ],
    controllers: [TacticalMapsController],
    providers: [
        TacticalMapsService, 
        MapboxService,
        InsaragMarkingService,
    ],
    exports: [
        TacticalMapsService, 
        MapboxService,
        InsaragMarkingService,
    ],
})
export class TacticalMapsModule { }



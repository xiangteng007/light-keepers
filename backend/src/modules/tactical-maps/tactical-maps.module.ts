/**
 * Tactical Maps Module
 * Phase 6.1: 3D 戰術沙盤與視域分析
 * 
 * 後端 API 支援:
 * 1. 3D 建築物資料
 * 2. 視域分析計算
 * 3. 戰術標記 CRUD
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TacticalMarker } from './entities/tactical-marker.entity';
import { TacticalMapsService } from './tactical-maps.service';
import { TacticalMapsController } from './tactical-maps.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([TacticalMarker]),
        forwardRef(() => AuthModule), // For JwtAuthGuard
    ],
    controllers: [TacticalMapsController],
    providers: [TacticalMapsService],
    exports: [TacticalMapsService],
})
export class TacticalMapsModule { }

/**
 * 演練模擬模組 (Drill Simulation Module)
 * 模組 A: NestJS 模組註冊
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DrillScenario } from './entities/drill-scenario.entity';
import { DrillSimulationService } from './drill.service';
import { DrillController } from './drill.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrillScenario]),
        EventEmitterModule.forRoot(),
    ],
    controllers: [DrillController],
    providers: [DrillSimulationService],
    exports: [DrillSimulationService],
})
export class DrillSimulationModule { }

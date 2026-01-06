/**
 * Drone Operations Module
 * Phase 6.4: 無人機操作
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DroneOpsService } from './drone-ops.service';

@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [DroneOpsService],
    exports: [DroneOpsService],
})
export class DroneOpsModule { }

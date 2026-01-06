/**
 * Indoor Positioning Module
 * Phase 6.2: 室內藍軍追蹤
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { IndoorPositioningService } from './indoor-positioning.service';

@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [IndoorPositioningService],
    exports: [IndoorPositioningService],
})
export class IndoorPositioningModule { }

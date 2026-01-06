/**
 * AI Vision Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AiVisionService } from './ai-vision.service';

@Module({
    imports: [ConfigModule, EventEmitterModule.forRoot()],
    providers: [AiVisionService],
    exports: [AiVisionService],
})
export class AiVisionModule { }

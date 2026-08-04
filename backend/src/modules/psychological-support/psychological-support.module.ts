/**
 * 心理支持模組 (Psychological Support Module)
 * 模組 C: NestJS 模組註冊
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MoodLog, BlessingMessage, PFAChatLog } from './entities/mood-log.entity';
import { MoodTrackerService } from './mood-tracker.service';
import { PFAChatbotService } from './pfa-chatbot.service';
import { MoodTrackerController } from './mood-tracker.controller';
import { LlmModule } from '../ai-queue/providers/llm.module';

@Module({
    imports: [
        LlmModule,
        TypeOrmModule.forFeature([MoodLog, BlessingMessage, PFAChatLog]),
        EventEmitterModule.forRoot(),
    ],
    controllers: [MoodTrackerController],
    providers: [MoodTrackerService, PFAChatbotService],
    exports: [MoodTrackerService, PFAChatbotService],
})
export class PsychologicalSupportModule { }

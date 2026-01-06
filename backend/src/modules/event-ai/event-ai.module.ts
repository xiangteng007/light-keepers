import { Module } from '@nestjs/common';
import { EventAiService } from './event-ai.service';
import { EventAiController } from './event-ai.controller';

@Module({
    providers: [EventAiService],
    controllers: [EventAiController],
    exports: [EventAiService],
})
export class EventAiModule { }

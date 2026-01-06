import { Module } from '@nestjs/common';
import { VoiceAssistantService } from './voice-assistant.service';

@Module({
    providers: [VoiceAssistantService],
    exports: [VoiceAssistantService],
})
export class VoiceAssistantModule { }

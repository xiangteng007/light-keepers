/**
 * Voice Module
 * Phase 5.2: 語音轉文字戰術日誌
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceTranscriptionService } from './voice-transcription.service';
import { VoiceController } from './voice.controller';

@Module({
    imports: [ConfigModule],
    controllers: [VoiceController],
    providers: [VoiceTranscriptionService],
    exports: [VoiceTranscriptionService],
})
export class VoiceModule { }

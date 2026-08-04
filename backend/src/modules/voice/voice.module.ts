/**
 * Voice Module
 * Phase 5.2: 語音轉文字戰術日誌
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceTranscriptionService } from './voice-transcription.service';
import { VoiceController } from './voice.controller';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../ai-queue/providers/llm.module';

@Module({
    imports: [
        LlmModule,
        ConfigModule,
        forwardRef(() => AuthModule), // For AuthService / JwtModule (原註解寫 JwtAuthGuard，該 guard 已於 1.6 收斂中移除)
    ],
    controllers: [VoiceController],
    providers: [VoiceTranscriptionService],
    exports: [VoiceTranscriptionService],
})
export class VoiceModule { }

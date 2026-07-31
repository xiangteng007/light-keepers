/**
 * Voice Module
 * Phase 5.2: 語音轉文字戰術日誌
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoiceTranscriptionService } from './voice-transcription.service';
import { VoiceController } from './voice.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        ConfigModule,
        forwardRef(() => AuthModule), // For AuthService / JwtModule (原註解寫 JwtAuthGuard，該 guard 已於 1.6 收斂中移除)
    ],
    controllers: [VoiceController],
    providers: [VoiceTranscriptionService],
    exports: [VoiceTranscriptionService],
})
export class VoiceModule { }

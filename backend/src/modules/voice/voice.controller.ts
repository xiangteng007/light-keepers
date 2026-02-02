/**
 * Voice Controller
 * Phase 5.2: 語音轉文字 API Endpoints
 */

import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { VoiceTranscriptionService } from './voice-transcription.service';

@ApiTags('voice')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@Controller('voice')
export class VoiceController {
    constructor(private readonly voiceService: VoiceTranscriptionService) { }

    @Post(':missionSessionId/upload')
    @UseInterceptors(FileInterceptor('audio'))
    @ApiOperation({ summary: '上傳語音並轉錄' })
    @ApiParam({ name: 'missionSessionId', description: '任務場次 ID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                audio: { type: 'string', format: 'binary' },
                speakerId: { type: 'string' },
                speakerName: { type: 'string' },
            },
        },
    })
    async uploadVoice(
        @Param('missionSessionId') missionSessionId: string,
        @UploadedFile() file: { buffer: Buffer; mimetype: string },
        @Body() body: { speakerId?: string; speakerName?: string }
    ) {
        return this.voiceService.processAudioUpload(
            missionSessionId,
            file.buffer,
            body.speakerId,
            body.speakerName,
            file.mimetype
        );
    }

    @Get(':missionSessionId/logs')
    @ApiOperation({ summary: '取得任務的語音記錄' })
    @ApiParam({ name: 'missionSessionId', description: '任務場次 ID' })
    async getVoiceLogs(@Param('missionSessionId') missionSessionId: string) {
        return this.voiceService.getVoiceLogs(missionSessionId);
    }

    @Get(':missionSessionId/logs/:logId')
    @ApiOperation({ summary: '取得單一語音記錄' })
    @ApiParam({ name: 'missionSessionId', description: '任務場次 ID' })
    @ApiParam({ name: 'logId', description: '語音記錄 ID' })
    async getVoiceLog(
        @Param('missionSessionId') missionSessionId: string,
        @Param('logId') logId: string
    ) {
        return this.voiceService.getVoiceLog(missionSessionId, logId);
    }

    @Get(':missionSessionId/sitrep')
    @ApiOperation({ summary: '生成 SITREP 草稿' })
    @ApiParam({ name: 'missionSessionId', description: '任務場次 ID' })
    async generateSITREP(@Param('missionSessionId') missionSessionId: string) {
        return this.voiceService.generateSITREP(missionSessionId);
    }
}

/**
 * Voice Call Controller
 * REST API endpoints for voice call management
 */

import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { VoiceCallService } from './voice-call.service';

// 定級理由：語音通話涉及通聯個資與對外主動撥打。
// 線上名單與 TURN 認證是撥打前的必要資訊，屬第一線通訊需求 → L1
//   （註：`turn-credentials` 會回傳 TURN 伺服器密鑰，理想上應改為 time-limited HMAC，
//    目前直接回傳 TURN_SERVER_SECRET，屬既有缺陷，已另列後續項；此處先以 L1 擋住匿名與 L0 帳號）。
// 透過 LINE 對特定人發起通話邀請、對整個任務廣播訊息 → 主動觸及他人且不可回收 → L2。
// 通話統計為營運指標 → L2。class 基準取 L2。
@ApiTags('voice')
@Controller('api/voice')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class VoiceCallController {
    constructor(private readonly voiceService: VoiceCallService) { }

    @Get('users/online')
    @ApiOperation({ summary: '取得線上使用者列表' })
    @ApiResponse({ status: 200, description: '成功取得線上使用者' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getOnlineUsers() {
        return {
            success: true,
            data: this.voiceService.getOnlineUsers(),
        };
    }

    @Get('stats')
    @ApiOperation({ summary: '取得語音通話統計' })
    async getStats() {
        return {
            success: true,
            data: {
                onlineUsers: this.voiceService.getOnlineUsers().length,
                activeCalls: this.voiceService.getActiveCallsCount(),
            },
        };
    }

    @Post('call/line')
    @ApiOperation({ summary: '通過 LINE 發起語音通話邀請' })
    @ApiResponse({ status: 200, description: '通話邀請已發送' })
    async initiateLineCall(
        @Body() body: { lineUserId: string; callerId: string; missionId?: string }
    ) {
        const result = await this.voiceService.initiateLineCall(
            body.lineUserId,
            body.callerId,
            body.missionId
        );

        return {
            success: result.success,
            data: { callbackUrl: result.callbackUrl },
            message: result.success ? '通話邀請已發送至 LINE' : '發送失敗',
        };
    }

    @Post('broadcast/:missionId')
    @ApiOperation({ summary: '向任務相關人員廣播訊息' })
    async broadcastToMission(
        @Param('missionId') missionId: string,
        @Body() body: { message: string }
    ) {
        const sentCount = await this.voiceService.broadcastToMission(
            missionId,
            body.message
        );

        return {
            success: true,
            data: { recipientCount: sentCount },
            message: `已廣播至 ${sentCount} 位使用者`,
        };
    }

    @Get('turn-credentials')
    @ApiOperation({ summary: '取得 TURN 伺服器認證資訊' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getTurnCredentials() {
        // Generate time-limited TURN credentials
        const timestamp = Math.floor(Date.now() / 1000) + 86400; // 24 hours
        const username = `${timestamp}:lightkeepers`;

        return {
            success: true,
            data: {
                urls: [
                    'stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302',
                    process.env.TURN_SERVER_URL || 'turn:turn.lightkeepers.org:3478',
                ],
                username,
                credential: process.env.TURN_SERVER_SECRET || 'demo-secret',
                credentialType: 'password',
            },
        };
    }
}

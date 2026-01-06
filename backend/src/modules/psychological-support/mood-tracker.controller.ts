/**
 * 心情追蹤控制器
 * 模組 C: REST API
 */

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MoodTrackerService } from './mood-tracker.service';
import { PFAChatbotService } from './pfa-chatbot.service';

@ApiTags('care')
@Controller('api/care')
export class MoodTrackerController {
    constructor(
        private readonly moodService: MoodTrackerService,
        private readonly chatbotService: PFAChatbotService,
    ) { }

    // ==================== 心情記錄 ====================

    @Post('mood')
    @ApiOperation({ summary: '記錄心情分數' })
    async logMood(
        @Body() body: {
            userId: string;
            score: number;
            tags?: string[];
            note?: string;
            taskId?: string;
        }
    ) {
        const log = await this.moodService.logMood(body);
        return {
            success: true,
            data: log,
            message: '心情已記錄 💙',
        };
    }

    @Get('mood/history/:userId')
    @ApiOperation({ summary: '取得心情歷史' })
    async getMoodHistory(
        @Param('userId') userId: string,
        @Query('days') days?: string
    ) {
        const history = await this.moodService.getUserMoodHistory(
            userId,
            parseInt(days || '30')
        );
        return {
            success: true,
            data: history,
        };
    }

    @Get('mood/summary/:userId')
    @ApiOperation({ summary: '取得心情摘要' })
    async getMoodSummary(@Param('userId') userId: string) {
        const summary = await this.moodService.getUserMoodSummary(userId);
        return {
            success: true,
            data: summary,
        };
    }

    @Get('mood/team-trend')
    @ApiOperation({ summary: '取得團隊心情趨勢' })
    async getTeamTrend(@Query('days') days?: string) {
        const trend = await this.moodService.getTeamMoodTrend(
            parseInt(days || '14')
        );
        return {
            success: true,
            data: trend,
        };
    }

    @Get('mood/attention')
    @ApiOperation({ summary: '取得需關注的使用者' })
    async getUsersNeedingAttention() {
        const users = await this.moodService.getUsersNeedingAttention();
        return {
            success: true,
            data: users,
        };
    }

    // ==================== 祈福牆 ====================

    @Get('blessings')
    @ApiOperation({ summary: '取得祈福牆訊息' })
    async getBlessings(@Query('limit') limit?: string) {
        const blessings = await this.moodService.getBlessings(
            parseInt(limit || '50')
        );
        return {
            success: true,
            data: blessings,
        };
    }

    @Post('blessings')
    @ApiOperation({ summary: '發送祝福訊息' })
    async postBlessing(
        @Body() body: {
            userId?: string;
            displayName: string;
            message: string;
            iconType?: string;
        }
    ) {
        const blessing = await this.moodService.postBlessing(body);
        return {
            success: true,
            data: blessing,
            message: '祝福已送出 ✨',
        };
    }

    @Post('blessings/:id/like')
    @ApiOperation({ summary: '按讚祝福訊息' })
    async likeBlessing(@Param('id') id: string) {
        await this.moodService.likeBlessing(id);
        return {
            success: true,
            message: '已按讚',
        };
    }

    // ==================== AI 聊天 ====================

    @Post('chat')
    @ApiOperation({ summary: '與 HopeBot 對話' })
    async chat(
        @Body() body: {
            userId: string;
            sessionId: string;
            message: string;
        }
    ) {
        const result = await this.chatbotService.chat(
            body.userId,
            body.sessionId,
            body.message
        );
        return {
            success: true,
            data: result,
        };
    }

    @Get('chat/history/:userId')
    @ApiOperation({ summary: '取得對話歷史' })
    async getChatHistory(
        @Param('userId') userId: string,
        @Query('sessionId') sessionId?: string
    ) {
        const history = await this.chatbotService.getChatHistory(userId, sessionId);
        return {
            success: true,
            data: history,
        };
    }

    @Post('chat/new-session')
    @ApiOperation({ summary: '開始新對話' })
    async startNewSession(@Body() body: { sessionId: string }) {
        const greeting = this.chatbotService.startNewSession(body.sessionId);
        return {
            success: true,
            data: { greeting },
        };
    }

    // ==================== 統計 ====================

    @Get('stats')
    @ApiOperation({ summary: '取得心理支持統計' })
    async getStats() {
        const [moodStats, chatStats] = await Promise.all([
            this.moodService.getStats(),
            this.chatbotService.getStats(),
        ]);

        return {
            success: true,
            data: {
                mood: moodStats,
                chat: chatStats,
            },
        };
    }
}

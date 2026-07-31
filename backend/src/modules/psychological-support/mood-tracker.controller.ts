/**
 * 心情追蹤控制器
 * 模組 C: REST API
 */

import { Controller, Get, Post, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { SensitiveDataInterceptor } from '../../common/interceptors/sensitive-data.interceptor';
import { MoodTrackerService } from './mood-tracker.service';
import { PFAChatbotService } from './pfa-chatbot.service';

// 定級理由：心理健康屬特種個資，分級以「本人 vs 他人」為軸而非以讀寫為軸。
// 本人記錄/查閱心情、與 HopeBot 對話、祈福牆互動＝自助療癒功能，第一線志工必須可用 → L1
//   （對應前台 care/MyMoodPage，若拉高等級等同讓最需要支持的基層志工用不到）。
// 跨人員的心理健康彙整（團隊趨勢、需關注名單、統計）屬「讀他人特種個資」，且「需關注名單」
//   直接點名高風險個人，外洩會造成二次傷害 → 收緊 L3（常務理事，對齊 sensitive-audit 的 L3 閘門）。
// 殘留風險：mood/chat 相關端點以 path param 帶 userId 且無擁有者比對，L1 仍可查他人心情與對話紀錄
//   （IDOR），這是本模組最高風險項，須另案以 ResourceOwnerGuard／改由 JWT 取 userId 修補。
// 🔐 F-M2 敏感資料遮罩：心理健康屬特種個資，此處掛載可讓夾帶的聯絡欄位（如需關注名單附帶的
// 電話／Email）對 L1-L2 遮罩。注意這不會遮罩 mood 分數本身，上方註記的 IDOR 殘留風險仍須另案修補。
@ApiTags('care')
@Controller('api/care')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@UseInterceptors(SensitiveDataInterceptor)
@RequiredLevel(ROLE_LEVELS.DIRECTOR)
export class MoodTrackerController {
    constructor(
        private readonly moodService: MoodTrackerService,
        private readonly chatbotService: PFAChatbotService,
    ) { }

    // ==================== 心情記錄 ====================

    @Post('mood')
    @ApiOperation({ summary: '記錄心情分數' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getMoodSummary(@Param('userId') userId: string) {
        const summary = await this.moodService.getUserMoodSummary(userId);
        return {
            success: true,
            data: summary,
        };
    }

    @Get('mood/team-trend')
    @ApiOperation({ summary: '取得團隊心情趨勢' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
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
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
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
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
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

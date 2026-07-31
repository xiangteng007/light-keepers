/**
 * AAR Controller (After Action Review)
 * 事後復盤 API
 */

import { Controller, Get, Post, Put, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { AARService } from './aar.service';
import { DecisionReview, LessonLearned } from './entities/aar.entity';

// 定級理由：AAR（事後復盤）內含決策檢討與失誤紀錄，會指名個別幹部的判斷對錯，屬課責性文件 → class 基準 L2。
// 「定稿」是把復盤結論固化為組織正式紀錄（含對人的評價），屬管理階層決定 → 收緊 L3。
// 讀取類（AAR 內容、時間軸、統計、匯出）為全員學習用途，且封存後即為訓練教材 → 放寬 L1。
@ApiTags('aar')
@Controller('api/missions/:sessionId/aar')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
@ApiBearerAuth()
export class AARController {
    constructor(private readonly aarService: AARService) { }

    @Get()
    @ApiOperation({ summary: '取得 AAR' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getAAR(@Param('sessionId') sessionId: string) {
        const aar = await this.aarService.getAAR(sessionId);
        return { success: true, data: aar };
    }

    @Post()
    @ApiOperation({ summary: '建立 AAR' })
    async createAAR(
        @Param('sessionId') sessionId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const aar = await this.aarService.createAAR(sessionId, req.user?.uid || 'system');
        return { success: true, data: aar, message: 'AAR 已建立' };
    }

    @Post('generate')
    @ApiOperation({ summary: 'AI 自動生成 AAR 草稿' })
    async generateAAR(
        @Param('sessionId') sessionId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const aar = await this.aarService.generateAARDraft(sessionId, req.user?.uid || 'system');
        return { success: true, data: aar, message: 'AAR 草稿已生成' };
    }

    @Get('timeline')
    @ApiOperation({ summary: '生成時間軸' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getTimeline(@Param('sessionId') sessionId: string) {
        const timeline = await this.aarService.generateTimeline(sessionId);
        return { success: true, data: timeline };
    }

    @Get('statistics')
    @ApiOperation({ summary: '生成統計數據' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getStatistics(@Param('sessionId') sessionId: string) {
        const statistics = await this.aarService.generateStatistics(sessionId);
        return { success: true, data: statistics };
    }

    @Put(':aarId')
    @ApiOperation({ summary: '更新 AAR' })
    async updateAAR(
        @Param('aarId') aarId: string,
        @Body() body: {
            executiveSummary?: string;
            decisionsReview?: DecisionReview[];
            lessonsLearned?: LessonLearned[];
            recommendations?: string[];
            successes?: string[];
            challenges?: string[];
        },
    ) {
        const aar = await this.aarService.updateAAR(aarId, body);
        return { success: true, data: aar };
    }

    @Post(':aarId/finalize')
    @ApiOperation({ summary: '定稿 AAR' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async finalizeAAR(
        @Param('aarId') aarId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const aar = await this.aarService.finalizeAAR(aarId, req.user?.uid || 'system');
        return { success: true, data: aar, message: 'AAR 已定稿' };
    }

    @Get(':aarId/export')
    @ApiOperation({ summary: '匯出 AAR' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async exportAAR(@Param('aarId') aarId: string) {
        const data = await this.aarService.exportAAR(aarId);
        return { success: true, data };
    }
}

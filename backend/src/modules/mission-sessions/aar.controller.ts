/**
 * AAR Controller (After Action Review)
 * 事後復盤 API
 */

import { Controller, Get, Post, Put, Body, Param, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AARService } from './aar.service';
import { DecisionReview, LessonLearned } from './entities/aar.entity';

@ApiTags('aar')
@Controller('api/missions/:sessionId/aar')
@ApiBearerAuth()
export class AARController {
    constructor(private readonly aarService: AARService) { }

    @Get()
    @ApiOperation({ summary: '取得 AAR' })
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
    async getTimeline(@Param('sessionId') sessionId: string) {
        const timeline = await this.aarService.generateTimeline(sessionId);
        return { success: true, data: timeline };
    }

    @Get('statistics')
    @ApiOperation({ summary: '生成統計數據' })
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
    async finalizeAAR(
        @Param('aarId') aarId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const aar = await this.aarService.finalizeAAR(aarId, req.user?.uid || 'system');
        return { success: true, data: aar, message: 'AAR 已定稿' };
    }

    @Get(':aarId/export')
    @ApiOperation({ summary: '匯出 AAR' })
    async exportAAR(@Param('aarId') aarId: string) {
        const data = await this.aarService.exportAAR(aarId);
        return { success: true, data };
    }
}

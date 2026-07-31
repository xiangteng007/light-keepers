/**
 * SITREP Controller (Situation Report)
 * 情勢報告與決策紀錄 API
 */

import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { SITREPService } from './sitrep.service';
import { DecisionType } from './entities/decision-log.entity';
import { KeyEvent, ResourceStatus } from './entities/sitrep.entity';

// 定級理由：SITREP 含傷亡數字（casualties）與資源缺口，未經核准即外流會造成錯誤情資與家屬恐慌 → class 基準 L2。
// 「核准 SITREP」＝對外發布定稿情勢報告，屬指揮官發言權 → 收緊 L3。
// 讀取 SITREP／決策紀錄是全隊掌握現況與追溯決策脈絡的依據 → 放寬 L1（決策紀錄的可追溯性本身即為課責機制）。
@ApiTags('sitrep')
@Controller('api/missions/:sessionId/sitrep')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
@ApiBearerAuth()
export class SITREPController {
    constructor(private readonly sitrepService: SITREPService) { }

    // ==================== SITREP ====================

    @Get()
    @ApiOperation({ summary: '取得所有 SITREP' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getSITREPs(@Param('sessionId') sessionId: string) {
        const sitreps = await this.sitrepService.getSITREPs(sessionId);
        return { success: true, data: sitreps };
    }

    @Post()
    @ApiOperation({ summary: '建立 SITREP' })
    async createSITREP(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            operationalPeriodId?: string;
            periodStart: string;
            periodEnd: string;
            summary?: string;
        },
        @Req() req: AuthenticatedRequest,
    ) {
        const sitrep = await this.sitrepService.createSITREP({
            missionSessionId: sessionId,
            operationalPeriodId: body.operationalPeriodId,
            periodStart: new Date(body.periodStart),
            periodEnd: new Date(body.periodEnd),
            summary: body.summary,
            createdBy: req.user?.uid || 'system',
        });
        return { success: true, data: sitrep, message: 'SITREP 已建立' };
    }

    @Post('generate')
    @ApiOperation({ summary: 'AI 自動生成 SITREP 草稿' })
    async generateSITREP(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            periodStart: string;
            periodEnd: string;
        },
        @Req() req: AuthenticatedRequest,
    ) {
        const sitrep = await this.sitrepService.generateSITREPDraft(
            sessionId,
            new Date(body.periodStart),
            new Date(body.periodEnd),
            req.user?.uid || 'system',
        );
        return { success: true, data: sitrep, message: 'SITREP 草稿已生成' };
    }

    @Put(':sitrepId')
    @ApiOperation({ summary: '更新 SITREP' })
    async updateSITREP(
        @Param('sitrepId') sitrepId: string,
        @Body() body: {
            summary?: string;
            keyEvents?: KeyEvent[];
            resourceStatus?: ResourceStatus[];
            casualties?: Record<string, number>;
            nextActions?: string[];
            requests?: { type: string; description: string; priority: number }[];
        },
    ) {
        const sitrep = await this.sitrepService.updateSITREP(sitrepId, body);
        return { success: true, data: sitrep };
    }

    @Post(':sitrepId/approve')
    @ApiOperation({ summary: '核准 SITREP' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async approveSITREP(
        @Param('sitrepId') sitrepId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const sitrep = await this.sitrepService.approveSITREP(sitrepId, req.user?.uid || 'system');
        return { success: true, data: sitrep, message: 'SITREP 已核准' };
    }

    // ==================== Decision Log ====================

    @Get('decisions')
    @ApiOperation({ summary: '取得決策紀錄' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getDecisions(
        @Param('sessionId') sessionId: string,
        @Query('type') decisionType?: DecisionType,
        @Query('limit') limit?: string,
    ) {
        const decisions = await this.sitrepService.getDecisions(sessionId, {
            decisionType,
            limit: limit ? parseInt(limit) : undefined,
        });
        return { success: true, data: decisions };
    }

    @Post('decisions')
    @ApiOperation({ summary: '記錄決策' })
    async logDecision(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            decisionType: DecisionType;
            description: string;
            rationale?: string;
            relatedEntityType?: string;
            relatedEntityId?: string;
            aiAssisted?: boolean;
            aiJobId?: string;
            aiConfidence?: number;
            beforeState?: Record<string, any>;
            afterState?: Record<string, any>;
        },
        @Req() req: AuthenticatedRequest,
    ) {
        const decision = await this.sitrepService.logDecision({
            missionSessionId: sessionId,
            ...body,
            decidedBy: req.user?.uid || 'system',
            decidedByName: req.user?.displayName,
        });
        return { success: true, data: decision, message: '決策已記錄' };
    }

    @Get('decisions/entity/:entityType/:entityId')
    @ApiOperation({ summary: '取得特定實體的相關決策' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async getDecisionsForEntity(
        @Param('entityType') entityType: string,
        @Param('entityId') entityId: string,
    ) {
        const decisions = await this.sitrepService.getDecisionsForEntity(entityType, entityId);
        return { success: true, data: decisions };
    }
}

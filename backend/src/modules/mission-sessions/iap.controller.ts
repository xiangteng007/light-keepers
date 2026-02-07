/**
 * IAP Controller (Incident Action Plan)
 * 作戰週期與 IAP 文件管理 API
 */

import { Controller, Get, Post, Put, Body, Param, Query, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IAPService } from './iap.service';
import { IAPDocumentType } from './entities/iap-document.entity';
import { Objective, RiskAssessment, ResourceAllocation } from './entities/operational-period.entity';

@ApiTags('iap')
@Controller('api/missions/:sessionId/iap')
@ApiBearerAuth()
export class IAPController {
    constructor(private readonly iapService: IAPService) { }

    // ==================== Operational Periods ====================

    @Get('periods')
    @ApiOperation({ summary: '取得所有作戰週期' })
    async getPeriods(@Param('sessionId') sessionId: string) {
        const periods = await this.iapService.getPeriods(sessionId);
        return { success: true, data: periods };
    }

    @Get('periods/active')
    @ApiOperation({ summary: '取得目前活躍的作戰週期' })
    async getActivePeriod(@Param('sessionId') sessionId: string) {
        const period = await this.iapService.getActivePeriod(sessionId);
        return { success: true, data: period };
    }

    @Post('periods')
    @ApiOperation({ summary: '建立新的作戰週期' })
    async createPeriod(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            name?: string;
            startTime: string;
            endTime?: string;
            objectives?: Objective[];
            priorities?: string[];
            commanderGuidance?: string;
        },
        @Req() req: AuthenticatedRequest,
    ) {
        const period = await this.iapService.createPeriod({
            missionSessionId: sessionId,
            name: body.name,
            startTime: new Date(body.startTime),
            endTime: body.endTime ? new Date(body.endTime) : undefined,
            objectives: body.objectives,
            priorities: body.priorities,
            commanderGuidance: body.commanderGuidance,
            createdBy: req.user?.uid || 'system',
        });
        return { success: true, data: period, message: '作戰週期已建立' };
    }

    @Put('periods/:periodId')
    @ApiOperation({ summary: '更新作戰週期' })
    async updatePeriod(
        @Param('periodId') periodId: string,
        @Body() body: {
            name?: string;
            objectives?: Objective[];
            priorities?: string[];
            riskAssessment?: RiskAssessment[];
            resourceAllocation?: ResourceAllocation[];
            commanderGuidance?: string;
            endTime?: string;
        },
    ) {
        const period = await this.iapService.updatePeriod(periodId, {
            ...body,
            endTime: body.endTime ? new Date(body.endTime) : undefined,
        });
        return { success: true, data: period };
    }

    @Post('periods/:periodId/approve')
    @ApiOperation({ summary: '核准作戰週期' })
    async approvePeriod(
        @Param('periodId') periodId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const period = await this.iapService.approvePeriod(periodId, req.user?.uid || 'system');
        return { success: true, data: period, message: '作戰週期已核准' };
    }

    @Post('periods/:periodId/activate')
    @ApiOperation({ summary: '啟動作戰週期' })
    async activatePeriod(@Param('periodId') periodId: string) {
        const period = await this.iapService.activatePeriod(periodId);
        return { success: true, data: period, message: '作戰週期已啟動' };
    }

    @Post('periods/:periodId/close')
    @ApiOperation({ summary: '關閉作戰週期' })
    async closePeriod(@Param('periodId') periodId: string) {
        const period = await this.iapService.closePeriod(periodId);
        return { success: true, data: period, message: '作戰週期已關閉' };
    }

    // ==================== IAP Documents ====================

    @Get('periods/:periodId/documents')
    @ApiOperation({ summary: '取得作戰週期的所有 IAP 文件' })
    async getDocuments(@Param('periodId') periodId: string) {
        const documents = await this.iapService.getDocuments(periodId);
        return { success: true, data: documents };
    }

    @Get('periods/:periodId/documents/:docType')
    @ApiOperation({ summary: '取得特定類型的 IAP 文件' })
    async getDocument(
        @Param('periodId') periodId: string,
        @Param('docType') docType: IAPDocumentType,
    ) {
        const document = await this.iapService.getDocument(periodId, docType);
        return { success: true, data: document };
    }

    @Put('periods/:periodId/documents/:docType')
    @ApiOperation({ summary: '更新 IAP 文件' })
    async upsertDocument(
        @Param('periodId') periodId: string,
        @Param('docType') docType: IAPDocumentType,
        @Body() body: { content: Record<string, any> },
        @Req() req: AuthenticatedRequest,
    ) {
        const document = await this.iapService.upsertDocument(
            periodId,
            docType,
            body.content,
            req.user?.uid || 'system',
        );
        return { success: true, data: document };
    }

    @Post('periods/:periodId/documents/:docId/approve')
    @ApiOperation({ summary: '核准 IAP 文件' })
    async approveDocument(
        @Param('docId') docId: string,
        @Req() req: AuthenticatedRequest,
    ) {
        const document = await this.iapService.approveDocument(docId, req.user?.uid || 'system');
        return { success: true, data: document, message: '文件已核准' };
    }

    // ==================== Export ====================

    @Get('periods/:periodId/export')
    @ApiOperation({ summary: '匯出 IAP' })
    async exportIAP(@Param('periodId') periodId: string) {
        const iap = await this.iapService.exportIAP(periodId);
        return { success: true, data: iap };
    }
}

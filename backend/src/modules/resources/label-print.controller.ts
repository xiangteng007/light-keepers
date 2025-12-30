import { Controller, Post, Get, Body, Param, Request, ForbiddenException, Query } from '@nestjs/common';
import { LabelPrintService } from './label-print.service';

/**
 * 貼紙列印 API
 */
@Controller('labels')
export class LabelPrintController {
    constructor(private readonly labelPrintService: LabelPrintService) { }

    /**
     * 產生批次貼紙資料
     * POST /api/labels/generate/lot
     */
    @Post('generate/lot')
    async generateLotLabel(
        @Body() body: {
            lotId: string;
            templateId: string;
        },
        @Request() req: any,
    ) {
        const user = req.user;

        if (!user || (user.roleLevel < 3 && user.role !== '倉管')) {
            throw new ForbiddenException('權限不足');
        }

        return this.labelPrintService.generateLabelData({
            lotId: body.lotId,
            templateId: body.templateId,
            actorUid: user.uid,
            actorRole: user.role,
        });
    }

    /**
     * 批次產生資產貼紙資料
     * POST /api/labels/generate/assets
     */
    @Post('generate/assets')
    async generateAssetLabels(
        @Body() body: {
            assetIds: string[];
            templateId: string;
        },
        @Request() req: any,
    ) {
        const user = req.user;

        if (!user || (user.roleLevel < 3 && user.role !== '倉管')) {
            throw new ForbiddenException('權限不足');
        }

        return this.labelPrintService.batchGenerateLabelData({
            assetIds: body.assetIds,
            templateId: body.templateId,
            actorUid: user.uid,
            actorRole: user.role,
        });
    }

    /**
     * 重新列印貼紙
     * POST /api/labels/reprint
     */
    @Post('reprint')
    async reprintLabel(
        @Body() body: {
            targetType: 'lot' | 'asset';
            targetId: string;
            templateId: string;
        },
        @Request() req: any,
    ) {
        const user = req.user;

        if (!user || (user.roleLevel < 3 && user.role !== '倉管')) {
            throw new ForbiddenException('權限不足');
        }

        return this.labelPrintService.reprintLabel({
            targetType: body.targetType,
            targetId: body.targetId,
            templateId: body.templateId,
            actorUid: user.uid,
            actorRole: user.role,
        });
    }

    /**
     * 作廢貼紙
     * POST /api/labels/revoke
     */
    @Post('revoke')
    async revokeLabel(
        @Body() body: {
            targetType: 'lot' | 'asset';
            targetId: string;
            revokeReason: string;
        },
        @Request() req: any,
    ) {
        const user = req.user;

        // 僅倉管與幹部可作廢
        if (!user || (user.roleLevel < 3 && user.role !== '倉管')) {
            throw new ForbiddenException('僅倉管與幹部可作廢貼紙');
        }

        await this.labelPrintService.revokeLabel({
            targetType: body.targetType,
            targetId: body.targetId,
            revokeReason: body.revokeReason,
            actorUid: user.uid,
            actorRole: user.role,
        });

        return { message: '貼紙已作廢' };
    }

    /**
     * 查詢列印歷史
     * GET /api/labels/history/:targetType/:targetId
     */
    @Get('history/:targetType/:targetId')
    async getPrintHistory(
        @Param('targetType') targetType: 'lot' | 'asset',
        @Param('targetId') targetId: string,
        @Request() req: any,
    ) {
        const user = req.user;

        if (!user) {
            throw new ForbiddenException('未登入');
        }

        return this.labelPrintService.getPrintHistory({
            targetType,
            targetId,
        });
    }
}

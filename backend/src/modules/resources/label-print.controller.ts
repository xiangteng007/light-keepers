import { Controller, Post, Get, Body, Param, Request, ForbiddenException, Query, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { LabelPrintService } from './label-print.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

/**
 * 貼紙列印 API
 *
 * TODO(Phase 3 - DTO/授權重構)：本 controller 以中文字串硬編授權
 * （`user.role !== '倉管'`），問題有三：
 * 1. 角色以顯示名稱（中文字串）比對，不是穩定的 role key，改名即失效。
 * 2. JWT payload 實際上只帶 `roles: string[]`，沒有 `role` 欄位，
 *    因此 `user.role !== '倉管'` 目前恆為 true，實際生效的條件只有
 *    `roleLevel < 3`（等同 L3 DIRECTOR 以上）。
 * 3. 授權寫在 handler 內而非宣告式 guard，無法被授權盤點工具掃描。
 * 1.6 guard 收斂為「行為保持」重構，因此這裡刻意不改行為，
 * 僅標記為 Phase 3 DTO/授權重構項；屆時應改為
 * `@UseGuards(CoreJwtGuard, UnifiedRolesGuard)` + `@RequiredLevel(...)`
 * 或 `@RequiredRoles('warehouse')` 之類的穩定角色 key。
 * @see docs/audit/GUARD_CONSOLIDATION.md
 */
@Controller('labels')
// 定級理由：列印歷史查詢為倉儲作業唯讀（L1）；產生／重印／作廢貼紙會影響管制品追溯，宣告 L2（各 handler 內既有的「roleLevel >= 3 或 role === 倉管」檢查更嚴，維持不動，兩者取交集）。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class LabelPrintController {
    constructor(private readonly labelPrintService: LabelPrintService) { }

    /**
     * 產生批次貼紙資料
     * POST /api/labels/generate/lot
     */
    @Post('generate/lot')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：產生批次貼紙
    async generateLotLabel(
        @Body() body: {
            lotId: string;
            templateId: string;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user || ((user.roleLevel ?? 0) < 3 && user.role !== '倉管')) {
            throw new ForbiddenException('權限不足');
        }

        return this.labelPrintService.generateLabelData({
            lotId: body.lotId,
            templateId: body.templateId,
            actorUid: user.uid || user.id,
            actorRole: user.role || 'unknown',
        });
    }

    /**
     * 批次產生資產貼紙資料
     * POST /api/labels/generate/assets
     */
    @Post('generate/assets')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：批次產生資產貼紙
    async generateAssetLabels(
        @Body() body: {
            assetIds: string[];
            templateId: string;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user || ((user.roleLevel ?? 0) < 3 && user.role !== '倉管')) {
            throw new ForbiddenException('權限不足');
        }

        return this.labelPrintService.batchGenerateLabelData({
            assetIds: body.assetIds,
            templateId: body.templateId,
            actorUid: user.uid || user.id,
            actorRole: user.role || 'unknown',
        });
    }

    /**
     * 重新列印貼紙
     * POST /api/labels/reprint
     */
    @Post('reprint')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：重印貼紙（追溯風險）
    async reprintLabel(
        @Body() body: {
            targetType: 'lot' | 'asset';
            targetId: string;
            templateId: string;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        if (!user || ((user.roleLevel ?? 0) < 3 && user.role !== '倉管')) {
            throw new ForbiddenException('權限不足');
        }

        return this.labelPrintService.reprintLabel({
            targetType: body.targetType,
            targetId: body.targetId,
            templateId: body.templateId,
            actorUid: user.uid || user.id,
            actorRole: user.role || 'unknown',
        });
    }

    /**
     * 作廢貼紙
     * POST /api/labels/revoke
     */
    @Post('revoke')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：作廢貼紙
    async revokeLabel(
        @Body() body: {
            targetType: 'lot' | 'asset';
            targetId: string;
            revokeReason: string;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        // 僅倉管與幹部可作廢
        if (!user || ((user.roleLevel ?? 0) < 3 && user.role !== '倉管')) {
            throw new ForbiddenException('僅倉管與幹部可作廢貼紙');
        }

        await this.labelPrintService.revokeLabel({
            targetType: body.targetType,
            targetId: body.targetId,
            revokeReason: body.revokeReason,
            actorUid: user.uid || user.id,
            actorRole: user.role || 'unknown',
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
        @Request() req: AuthenticatedRequest,
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

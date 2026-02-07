import { Controller, Get, Post, Patch, Body, Param, Query, Request, ForbiddenException, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { ApprovalService } from './approval.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

/**
 * 覆核管理 API (Phase 4)
 */
@Controller('approvals')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class ApprovalController {
    constructor(private readonly approvalService: ApprovalService) { }

    /**
     * 查詢待覆核清單
     * GET /api/approvals/pending
     */
    @Get('pending')
    async getPendingApprovals(
        @Query('controlLevel') controlLevel?: 'controlled' | 'medical',
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Request() req?: AuthenticatedRequest,
    ) {
        // 僅倉管與幹部可查看待覆核
        const user = req?.user;
        if (user && (user.roleLevel ?? 0) < 3) {
            throw new ForbiddenException('權限不足');
        }

        return this.approvalService.getPendingApprovals({
            controlLevel,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
    }

    /**
     * 覆核通過
     * POST /api/approvals/:id/approve
     */
    @Post(':id/approve')
    async approve(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        // 僅倉管與幹部可覆核
        if (!user || (user.roleLevel ?? 0) < 3) {
            throw new ForbiddenException('僅倉管與幹部可覆核');
        }

        return this.approvalService.approve({
            transactionId: id,
            approverUid: user.uid || user.id,
            approverName: user.name || user.email || 'unknown',
        });
    }

    /**
     * 覆核拒絕
     * POST /api/approvals/:id/reject
     */
    @Post(':id/reject')
    async reject(
        @Param('id') id: string,
        @Body('rejectReason') rejectReason: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        // 僅倉管與幹部可拒絕
        if (!user || (user.roleLevel ?? 0) < 3) {
            throw new ForbiddenException('僅倉管與幹部可拒絕覆核');
        }

        return this.approvalService.reject({
            transactionId: id,
            approverUid: user.uid || user.id,
            approverName: user.name || user.email || 'unknown',
            rejectReason,
        });
    }

    /**
     * 查詢單據詳情
     * GET /api/approvals/:id
     */
    @Get(':id')
    async getDetail(
        @Param('id') id: string,
        @Request() _req?: AuthenticatedRequest,
    ) {
        return this.approvalService.getTransactionDetail(id);
    }
}

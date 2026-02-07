import { Controller, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { SensitiveService } from './sensitive.service';
import { AuditTargetType } from './sensitive-read-log.entity';

/**
 * 敏感資料讀取 API
 * 所有敏感資料必須透過此 API 讀取，不可前端直接存取
 */
@Controller('sensitive')
export class SensitiveController {
    constructor(private readonly sensitiveService: SensitiveService) { }

    /**
     * 讀取敏感資料（需權限）
     * POST /api/sensitive/read
     */
    @Post('read')
    async readSensitiveData(
        @Body() body: {
            targetType: AuditTargetType;
            targetId: string;
            fieldsAccessed: string[];
            uiContext: string;
            reasonCode?: string;
            reasonText?: string;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user; // 從 JWT 或 session 取得使用者資訊

        if (!user) {
            throw new ForbiddenException('未登入');
        }

        // 呼叫服務層處理
        return this.sensitiveService.readSensitiveData({
            actorUid: user.uid || user.id,
            actorRole: user.role || 'unknown',
            targetType: body.targetType,
            targetId: body.targetId,
            fieldsAccessed: body.fieldsAccessed,
            uiContext: body.uiContext,
            reasonCode: body.reasonCode,
            reasonText: body.reasonText,
            ip: req.ip,
            deviceInfo: {
                userAgent: req.headers['user-agent'],
            },
        });
    }

    /**
     * 查詢稽核日誌（幹部專用）
     * POST /api/sensitive/audit-logs
     */
    @Post('audit-logs')
    async queryAuditLogs(
        @Body() body: {
            startDate?: string;
            endDate?: string;
            actorUid?: string;
            targetType?: AuditTargetType;
            result?: 'success' | 'denied';
            limit?: number;
            offset?: number;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        // 僅幹部可查詢
        if (!user || (user.roleLevel ?? 0) < 5) {
            throw new ForbiddenException('權限不足');
        }

        return this.sensitiveService.queryAuditLogs({
            startDate: body.startDate ? new Date(body.startDate) : undefined,
            endDate: body.endDate ? new Date(body.endDate) : undefined,
            actorUid: body.actorUid,
            targetType: body.targetType,
            result: body.result,
            limit: body.limit,
            offset: body.offset,
        });
    }

    /**
     * 查詢特定目標的讀取日誌
     * GET /api/sensitive/read-logs/:targetType/:targetId
     */
    @Post('read-logs')
    async getReadLogsByTarget(
        @Body() body: {
            targetType: AuditTargetType;
            targetId: string;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const user = req.user;

        // 僅幹部可查詢
        if (!user || (user.roleLevel ?? 0) < 5) {
            throw new ForbiddenException('權限不足');
        }

        return this.sensitiveService.getReadLogsByTarget(
            body.targetType,
            body.targetId,
        );
    }
}

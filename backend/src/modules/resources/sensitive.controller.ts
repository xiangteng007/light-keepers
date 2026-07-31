import { Controller, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/types/request.types';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { SensitiveService } from './sensitive.service';
import { AuditTargetType } from './sensitive-read-log.entity';

/**
 * 敏感資料讀取 API
 * 所有敏感資料必須透過此 API 讀取，不可前端直接存取
 *
 * 定級理由：本 controller 是全系統唯一的敏感個資出口，每次讀取都會留下稽核軌跡。
 * `read`：實際取用受管制個資，需具備業務理由（uiContext/reasonCode）→ L2（幹部，對齊前台
 *   /approvals 的 L2 閘門；再往上會讓一線審核作業無法進行）。
 * `audit-logs` / `read-logs`：查看「誰讀過誰的個資」＝監督者視角，屬稽核權限。原本以 method 內
 *   `roleLevel < 5` 硬編碼判斷（註解寫「僅幹部」但實際要求 OWNER），此處補上宣告式 `@RequiredLevel(OWNER)`
 *   以對齊實際執行結果、不改變任何既有行為；method 內的檢查刻意保留為第二道防線。
 *   （SONNET 初判 L3，本次改判 L5：以「不改變現行行為」為優先，等級落差另案處理。）
 */
@Controller('sensitive')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OWNER)
export class SensitiveController {
    constructor(private readonly sensitiveService: SensitiveService) { }

    /**
     * 讀取敏感資料（需權限）
     * POST /api/sensitive/read
     */
    @Post('read')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
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
    @RequiredLevel(ROLE_LEVELS.OWNER)
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
    @RequiredLevel(ROLE_LEVELS.OWNER)
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

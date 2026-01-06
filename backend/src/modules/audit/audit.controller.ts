/**
 * Audit Controller
 * REST API for querying audit logs
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('audit')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OWNER) // Owner/Admin only
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    /**
     * Query audit logs
     */
    @Get('logs')
    async getLogs(
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('resourceType') resourceType?: string,
        @Query('resourceId') resourceId?: string,
        @Query('start') start?: string,
        @Query('end') end?: string,
        @Query('success') success?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const result = await this.auditService.query({
            userId,
            action,
            resourceType,
            resourceId,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
            success: success !== undefined ? success === 'true' : undefined,
            limit: limit ? parseInt(limit, 10) : 100,
            offset: offset ? parseInt(offset, 10) : 0,
        });

        return { success: true, data: result };
    }

    /**
     * Get failed actions (security monitoring)
     */
    @Get('failed')
    async getFailedActions(@Query('hours') hours: string = '24') {
        const logs = await this.auditService.getFailedActions(parseInt(hours, 10));
        return { success: true, data: logs };
    }

    /**
     * Get login statistics
     */
    @Get('login-stats')
    async getLoginStats(@Query('hours') hours: string = '24') {
        const stats = await this.auditService.getLoginAttempts(parseInt(hours, 10));
        return { success: true, data: stats };
    }

    /**
     * Get user activity
     */
    @Get('user-activity')
    async getUserActivity(
        @Query('userId') userId: string,
        @Query('limit') limit: string = '20',
    ) {
        const logs = await this.auditService.getUserActivity(userId, parseInt(limit, 10));
        return { success: true, data: logs };
    }

    /**
     * Get resource history
     */
    @Get('resource-history')
    async getResourceHistory(
        @Query('resourceType') resourceType: string,
        @Query('resourceId') resourceId: string,
    ) {
        const logs = await this.auditService.getResourceHistory(resourceType, resourceId);
        return { success: true, data: logs };
    }
}

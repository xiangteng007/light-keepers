/**
 * Data Privacy Controller
 * 
 * REST API for GDPR-compliant data privacy operations
 * - DSAR (Data Subject Access Request) flow
 * - Data anonymization
 * - Data deletion
 * - Retention policy management
 */

import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { DataPrivacyService } from './data-privacy.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@ApiTags('Data Privacy')
@Controller('api/v1/privacy')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@ApiBearerAuth()
export class DataPrivacyController {
    constructor(private readonly privacyService: DataPrivacyService) {}

    // ==================== DSAR Flow ====================

    /**
     * Create a data subject request (deletion, export, or anonymize)
     */
    @Post('dsar')
    @ApiOperation({ summary: 'Create a Data Subject Access Request (DSAR)' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async createDSAR(
        @Req() req: Request,
        @Body() body: {
            requestType: 'deletion' | 'export' | 'anonymize';
            reason?: string;
        },
    ) {
        const user = (req as any).user;
        const userId = user?.id || user?.sub;
        const userEmail = user?.email || 'unknown@email.com';

        const request = await this.privacyService.createDeletionRequest({
            userId,
            userEmail,
            requestType: body.requestType,
            reason: body.reason,
        });

        return {
            success: true,
            message: '資料主體請求已建立，將由管理員審核處理',
            data: {
                id: request.id,
                requestType: request.requestType,
                status: request.status,
                requestedAt: request.requestedAt,
            },
        };
    }

    /**
     * Get all DSAR requests (admin only)
     */
    @Get('dsar')
    @ApiOperation({ summary: 'List all DSAR requests (Admin)' })
    @ApiQuery({ name: 'status', required: false, enum: ['pending', 'processing', 'completed', 'rejected'] })
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async listDSARRequests(@Query('status') status?: string) {
        const requests = this.privacyService.getDeletionRequests(status);
        return {
            success: true,
            data: requests,
            total: requests.length,
        };
    }

    /**
     * Process a DSAR request (admin only)
     */
    @Post('dsar/:id/process')
    @ApiOperation({ summary: 'Process a DSAR request (Admin)' })
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async processDSAR(
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        const adminId = (req as any).user?.id || (req as any).user?.sub;
        const result = await this.privacyService.processDeletionRequest(id, adminId);

        return {
            success: true,
            message: `請求已處理 (${result.requestType})`,
            data: {
                id: result.id,
                status: result.status,
                processedAt: result.processedAt,
                processedBy: result.processedBy,
            },
        };
    }

    // ==================== Anonymization ====================

    /**
     * Anonymize a user's data (admin only)
     */
    @Post('anonymize/:userId')
    @ApiOperation({ summary: 'Anonymize user data (Admin)' })
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async anonymizeUser(@Param('userId', ParseUUIDPipe) userId: string) {
        await this.privacyService.anonymizeUserData(userId);
        return {
            success: true,
            message: '用戶資料已匿名化，個人識別資訊已移除',
        };
    }

    /**
     * Delete a user's data completely (admin only)
     */
    @Post('delete/:userId')
    @ApiOperation({ summary: 'Delete user data completely (Admin)' })
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async deleteUserData(@Param('userId', ParseUUIDPipe) userId: string) {
        await this.privacyService.deleteUserData(userId);
        return {
            success: true,
            message: '用戶資料已完全刪除',
        };
    }

    // ==================== Retention Policy ====================

    /**
     * Get privacy configuration
     */
    @Get('config')
    @ApiOperation({ summary: 'Get privacy configuration' })
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async getConfig() {
        const config = this.privacyService.getConfig();
        return {
            success: true,
            data: config,
        };
    }

    /**
     * Update privacy configuration (admin only)
     */
    @Post('config')
    @ApiOperation({ summary: 'Update privacy configuration (Admin)' })
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async updateConfig(
        @Body() body: {
            dataRetentionDays?: number;
            autoAnonymizeAfterDays?: number;
            gdprEnabled?: boolean;
            allowDataExport?: boolean;
        },
    ) {
        const config = this.privacyService.updateConfig(body);
        return {
            success: true,
            message: '隱私設定已更新',
            data: config,
        };
    }

    /**
     * Trigger data retention cleanup (scheduled job, admin manual trigger)
     */
    @Post('retention/process')
    @ApiOperation({ summary: 'Process data retention cleanup (Admin)' })
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async processRetention() {
        const result = await this.privacyService.processDataRetention();
        return {
            success: true,
            message: `資料保留清理完成: 刪除 ${result.deleted} 筆, 匿名化 ${result.anonymized} 筆`,
            data: result,
        };
    }

    // ==================== User Self-Service ====================

    /**
     * Export my own data (GDPR right to data portability)
     */
    @Get('my-data')
    @ApiOperation({ summary: 'Export my own data (GDPR Art. 20)' })
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async exportMyData(@Req() req: Request) {
        const userId = (req as any).user?.id || (req as any).user?.sub;
        const data = await this.privacyService.exportUserData(userId);
        return {
            success: true,
            data,
        };
    }
}

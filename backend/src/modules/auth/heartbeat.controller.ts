import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { Request } from 'express';
import { HeartbeatService } from './heartbeat.service';
import { BreakGlassDto, CommanderStatusDto, HeartbeatResponseDto } from './dto/heartbeat.dto';

interface AuthenticatedRequest extends Request {
    user: { userId: string; email?: string; roleLevel?: number };
}

@ApiTags('Heartbeat & Break-Glass')
@Controller('auth')
export class HeartbeatController {
    constructor(private readonly heartbeatService: HeartbeatService) { }

    /**
     * POST /api/auth/heartbeat
     * Update commander heartbeat timestamp
     */
    @Post('heartbeat')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '更新指揮官心跳' })
    @ApiResponse({ status: 200, description: '心跳更新成功', type: HeartbeatResponseDto })
    async updateHeartbeat(@Req() req: AuthenticatedRequest): Promise<HeartbeatResponseDto> {
        return this.heartbeatService.updateHeartbeat(req.user.userId);
    }

    /**
     * GET /api/auth/commander-status
     * Get commander online status
     */
    @Get('commander-status')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '查詢指揮官在線狀態' })
    @ApiResponse({ status: 200, description: '指揮官狀態', type: [CommanderStatusDto] })
    async getCommanderStatus(@Req() req: AuthenticatedRequest): Promise<CommanderStatusDto[]> {
        return this.heartbeatService.getCommanderStatus();
    }

    /**
     * POST /api/auth/break-glass
     * Emergency takeover procedure
     * Only the designated emergency successor can invoke this
     */
    @Post('break-glass')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '緊急接管程序 (Break-Glass)' })
    @ApiResponse({ status: 200, description: '接管成功' })
    @ApiResponse({ status: 403, description: '無權執行接管' })
    @ApiResponse({ status: 400, description: '指揮官仍在線或未達超時條件' })
    async breakGlass(
        @Req() req: AuthenticatedRequest,
        @Body() dto: BreakGlassDto
    ): Promise<{ success: boolean; message: string; newRoleLevel?: number }> {
        return this.heartbeatService.executeBreakGlass(req.user.userId, dto);
    }

    /**
     * POST /api/auth/configure-break-glass
     * Configure break-glass settings (commander only)
     */
    @Post('configure-break-glass')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '設定 Break-Glass 參數' })
    @ApiResponse({ status: 200, description: '設定更新成功' })
    async configureBreakGlass(
        @Req() req: AuthenticatedRequest,
        @Body() config: { successorId?: string; timeoutMinutes?: number; enabled?: boolean }
    ): Promise<{ success: boolean }> {
        return this.heartbeatService.configureBreakGlass(req.user.userId, config);
    }
}


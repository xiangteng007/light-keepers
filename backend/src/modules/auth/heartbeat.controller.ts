import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { Request } from 'express';
import { HeartbeatService } from './heartbeat.service';
import { BreakGlassDto, CommanderStatusDto, HeartbeatResponseDto } from './dto/heartbeat.dto';

/**
 * CoreJwtGuard 掛在 request 上的使用者物件（見 core-jwt.guard.ts `attachUser`）：
 * 欄位是 `id`/`sub`，**沒有** `userId`。原本此處宣告為 `userId` 且直接取用，
 * TypeScript 不會報錯（介面是自己宣告的），但執行期一律拿到 undefined，
 * 心跳與 break-glass 全部帶著 undefined 的操作者送進 service。
 */
interface AuthenticatedRequest extends Request {
    user: { id: string; sub?: string; email?: string; roleLevel?: number };
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
    // P0 授權定級：只更新「呼叫者自己」的心跳時戳 → L1。
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '更新指揮官心跳' })
    @ApiResponse({ status: 200, description: '心跳更新成功', type: HeartbeatResponseDto })
    async updateHeartbeat(@Req() req: AuthenticatedRequest): Promise<HeartbeatResponseDto> {
        return this.heartbeatService.updateHeartbeat(req.user.id);
    }

    /**
     * GET /api/auth/commander-status
     * Get commander online status
     */
    @Get('commander-status')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    // P0 授權定級：回傳指揮鏈名單（姓名/email/在線狀態/接班人設定）＝指揮體系情資 → L2。
    @RequiredLevel(ROLE_LEVELS.OFFICER)
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
    // P0 授權定級：權限接管。真正的把關在 service（必須是該指揮官指定的接班人、
    // 且心跳已超時），此處加上 L2 只是把「連幹部都不是的帳號」提早擋掉，不取代 service 檢查。
    @RequiredLevel(ROLE_LEVELS.OFFICER)
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
        return this.heartbeatService.executeBreakGlass(req.user.id, dto);
    }

    /**
     * POST /api/auth/configure-break-glass
     * Configure break-glass settings (commander only)
     */
    @Post('configure-break-glass')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    // P0 授權定級：設定自己的接班人與超時門檻（service 以呼叫者自己的帳號為對象，
    // 無法替別人設定）。指揮官為 L2 以上才有意義 → L2。
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '設定 Break-Glass 參數' })
    @ApiResponse({ status: 200, description: '設定更新成功' })
    async configureBreakGlass(
        @Req() req: AuthenticatedRequest,
        @Body() config: { successorId?: string; timeoutMinutes?: number; enabled?: boolean }
    ): Promise<{ success: boolean }> {
        return this.heartbeatService.configureBreakGlass(req.user.id, config);
    }
}


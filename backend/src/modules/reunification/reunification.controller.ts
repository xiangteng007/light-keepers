/**
 * Reunification Controller
 * Phase 5.4: 災民協尋 API
 */

import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { ReunificationService } from './reunification.service';
import { MissingPerson, MissingPersonStatus } from './entities';

@ApiTags('reunification')
@Controller('reunification')
export class ReunificationController {
    constructor(private readonly reunificationService: ReunificationService) { }

    // ============ 查詢碼查詢 ============
    // ⚠️ 註解與實際行為不符：本端點沒有 @Public()，也沒有 @RequiredLevel(0)，
    // 因此仍會被 APP_GUARD (GlobalAuthGuard) 攔下要求登入。
    // 是否要真正對外公開屬於公開面 (public surface) 決策，需先更新
    // docs/policy/public-surface.policy.json，故本次收斂不改變其行為。

    @Get('search')
    @ApiOperation({ summary: '透過查詢碼查詢（目前仍需登入，見上方註解）' })
    async searchByQueryCode(@Query('code') code: string) {
        return this.reunificationService.findByQueryCode(code);
    }

    // ============ 管理端 API ============
    // 定級原則（管理端 L2-L3，對齊 shelters.controller 的同類災民資料端點）：
    // - 失蹤者名單/統計/報案登錄屬第一線協尋作業 → L2 幹部 (OFFICER)
    // - 標記已團聚 = 個案結案（不可逆的記錄狀態） → L3 常務理事 (DIRECTOR)

    @Post('reports')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @ApiOperation({ summary: '新增失蹤者報案' })
    async createReport(@Body() data: Partial<MissingPerson>) {
        return this.reunificationService.createReport(data);
    }

    @Get('missions/:missionSessionId')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @ApiOperation({ summary: '取得任務的失蹤者列表' })
    @ApiParam({ name: 'missionSessionId' })
    async getByMission(@Param('missionSessionId') missionSessionId: string) {
        return this.reunificationService.getByMission(missionSessionId);
    }

    @Get('missions/:missionSessionId/stats')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @ApiOperation({ summary: '取得統計' })
    @ApiParam({ name: 'missionSessionId' })
    async getStats(@Param('missionSessionId') missionSessionId: string) {
        return this.reunificationService.getStats(missionSessionId);
    }

    @Put(':id/found')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    @ApiBearerAuth()
    @ApiOperation({ summary: '標記已尋獲' })
    @ApiParam({ name: 'id' })
    async markFound(
        @Param('id') id: string,
        @Body() data: {
            status: MissingPersonStatus;
            foundLocation?: string;
            foundByVolunteerId?: string;
            foundByVolunteerName?: string;
        }
    ) {
        return this.reunificationService.markFound(id, data.status, data);
    }

    @Put(':id/reunited')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    @ApiBearerAuth()
    @ApiOperation({ summary: '標記已團聚' })
    @ApiParam({ name: 'id' })
    async markReunited(@Param('id') id: string) {
        return this.reunificationService.markReunited(id);
    }
}

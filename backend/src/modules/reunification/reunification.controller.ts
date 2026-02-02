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

    // ============ 公開查詢 (無需登入) ============

    @Get('search')
    @ApiOperation({ summary: '透過查詢碼查詢 (公開)' })
    async searchByQueryCode(@Query('code') code: string) {
        return this.reunificationService.findByQueryCode(code);
    }

    // ============ 管理端 API ============

    @Post('reports')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '新增失蹤者報案' })
    async createReport(@Body() data: Partial<MissingPerson>) {
        return this.reunificationService.createReport(data);
    }

    @Get('missions/:missionSessionId')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '取得任務的失蹤者列表' })
    @ApiParam({ name: 'missionSessionId' })
    async getByMission(@Param('missionSessionId') missionSessionId: string) {
        return this.reunificationService.getByMission(missionSessionId);
    }

    @Get('missions/:missionSessionId/stats')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '取得統計' })
    @ApiParam({ name: 'missionSessionId' })
    async getStats(@Param('missionSessionId') missionSessionId: string) {
        return this.reunificationService.getStats(missionSessionId);
    }

    @Put(':id/found')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
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
    @ApiBearerAuth()
    @ApiOperation({ summary: '標記已團聚' })
    @ApiParam({ name: 'id' })
    async markReunited(@Param('id') id: string) {
        return this.reunificationService.markReunited(id);
    }
}

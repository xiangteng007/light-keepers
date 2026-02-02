/**
 * Tactical Maps Controller
 * Phase 6.1: 3D 戰術地圖 API
 */

import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { TacticalMapsService, Building3D } from './tactical-maps.service';
import { TacticalMarker } from './entities';

@ApiTags('tactical-maps')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@Controller('tactical-maps')
export class TacticalMapsController {
    constructor(private readonly tacticalMapsService: TacticalMapsService) { }

    // ============ Markers ============

    @Post('markers')
    @ApiOperation({ summary: '建立戰術標記' })
    async createMarker(@Body() data: Partial<TacticalMarker>) {
        return this.tacticalMapsService.createMarker(data);
    }

    @Post('markers/batch')
    @ApiOperation({ summary: '批量建立標記' })
    async createBatch(@Body() markers: Partial<TacticalMarker>[]) {
        return this.tacticalMapsService.createBatch(markers);
    }

    @Get('missions/:missionSessionId/markers')
    @ApiOperation({ summary: '取得任務標記' })
    @ApiParam({ name: 'missionSessionId' })
    async getMarkersByMission(@Param('missionSessionId') missionSessionId: string) {
        return this.tacticalMapsService.getMarkersByMission(missionSessionId);
    }

    @Get('markers/:id')
    @ApiOperation({ summary: '取得標記詳情' })
    @ApiParam({ name: 'id' })
    async getMarker(@Param('id') id: string) {
        return this.tacticalMapsService.getMarker(id);
    }

    @Put('markers/:id')
    @ApiOperation({ summary: '更新標記' })
    @ApiParam({ name: 'id' })
    async updateMarker(@Param('id') id: string, @Body() data: Partial<TacticalMarker>) {
        return this.tacticalMapsService.updateMarker(id, data);
    }

    @Delete('markers/:id')
    @ApiOperation({ summary: '刪除標記' })
    @ApiParam({ name: 'id' })
    async deleteMarker(@Param('id') id: string) {
        await this.tacticalMapsService.deleteMarker(id);
        return { success: true };
    }

    // ============ Viewshed Analysis ============

    @Post('viewshed')
    @ApiOperation({ summary: '計算視域分析' })
    async calculateViewshed(
        @Body() data: {
            observer: { lat: number; lng: number; height: number };
            params: {
                maxDistance: number;
                horizontalAngle?: number;
                verticalAngleUp?: number;
                verticalAngleDown?: number;
            };
            obstacles?: Building3D[];
        }
    ) {
        return this.tacticalMapsService.calculateViewshed(
            data.observer,
            data.params,
            data.obstacles
        );
    }

    // ============ MIL-STD-2525 ============

    @Get('sidc')
    @ApiOperation({ summary: '生成 MIL-STD-2525D SIDC' })
    async generateSIDC(
        @Query('affiliation') affiliation: 'friend' | 'hostile' | 'neutral' | 'unknown',
        @Query('dimension') dimension: 'ground' | 'air' | 'sea' | 'space',
        @Query('functionId') functionId?: string
    ) {
        const sidc = this.tacticalMapsService.generateSIDC(affiliation, dimension, functionId);
        return { sidc };
    }
}

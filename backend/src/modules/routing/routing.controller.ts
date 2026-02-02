/**
 * Routing Controller
 * Phase 5.3: 最後一哩路 API
 */

import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { RoutingService, RouteRequest, RoadBlock, GeoPoint } from './routing.service';

class AddRoadBlockDto {
    missionSessionId: string;
    location: GeoPoint;
    radius: number;
    reason: string;
    severity: 'complete' | 'partial' | 'slow';
    reportedBy?: string;
    expiresAt?: string;
}

class CalculateRouteDto {
    origin: GeoPoint;
    destination: GeoPoint;
    missionSessionId: string;
    avoidBlocks?: boolean;
    vehicleType?: 'car' | 'motorcycle' | 'walking' | 'emergency';
}

@ApiTags('routing')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@Controller('routing')
export class RoutingController {
    constructor(private readonly routingService: RoutingService) { }

    // ============ Road Blocks ============

    @Post('blocks')
    @ApiOperation({ summary: '新增路網阻斷點' })
    async addRoadBlock(@Body() dto: AddRoadBlockDto) {
        return this.routingService.addRoadBlock({
            ...dto,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        });
    }

    @Get('blocks/:missionSessionId')
    @ApiOperation({ summary: '取得任務的阻斷點' })
    @ApiParam({ name: 'missionSessionId' })
    async getRoadBlocks(@Param('missionSessionId') missionSessionId: string) {
        return this.routingService.getRoadBlocks(missionSessionId);
    }

    @Delete('blocks/:missionSessionId/:blockId')
    @ApiOperation({ summary: '移除阻斷點' })
    async removeRoadBlock(
        @Param('missionSessionId') missionSessionId: string,
        @Param('blockId') blockId: string
    ) {
        return { success: this.routingService.removeRoadBlock(missionSessionId, blockId) };
    }

    // ============ Route Calculation ============

    @Post('calculate')
    @ApiOperation({ summary: '計算路徑' })
    async calculateRoute(@Body() dto: CalculateRouteDto) {
        return this.routingService.calculateRoute(dto);
    }
}

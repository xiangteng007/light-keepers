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
// P0 授權定級：現場人員需要回報路阻、查阻斷點、算路徑 → 類別預設 L1；
// 「移除阻斷點」是把封路狀態清掉、直接影響其他人的路徑規劃 → L2。
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 解除封路狀態，影響全體路徑規劃
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

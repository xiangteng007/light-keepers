/**
 * 地圖派遣控制器 (Map Dispatch Controller)
 * COP 地圖即操作 API
 */

import { Controller, Get, Post, Put, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MapDispatchService } from './map-dispatch.service';
import { SectorType, SectorStatus } from './entities/sector.entity';
import { RallyPointType, RallyPointStatus } from './entities/rally-point.entity';
import { RouteType, RouteStatus, Waypoint } from './entities/planned-route.entity';

@ApiTags('map-dispatch')
@Controller('api/missions/:sessionId/map')
@ApiBearerAuth()
export class MapDispatchController {
    constructor(private readonly service: MapDispatchService) { }

    // ==================== Sectors ====================

    @Get('sectors')
    @ApiOperation({ summary: '取得所有責任區' })
    async getSectors(@Param('sessionId') sessionId: string) {
        const sectors = await this.service.getSectors(sessionId);
        return { success: true, data: sectors };
    }

    @Post('sectors')
    @ApiOperation({ summary: '建立責任區' })
    async createSector(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            sectorCode: string;
            name: string;
            sectorType: SectorType;
            geometry: { type: 'Polygon'; coordinates: number[][][] };
            severity?: number;
            props?: Record<string, any>;
        },
        @Req() req: any,
    ) {
        const sector = await this.service.createSector({
            missionSessionId: sessionId,
            ...body,
            createdBy: req.user?.uid || 'system',
        });
        return { success: true, data: sector, message: '責任區已建立' };
    }

    @Post('sectors/:sectorId/assign')
    @ApiOperation({ summary: '指派小隊到責任區' })
    async assignTeamToSector(
        @Param('sectorId') sectorId: string,
        @Body() body: { teamId: string; teamName: string },
        @Req() req: any,
    ) {
        const sector = await this.service.assignTeamToSector(sectorId, {
            ...body,
            assignedBy: req.user?.uid || 'system',
        });
        return { success: true, data: sector, message: '小隊已指派' };
    }

    @Put('sectors/:sectorId/status')
    @ApiOperation({ summary: '更新責任區狀態' })
    async updateSectorStatus(
        @Param('sectorId') sectorId: string,
        @Body() body: { status: SectorStatus },
        @Req() req: any,
    ) {
        const sector = await this.service.updateSectorStatus(
            sectorId,
            body.status,
            req.user?.uid || 'system',
        );
        return { success: true, data: sector };
    }

    // ==================== Rally Points ====================

    @Get('rally-points')
    @ApiOperation({ summary: '取得所有集結點' })
    async getRallyPoints(@Param('sessionId') sessionId: string) {
        const points = await this.service.getRallyPoints(sessionId);
        return { success: true, data: points };
    }

    @Post('rally-points')
    @ApiOperation({ summary: '建立集結點' })
    async createRallyPoint(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            name: string;
            pointType: RallyPointType;
            geometry: { type: 'Point'; coordinates: [number, number] };
            address?: string;
            capacity?: number;
            contactName?: string;
            contactPhone?: string;
            radioChannel?: string;
            props?: Record<string, any>;
        },
        @Req() req: any,
    ) {
        const point = await this.service.createRallyPoint({
            missionSessionId: sessionId,
            ...body,
            createdBy: req.user?.uid || 'system',
        });
        return { success: true, data: point, message: '集結點已建立' };
    }

    @Put('rally-points/:pointId/status')
    @ApiOperation({ summary: '更新集結點狀態' })
    async updateRallyPointStatus(
        @Param('pointId') pointId: string,
        @Body() body: { status: RallyPointStatus },
    ) {
        const point = await this.service.updateRallyPointStatus(pointId, body.status);
        return { success: true, data: point };
    }

    // ==================== Routes ====================

    @Get('routes')
    @ApiOperation({ summary: '取得所有規劃路徑' })
    async getRoutes(@Param('sessionId') sessionId: string) {
        const routes = await this.service.getRoutes(sessionId);
        return { success: true, data: routes };
    }

    @Post('routes')
    @ApiOperation({ summary: '建立規劃路徑' })
    async createRoute(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            name: string;
            routeType: RouteType;
            geometry: { type: 'LineString'; coordinates: number[][] };
            waypoints?: Waypoint[];
            estimatedTime?: number;
            estimatedDistance?: number;
            props?: Record<string, any>;
        },
        @Req() req: any,
    ) {
        const route = await this.service.createRoute({
            missionSessionId: sessionId,
            ...body,
            createdBy: req.user?.uid || 'system',
        });
        return { success: true, data: route, message: '路徑已建立' };
    }

    @Put('routes/:routeId/status')
    @ApiOperation({ summary: '更新路徑狀態' })
    async updateRouteStatus(
        @Param('routeId') routeId: string,
        @Body() body: { status: RouteStatus },
    ) {
        const route = await this.service.updateRouteStatus(routeId, body.status);
        return { success: true, data: route };
    }

    // ==================== Dispatch ====================

    @Post('dispatch/bbox')
    @ApiOperation({ summary: '框選派遣' })
    async dispatchFromBbox(
        @Param('sessionId') sessionId: string,
        @Body() body: {
            bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number };
            teamId: string;
            teamName: string;
            taskTitle: string;
            taskDescription?: string;
            priority?: number;
        },
        @Req() req: any,
    ) {
        const task = await this.service.dispatchFromBbox({
            missionSessionId: sessionId,
            ...body,
            createdBy: req.user?.uid || 'system',
        });
        return { success: true, data: task, message: '任務已派遣' };
    }

    @Post('dispatch/sector/:sectorId')
    @ApiOperation({ summary: '派遣至責任區' })
    async dispatchToSector(
        @Param('sessionId') sessionId: string,
        @Param('sectorId') sectorId: string,
        @Body() body: { taskTitle: string; taskDescription: string },
        @Req() req: any,
    ) {
        const task = await this.service.dispatchToSector(
            sessionId,
            sectorId,
            body.taskTitle,
            body.taskDescription,
            req.user?.uid || 'system',
        );
        return { success: true, data: task, message: '任務已派遣至責任區' };
    }

    @Get('eta')
    @ApiOperation({ summary: '計算 ETA' })
    async calculateETA(
        @Query('fromLat') fromLat: string,
        @Query('fromLng') fromLng: string,
        @Query('toLat') toLat: string,
        @Query('toLng') toLng: string,
        @Query('speed') speed?: string,
    ) {
        const eta = await this.service.calculateETA(
            parseFloat(fromLat),
            parseFloat(fromLng),
            parseFloat(toLat),
            parseFloat(toLng),
            speed ? parseFloat(speed) : undefined,
        );
        return { success: true, data: eta };
    }
}

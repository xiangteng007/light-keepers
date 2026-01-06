import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArFieldGuidanceService } from './ar-field-guidance.service';

@ApiTags('AR Field Guidance')
@ApiBearerAuth()
@Controller('ar')
export class ArFieldGuidanceController {
    constructor(private readonly service: ArFieldGuidanceService) { }

    @Post('markers')
    @ApiOperation({ summary: '建立 AR 標記' })
    createMarker(@Body() dto: any) {
        return this.service.createMarker(dto);
    }

    @Get('markers/:id')
    @ApiOperation({ summary: '取得標記' })
    getMarker(@Param('id') id: string) {
        return this.service.getMarker(id);
    }

    @Get('markers/floor/:buildingId/:floorId')
    @ApiOperation({ summary: '取得樓層標記' })
    getMarkersByFloor(@Param('buildingId') buildingId: string, @Param('floorId') floorId: string) {
        return this.service.getMarkersByFloor(buildingId, floorId);
    }

    @Put('markers/:id')
    @ApiOperation({ summary: '更新標記' })
    updateMarker(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateMarker(id, dto);
    }

    @Delete('markers/:id')
    @ApiOperation({ summary: '刪除標記' })
    deleteMarker(@Param('id') id: string) {
        return { deleted: this.service.deleteMarker(id) };
    }

    @Post('routes')
    @ApiOperation({ summary: '建立路線' })
    createRoute(@Body() dto: any) {
        return this.service.createRoute(dto);
    }

    @Get('routes/:id')
    @ApiOperation({ summary: '取得路線' })
    getRoute(@Param('id') id: string) {
        return this.service.getRoute(id);
    }

    @Post('routes/shortest')
    @ApiOperation({ summary: '計算最短路徑' })
    findShortestPath(@Body() dto: { buildingId: string; from: any; to: any }) {
        return this.service.findShortestPath(dto.buildingId, dto.from, dto.to);
    }

    @Post('routes/evacuation')
    @ApiOperation({ summary: '計算疏散路線' })
    findEvacuationRoute(@Body() dto: { buildingId: string; floorId: string; position: any }) {
        return this.service.findEvacuationRoute(dto.buildingId, dto.floorId, dto.position);
    }

    @Post('floor-plans')
    @ApiOperation({ summary: '新增樓層平面圖' })
    addFloorPlan(@Body() dto: any) {
        return this.service.addFloorPlan(dto);
    }

    @Get('floor-plans/:id')
    @ApiOperation({ summary: '取得平面圖' })
    getFloorPlan(@Param('id') id: string) {
        return this.service.getFloorPlan(id);
    }

    @Get('floor-plans/building/:buildingId')
    @ApiOperation({ summary: '取得建築所有平面圖' })
    getFloorPlansByBuilding(@Param('buildingId') buildingId: string) {
        return this.service.getFloorPlansByBuilding(buildingId);
    }

    @Post('sessions')
    @ApiOperation({ summary: '開始 AR Session' })
    startSession(@Body() dto: any) {
        return this.service.startSession(dto);
    }

    @Put('sessions/:id/position')
    @ApiOperation({ summary: '更新位置' })
    updatePosition(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateSessionPosition(id, dto.position, dto.heading, dto.floorId);
    }

    @Get('sessions/:id')
    @ApiOperation({ summary: '取得 Session' })
    getSession(@Param('id') id: string) {
        return this.service.getSession(id);
    }

    @Get('sessions/active')
    @ApiOperation({ summary: '取得活躍 Sessions' })
    getActiveSessions(@Query('buildingId') buildingId?: string) {
        return this.service.getActiveSessions(buildingId);
    }

    @Delete('sessions/:id')
    @ApiOperation({ summary: '結束 Session' })
    endSession(@Param('id') id: string) {
        return { ended: this.service.endSession(id) };
    }

    @Get('view')
    @ApiOperation({ summary: '取得 AR 視野' })
    getArView(
        @Query('buildingId') buildingId: string,
        @Query('floorId') floorId: string,
        @Query('x') x: number,
        @Query('y') y: number,
        @Query('z') z: number,
        @Query('heading') heading: number
    ) {
        return this.service.getArView(buildingId, floorId, { x, y, z }, heading);
    }
}

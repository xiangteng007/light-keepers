import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DroneSwarmService } from './drone-swarm.service';

@ApiTags('Drone Swarm')
@ApiBearerAuth()
@Controller('drones')
export class DroneSwarmController {
    constructor(private readonly service: DroneSwarmService) { }

    @Post()
    @ApiOperation({ summary: '註冊無人機' })
    registerDrone(@Body() dto: any) {
        return this.service.registerDrone(dto);
    }

    @Get()
    @ApiOperation({ summary: '取得所有無人機' })
    getAllDrones() {
        return this.service.getAllDrones();
    }

    @Get('available')
    @ApiOperation({ summary: '取得可用無人機' })
    getAvailableDrones() {
        return this.service.getAvailableDrones();
    }

    @Get(':id')
    @ApiOperation({ summary: '取得無人機' })
    getDrone(@Param('id') id: string) {
        return this.service.getDrone(id);
    }

    @Put(':id/status')
    @ApiOperation({ summary: '更新狀態' })
    updateDroneStatus(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateDroneStatus(id, dto);
    }

    @Put(':id/position')
    @ApiOperation({ summary: '更新位置' })
    updateDronePosition(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateDronePosition(id, dto.position, dto.heading, dto.speed, dto.batteryLevel);
    }

    @Post('missions')
    @ApiOperation({ summary: '建立任務' })
    createMission(@Body() dto: any) {
        return this.service.createMission(dto);
    }

    @Get('missions/all')
    @ApiOperation({ summary: '取得所有任務' })
    getAllMissions() {
        return this.service.getAllMissions();
    }

    @Get('missions/active')
    @ApiOperation({ summary: '取得進行中任務' })
    getActiveMissions() {
        return this.service.getActiveMissions();
    }

    @Get('missions/:id')
    @ApiOperation({ summary: '取得任務' })
    getMission(@Param('id') id: string) {
        return this.service.getMission(id);
    }

    @Post('missions/:id/start')
    @ApiOperation({ summary: '啟動任務' })
    startMission(@Param('id') id: string) {
        return this.service.startMission(id);
    }

    @Post('missions/:id/pause')
    @ApiOperation({ summary: '暫停任務' })
    pauseMission(@Param('id') id: string) {
        return this.service.pauseMission(id);
    }

    @Post('missions/:id/resume')
    @ApiOperation({ summary: '繼續任務' })
    resumeMission(@Param('id') id: string) {
        return this.service.resumeMission(id);
    }

    @Post('missions/:id/complete')
    @ApiOperation({ summary: '完成任務' })
    completeMission(@Param('id') id: string) {
        return this.service.completeMission(id);
    }

    @Post('missions/:id/abort')
    @ApiOperation({ summary: '中止任務' })
    abortMission(@Param('id') id: string) {
        return this.service.abortMission(id);
    }

    @Post('patterns/generate')
    @ApiOperation({ summary: '生成搜索模式' })
    generateSearchPattern(@Body() dto: any) {
        return this.service.generateSearchPattern(dto.center, dto.radius, dto.pattern);
    }

    @Post(':id/stream/start')
    @ApiOperation({ summary: '開始串流' })
    startStream(@Param('id') id: string, @Body() dto: { type: 'video' | 'thermal' }) {
        return this.service.startStream(id, dto.type);
    }

    @Get(':id/stream/:type')
    @ApiOperation({ summary: '取得串流' })
    getStream(@Param('id') id: string, @Param('type') type: 'video' | 'thermal') {
        return this.service.getStream(id, type);
    }

    @Delete(':id/stream/:type')
    @ApiOperation({ summary: '停止串流' })
    stopStream(@Param('id') id: string, @Param('type') type: 'video' | 'thermal') {
        return { stopped: this.service.stopStream(id, type) };
    }

    @Get('streams/all')
    @ApiOperation({ summary: '取得所有串流' })
    getAllStreams() {
        return this.service.getAllStreams();
    }

    @Post('detections')
    @ApiOperation({ summary: '新增偵測' })
    addDetection(@Body() dto: any) {
        return this.service.addDetection(dto);
    }

    @Get('detections/all')
    @ApiOperation({ summary: '取得偵測結果' })
    getDetections(@Query('missionId') missionId?: string) {
        return this.service.getDetections(missionId);
    }

    @Put('detections/:id/verify')
    @ApiOperation({ summary: '驗證偵測' })
    verifyDetection(@Param('id') id: string, @Body() dto: { verified: boolean }) {
        return this.service.verifyDetection(id, dto.verified);
    }
}

import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WeatherAlertIntegrationService } from './weather-alert-integration.service';

@ApiTags('Weather Alert Integration')
@ApiBearerAuth()
@Controller('weather-alerts')
export class WeatherAlertIntegrationController {
    constructor(private readonly service: WeatherAlertIntegrationService) { }

    @Post()
    @ApiOperation({ summary: '建立天氣警報' })
    createAlert(@Body() dto: any) {
        return this.service.createAlert(dto);
    }

    @Get('active')
    @ApiOperation({ summary: '取得活躍警報' })
    getActiveAlerts() {
        return this.service.getActiveAlerts();
    }

    @Get('region/:region')
    @ApiOperation({ summary: '依區域取得警報' })
    getAlertsByRegion(@Param('region') region: string) {
        return this.service.getAlertsByRegion(region);
    }

    @Get(':id')
    @ApiOperation({ summary: '取得單一警報' })
    getAlert(@Param('id') id: string) {
        return this.service.getAlert(id);
    }

    @Put(':id')
    @ApiOperation({ summary: '更新警報' })
    updateAlert(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateAlert(id, dto);
    }

    @Post(':id/resolve')
    @ApiOperation({ summary: '解除警報' })
    resolveAlert(@Param('id') id: string) {
        return { resolved: this.service.resolveAlert(id) };
    }

    @Post('sync/cwb')
    @ApiOperation({ summary: '同步中央氣象署資料' })
    async syncFromCwb() {
        const count = await this.service.syncFromCwb();
        return { synced: count };
    }

    @Get('weather/:locationId')
    @ApiOperation({ summary: '取得氣象資料' })
    getWeatherData(@Param('locationId') locationId: string) {
        return this.service.getWeatherData(locationId);
    }

    @Get('weather/:locationId/history')
    @ApiOperation({ summary: '取得氣象歷史' })
    getWeatherHistory(@Param('locationId') locationId: string, @Query('hours') hours?: number) {
        return this.service.getWeatherHistory(locationId, hours || 24);
    }

    @Post('subscriptions')
    @ApiOperation({ summary: '訂閱警報' })
    subscribe(@Body() dto: any) {
        return this.service.subscribe(dto);
    }

    @Get('subscriptions/user/:userId')
    @ApiOperation({ summary: '取得用戶訂閱' })
    getUserSubscriptions(@Param('userId') userId: string) {
        return this.service.getUserSubscriptions(userId);
    }

    @Put('subscriptions/:id')
    @ApiOperation({ summary: '更新訂閱' })
    updateSubscription(@Param('id') id: string, @Body() dto: any) {
        return this.service.updateSubscription(id, dto);
    }

    @Delete('subscriptions/:id')
    @ApiOperation({ summary: '取消訂閱' })
    unsubscribe(@Param('id') id: string) {
        return { unsubscribed: this.service.unsubscribe(id) };
    }

    @Post('missions/:missionId/link')
    @ApiOperation({ summary: '連結任務與天氣' })
    linkMissionToWeather(@Param('missionId') missionId: string, @Body() dto: any) {
        return this.service.linkMissionToWeather({ missionId, ...dto });
    }

    @Get('missions/:missionId/impact')
    @ApiOperation({ summary: '評估任務天氣影響' })
    evaluateMissionImpact(@Param('missionId') missionId: string) {
        return this.service.evaluateMissionImpact(missionId);
    }

    @Delete('missions/:missionId/link')
    @ApiOperation({ summary: '解除任務天氣連結' })
    unlinkMission(@Param('missionId') missionId: string) {
        return { unlinked: this.service.unlinkMission(missionId) };
    }
}

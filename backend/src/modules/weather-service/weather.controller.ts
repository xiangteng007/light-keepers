import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { WeatherAlert } from './services/alert.service';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
    constructor(private readonly weatherService: WeatherService) {}

    // === Overview ===

    @Get('overview')
    @ApiOperation({ summary: '取得天氣概覽' })
    @ApiQuery({ name: 'location', required: false, description: '位置名稱' })
    async getOverview(@Query('location') location?: string) {
        return this.weatherService.getOverview(location);
    }

    @Get('location')
    @ApiOperation({ summary: '依座標取得完整天氣資訊' })
    @ApiQuery({ name: 'lat', required: true, description: '緯度' })
    @ApiQuery({ name: 'lng', required: true, description: '經度' })
    async getByLocation(@Query('lat') lat: string, @Query('lng') lng: string) {
        return this.weatherService.getWeatherByLocation(parseFloat(lat), parseFloat(lng));
    }

    // === Current Weather ===

    @Get('current')
    @ApiOperation({ summary: '取得即時天氣' })
    @ApiQuery({ name: 'location', required: false, description: '位置名稱' })
    getCurrentWeather(@Query('location') location?: string) {
        return this.weatherService.getCurrentWeather(location);
    }

    @Get('current/:code')
    @ApiOperation({ summary: '依測站代碼取得天氣' })
    @ApiParam({ name: 'code', description: '測站代碼' })
    getWeatherByCode(@Param('code') code: string) {
        return this.weatherService.getWeatherByCode(code);
    }

    // === Forecast ===

    @Get('forecast')
    @ApiOperation({ summary: '取得 36 小時天氣預報' })
    @ApiQuery({ name: 'location', required: false, description: '縣市名稱' })
    async getForecast(@Query('location') location?: string) {
        return this.weatherService.getForecast(location);
    }

    @Get('forecast/weekly')
    @ApiOperation({ summary: '取得一週天氣預報' })
    @ApiQuery({ name: 'location', required: false, description: '縣市名稱' })
    async getWeeklyForecast(@Query('location') location?: string) {
        return this.weatherService.getWeeklyForecast(location);
    }

    @Get('forecast/marine')
    @ApiOperation({ summary: '取得海象預報' })
    @ApiQuery({ name: 'region', required: false, description: '海域名稱' })
    async getMarineForecast(@Query('region') region?: string) {
        return this.weatherService.getMarineForecast(region);
    }

    @Get('forecast/tide')
    @ApiOperation({ summary: '取得潮汐預報' })
    @ApiQuery({ name: 'station', required: false, description: '潮位站名稱' })
    async getTideForecast(@Query('station') station?: string) {
        return this.weatherService.getTideForecast(station);
    }

    @Get('forecast/mountain')
    @ApiOperation({ summary: '取得登山天氣預報' })
    @ApiQuery({ name: 'location', required: false, description: '山區名稱' })
    async getMountainForecast(@Query('location') location?: string) {
        return this.weatherService.getMountainForecast(location);
    }

    // === Alerts ===

    @Get('alerts')
    @ApiOperation({ summary: '取得有效警報' })
    getActiveAlerts() {
        return this.weatherService.getActiveAlerts();
    }

    @Get('alerts/region/:region')
    @ApiOperation({ summary: '依區域取得警報' })
    @ApiParam({ name: 'region', description: '區域名稱' })
    getAlertsByRegion(@Param('region') region: string) {
        return this.weatherService.getAlertsByRegion(region);
    }

    @Get('alerts/:id')
    @ApiOperation({ summary: '取得單一警報' })
    @ApiParam({ name: 'id', description: '警報 ID' })
    getAlert(@Param('id') id: string) {
        return this.weatherService.getAlert(id);
    }

    @Post('alerts')
    @ApiOperation({ summary: '建立手動警報' })
    @ApiBody({ description: '警報資料' })
    createAlert(@Body() data: Omit<WeatherAlert, 'id' | 'createdAt'>) {
        return this.weatherService.createAlert(data);
    }

    @Delete('alerts/:id')
    @ApiOperation({ summary: '解除警報' })
    @ApiParam({ name: 'id', description: '警報 ID' })
    resolveAlert(@Param('id') id: string) {
        return { resolved: this.weatherService.resolveAlert(id) };
    }

    @Post('alerts/sync')
    @ApiOperation({ summary: '從 CWA 同步警報' })
    async syncAlerts() {
        const count = await this.weatherService.syncAlertsFromCwa();
        return { synced: count };
    }

    // === Risk Assessment ===

    @Get('risk')
    @ApiOperation({ summary: '評估位置天氣風險' })
    @ApiQuery({ name: 'lat', required: true, description: '緯度' })
    @ApiQuery({ name: 'lng', required: true, description: '經度' })
    async assessRisk(@Query('lat') lat: string, @Query('lng') lng: string) {
        return this.weatherService.assessWeatherRisk(parseFloat(lat), parseFloat(lng));
    }

    @Get('risk/severe')
    @ApiOperation({ summary: '檢查是否有嚴重天氣' })
    hasSevereWeather() {
        return { hasSevere: this.weatherService.hasSevereWeather() };
    }

    @Post('risk/mission/:missionId')
    @ApiOperation({ summary: '評估任務天氣可行性' })
    @ApiParam({ name: 'missionId', description: '任務 ID' })
    @ApiBody({ description: '任務位置列表' })
    async assessMissionFeasibility(
        @Param('missionId') missionId: string,
        @Body() locations: Array<{ lat: number; lng: number }>
    ) {
        return this.weatherService.assessMissionFeasibility(missionId, locations);
    }

    // === Sync ===

    @Post('sync')
    @ApiOperation({ summary: '手動同步天氣資料' })
    async syncWeatherData() {
        await this.weatherService.syncWeatherData();
        return { success: true, syncedAt: new Date() };
    }
}

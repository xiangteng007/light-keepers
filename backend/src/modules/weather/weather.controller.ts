/**
 * Weather Controller
 * REST API endpoints for weather data
 */

import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@Controller('api/weather')
export class WeatherController {
    constructor(private readonly weatherService: WeatherService) { }

    @Get('current')
    @ApiOperation({ summary: '取得目前天氣資料' })
    @ApiQuery({ name: 'location', required: false, description: '地點名稱' })
    @ApiResponse({ status: 200, description: '成功取得天氣資料' })
    async getCurrentWeather(@Query('location') location?: string) {
        const data = await this.weatherService.getCurrentWeather(location);
        return {
            success: true,
            data,
        };
    }

    @Get('forecast/:location')
    @ApiOperation({ summary: '取得天氣預報' })
    @ApiResponse({ status: 200, description: '成功取得天氣預報' })
    async getForecast(@Param('location') location: string) {
        const data = await this.weatherService.getForecast(location);
        return {
            success: true,
            data,
        };
    }

    @Get('alerts')
    @ApiOperation({ summary: '取得有效天氣警報' })
    @ApiResponse({ status: 200, description: '成功取得天氣警報' })
    async getAlerts() {
        const data = await this.weatherService.getActiveAlerts();
        return {
            success: true,
            data,
        };
    }

    @Get('alerts/location/:location')
    @ApiOperation({ summary: '取得特定地點的天氣警報' })
    async getAlertsByLocation(@Param('location') location: string) {
        const data = await this.weatherService.getAlertsByLocation(location);
        return {
            success: true,
            data,
        };
    }

    @Get('risk')
    @ApiOperation({ summary: '評估指定位置的天氣風險' })
    @ApiQuery({ name: 'lat', required: true, description: '緯度' })
    @ApiQuery({ name: 'lng', required: true, description: '經度' })
    async assessRisk(
        @Query('lat') lat: string,
        @Query('lng') lng: string
    ) {
        const data = await this.weatherService.assessWeatherRisk(
            parseFloat(lat),
            parseFloat(lng)
        );
        return {
            success: true,
            data,
        };
    }

    @Get('sync')
    @ApiOperation({ summary: '手動觸發天氣資料同步' })
    async triggerSync() {
        await this.weatherService.syncWeatherData();
        return {
            success: true,
            message: '天氣資料同步完成',
        };
    }
}

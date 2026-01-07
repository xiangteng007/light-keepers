/**
 * Weather Hub Controller - 氣象整合端點
 * 
 * 提供統一的氣象資訊 API。
 */

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WeatherHubService } from './weather-hub.service';

@ApiTags('Weather Hub')
@Controller('weather-hub')
export class WeatherHubController {
    constructor(private readonly service: WeatherHubService) { }

    /**
     * 取得氣象總覽
     */
    @Get('overview')
    @ApiOperation({ summary: '取得氣象總覽 (天氣+預報+警報)' })
    @ApiQuery({ name: 'location', required: false })
    async getOverview(@Query('location') location?: string) {
        return this.service.getOverview(location);
    }

    /**
     * 取得指定座標的氣象資訊
     */
    @Get('by-location')
    @ApiOperation({ summary: '取得指定座標的氣象資訊' })
    @ApiQuery({ name: 'lat', required: true, type: Number })
    @ApiQuery({ name: 'lng', required: true, type: Number })
    async getByLocation(
        @Query('lat') lat: number,
        @Query('lng') lng: number,
    ) {
        return this.service.getWeatherByLocation(lat, lng);
    }
}

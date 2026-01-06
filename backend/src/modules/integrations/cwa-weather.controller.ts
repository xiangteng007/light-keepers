/**
 * CWA Weather Controller
 * REST API for weather data
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CwaWeatherService } from './cwa-weather.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('weather')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.PUBLIC)
export class CwaWeatherController {
    constructor(private readonly weatherService: CwaWeatherService) { }

    /**
     * Get current weather for a location
     */
    @Get('current')
    async getCurrentWeather(@Query('location') location: string = '臺北') {
        const data = await this.weatherService.getCurrentWeather(location);
        return { success: true, data };
    }

    /**
     * Get weather forecast
     */
    @Get('forecast')
    async getForecast(
        @Query('city') city: string = '臺北市',
        @Query('days') days: string = '7',
    ) {
        const data = await this.weatherService.getForecast(city, parseInt(days, 10));
        return { success: true, data };
    }

    /**
     * Get active weather alerts
     */
    @Get('alerts')
    async getAlerts() {
        const data = await this.weatherService.getActiveAlerts();
        return { success: true, data };
    }

    /**
     * Get weather status
     */
    @Get('status')
    async getStatus() {
        return {
            success: true,
            data: {
                configured: this.weatherService.isConfigured(),
                source: 'CWA (Central Weather Administration)',
            },
        };
    }
}

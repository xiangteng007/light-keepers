import { Controller, Get, Query } from '@nestjs/common';
import { WeatherForecastService } from './weather-forecast.service';
import { TAIWAN_COUNTIES, TIDE_STATIONS, MARINE_REGIONS } from './dto/weather-forecast.dto';

@Controller('weather')
export class WeatherForecastController {
    constructor(private readonly weatherService: WeatherForecastService) { }

    // ==================== 一般天氣預報 ====================

    @Get('general')
    async getGeneralForecast(@Query('county') county?: string) {
        const data = await this.weatherService.getGeneralForecast(county);
        return { success: true, data };
    }

    @Get('weekly')
    async getWeeklyForecast(@Query('county') county?: string) {
        const data = await this.weatherService.getWeeklyForecast(county);
        return { success: true, data };
    }

    // ==================== 天氣圖資 ====================

    @Get('maps')
    async getWeatherMaps() {
        const data = await this.weatherService.getWeatherMaps();
        return { success: true, data };
    }

    @Get('rainfall')
    async getRainfallForecast() {
        const data = await this.weatherService.getRainfallForecast();
        return { success: true, data };
    }

    // ==================== 海洋預報 ====================

    @Get('marine')
    async getMarineWeather(@Query('region') region?: string) {
        const data = await this.weatherService.getMarineWeather(region);
        return { success: true, data };
    }

    @Get('wave')
    async getWaveForecast(@Query('region') region?: string) {
        const data = await this.weatherService.getWaveForecast(region);
        return { success: true, data };
    }

    @Get('tide')
    async getTideForecast(@Query('station') station?: string) {
        const data = await this.weatherService.getTideForecast(station);
        return { success: true, data };
    }

    // ==================== 育樂天氣預報 ====================

    @Get('mountain')
    async getMountainForecast(@Query('location') location?: string) {
        const data = await this.weatherService.getMountainForecast(location);
        return { success: true, data };
    }

    @Get('scenic')
    async getScenicForecast(@Query('location') location?: string) {
        const data = await this.weatherService.getScenicForecast(location);
        return { success: true, data };
    }

    @Get('farm')
    async getFarmForecast(@Query('location') location?: string) {
        const data = await this.weatherService.getFarmForecast(location);
        return { success: true, data };
    }

    // ==================== 參考資料 ====================

    @Get('counties')
    async getCounties() {
        return { success: true, data: TAIWAN_COUNTIES };
    }

    @Get('tide-stations')
    async getTideStations() {
        return { success: true, data: TIDE_STATIONS };
    }

    @Get('marine-regions')
    async getMarineRegions() {
        return { success: true, data: MARINE_REGIONS };
    }

    // ==================== 綜合摘要 ====================

    @Get('summary')
    async getForecastSummary(@Query('county') county?: string) {
        const data = await this.weatherService.getForecastSummary(county);
        return { success: true, data };
    }
}

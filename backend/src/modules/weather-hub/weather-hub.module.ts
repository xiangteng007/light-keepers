/**
 * Weather Hub Module - 氣象整合中心
 * 
 * 整合三個氣象相關模組為統一入口：
 * 1. WeatherService - 氣象雷達 (CWA radar tiles)
 * 2. WeatherForecastService - 天氣預報 (CWA OpenData)
 * 3. WeatherAlertIntegrationService - 氣象預警整合
 * 
 * 此模組作為 facade，提供統一的 API 端點。
 */

import { Module, forwardRef } from '@nestjs/common';
import { WeatherModule } from '../weather/weather.module';
import { WeatherForecastModule } from '../weather-forecast/weather-forecast.module';
import { WeatherAlertIntegrationModule } from '../weather-alert-integration/weather-alert-integration.module';
import { WeatherHubController } from './weather-hub.controller';
import { WeatherHubService } from './weather-hub.service';

@Module({
    imports: [
        forwardRef(() => WeatherModule),
        forwardRef(() => WeatherForecastModule),
        forwardRef(() => WeatherAlertIntegrationModule),
    ],
    controllers: [WeatherHubController],
    providers: [WeatherHubService],
    exports: [WeatherHubService],
})
export class WeatherHubModule { }

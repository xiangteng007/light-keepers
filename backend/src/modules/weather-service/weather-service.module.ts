import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Core Services
import { CwaApiService } from './services/cwa-api.service';
import { CurrentWeatherService } from './services/current-weather.service';
import { ForecastService } from './services/forecast.service';
import { AlertService } from './services/alert.service';
import { WeatherRiskService } from './services/weather-risk.service';

// Unified Service
import { WeatherService } from './weather.service';

// Controller
import { WeatherController } from './weather.controller';

/**
 * Weather Service Module (Unified)
 * 
 * 整合所有氣象相關功能至單一模組：
 * - CWA API 整合
 * - 即時天氣
 * - 預報（36h, 週報, 海象, 潮汐, 育樂）
 * - 警報管理與訂閱
 * - 風險評估
 * 
 * 取代舊模組：
 * - weather
 * - weather-forecast
 * - weather-hub
 * - weather-alert-integration
 */
@Global()
@Module({
    imports: [
        HttpModule.register({
            timeout: 10000,
            maxRedirects: 3,
        }),
        ConfigModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [WeatherController],
    providers: [
        CwaApiService,
        CurrentWeatherService,
        ForecastService,
        AlertService,
        WeatherRiskService,
        WeatherService,
    ],
    exports: [
        WeatherService,
        AlertService,
        WeatherRiskService,
    ],
})
export class WeatherServiceModule {}

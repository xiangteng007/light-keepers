import { Module } from '@nestjs/common';
import { WeatherAlertIntegrationService } from './weather-alert-integration.service';
import { WeatherAlertIntegrationController } from './weather-alert-integration.controller';

@Module({
    providers: [WeatherAlertIntegrationService],
    controllers: [WeatherAlertIntegrationController],
    exports: [WeatherAlertIntegrationService],
})
export class WeatherAlertIntegrationModule { }

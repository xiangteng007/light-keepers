import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationsController } from './integrations.controller';
import { ExternalApiService } from './external-api.service';
import { CwaWeatherService } from './cwa-weather.service';
import { CwaWeatherController } from './cwa-weather.controller';

@Module({
    imports: [HttpModule],
    controllers: [IntegrationsController, CwaWeatherController],
    providers: [ExternalApiService, CwaWeatherService],
    exports: [ExternalApiService, CwaWeatherService],
})
export class IntegrationsModule { }


import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WeatherForecastController } from './weather-forecast.controller';
import { WeatherForecastService } from './weather-forecast.service';

@Module({
    imports: [
        HttpModule.register({
            timeout: 30000,
            maxRedirects: 5,
        }),
        ConfigModule,
    ],
    controllers: [WeatherForecastController],
    providers: [WeatherForecastService],
    exports: [WeatherForecastService],
})
export class WeatherForecastModule { }

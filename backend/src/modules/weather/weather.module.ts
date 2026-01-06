import { Module } from '@nestjs/common';
import { WeatherRadarService } from './weather-radar.service';

@Module({
    providers: [WeatherRadarService],
    exports: [WeatherRadarService],
})
export class WeatherModule { }

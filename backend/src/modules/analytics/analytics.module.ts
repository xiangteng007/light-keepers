import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../reports/reports.entity';
import { TrendPredictionController } from './trend-prediction.controller';
import { TrendPredictionService } from './trend-prediction.service';
import { AnalyticsEventListener } from './analytics-event.listener';

@Module({
    imports: [TypeOrmModule.forFeature([Report])],
    controllers: [TrendPredictionController],
    providers: [TrendPredictionService, AnalyticsEventListener],
    exports: [TrendPredictionService],
})
export class AnalyticsModule { }


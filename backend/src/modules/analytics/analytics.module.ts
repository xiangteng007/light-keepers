import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../reports/reports.entity';
import { TrendPredictionController } from './trend-prediction.controller';
import { TrendPredictionService } from './trend-prediction.service';

@Module({
    imports: [TypeOrmModule.forFeature([Report])],
    controllers: [TrendPredictionController],
    providers: [TrendPredictionService],
    exports: [TrendPredictionService],
})
export class AnalyticsModule { }

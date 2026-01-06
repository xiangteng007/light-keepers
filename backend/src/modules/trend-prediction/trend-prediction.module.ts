import { Module } from '@nestjs/common';
import { TrendPredictionService } from './trend-prediction.service';

@Module({
    providers: [TrendPredictionService],
    exports: [TrendPredictionService],
})
export class TrendPredictionModule { }

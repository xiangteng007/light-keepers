import {
    Controller,
    Get,
    Query,
} from '@nestjs/common';
import { TrendPredictionService } from './trend-prediction.service';
import { ReportType } from '../reports/reports.entity';

@Controller('analytics/prediction')
export class TrendPredictionController {
    constructor(private readonly predictionService: TrendPredictionService) { }

    // 趨勢預測
    @Get('trend')
    async predictTrend(
        @Query('type') type?: ReportType,
        @Query('days') days?: string,
        @Query('historyDays') historyDays?: string,
    ) {
        const result = await this.predictionService.predictTrend(
            type,
            days ? parseInt(days, 10) : 7,
            historyDays ? parseInt(historyDays, 10) : 30,
        );

        return {
            success: true,
            data: result,
        };
    }

    // 季節性分析
    @Get('seasonality')
    async analyzeSeasonality(@Query('days') days?: string) {
        const result = await this.predictionService.analyzeSeasonality(
            days ? parseInt(days, 10) : 30,
        );

        return {
            success: true,
            data: result,
        };
    }

    // 風險評估
    @Get('risk')
    async assessRisks(@Query('days') days?: string) {
        const result = await this.predictionService.assessRisks(
            days ? parseInt(days, 10) : 7,
        );

        return {
            success: true,
            data: result,
        };
    }

    // 異常檢測
    @Get('anomaly')
    async detectAnomalies(@Query('days') days?: string) {
        const result = await this.predictionService.detectAnomalies(
            days ? parseInt(days, 10) : 7,
        );

        return {
            success: true,
            data: result,
        };
    }

    // 綜合報告
    @Get('summary')
    async getSummary(@Query('days') days?: string) {
        const dayNum = days ? parseInt(days, 10) : 7;

        const [trend, seasonality, risks, anomalies] = await Promise.all([
            this.predictionService.predictTrend(undefined, dayNum, 30),
            this.predictionService.analyzeSeasonality(30),
            this.predictionService.assessRisks(dayNum),
            this.predictionService.detectAnomalies(dayNum),
        ]);

        return {
            success: true,
            data: {
                trend: {
                    nextDayPrediction: trend.predictions[0],
                    accuracy: trend.accuracy,
                },
                peakHours: seasonality.hourly
                    .sort((a, b) => b.avgCount - a.avgCount)
                    .slice(0, 3)
                    .map(h => h.hour),
                topRisks: risks.slice(0, 3),
                anomalies: anomalies.hasAnomaly ? anomalies.anomalies : [],
                generatedAt: new Date(),
            },
        };
    }
}

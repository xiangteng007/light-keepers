import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportType } from '../reports/reports.entity';

export interface TrendPrediction {
    date: string;
    predicted: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
}

export interface SeasonalPattern {
    hour: number;
    avgCount: number;
    stdDev: number;
}

export interface RiskAssessment {
    type: ReportType;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    trend: 'decreasing' | 'stable' | 'increasing';
    factors: string[];
}

export interface PredictionResult {
    predictions: TrendPrediction[];
    accuracy: number;
    model: string;
    generatedAt: Date;
}

@Injectable()
export class TrendPredictionService {
    private readonly logger = new Logger(TrendPredictionService.name);

    constructor(
        @InjectRepository(Report)
        private readonly reportRepo: Repository<Report>,
    ) { }

    // ===== 趨勢預測（簡單移動平均 + 線性回歸）=====

    async predictTrend(
        type?: ReportType,
        days: number = 7,
        historyDays: number = 30,
    ): Promise<PredictionResult> {
        // 取得歷史數據
        const historicalData = await this.getHistoricalData(historyDays, type);

        if (historicalData.length < 7) {
            this.logger.warn('Insufficient data for prediction');
            return {
                predictions: [],
                accuracy: 0,
                model: 'insufficient_data',
                generatedAt: new Date(),
            };
        }

        // 計算移動平均
        const movingAvg = this.calculateMovingAverage(historicalData, 7);

        // 線性回歸預測
        const { slope, intercept, r2 } = this.linearRegression(
            movingAvg.map((_, i) => i),
            movingAvg,
        );

        // 生成預測
        const predictions: TrendPrediction[] = [];
        const today = new Date();

        for (let i = 1; i <= days; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + i);

            const predicted = Math.max(0, Math.round(
                intercept + slope * (movingAvg.length + i - 1)
            ));

            // 計算置信區間（基於標準差）
            const stdDev = this.calculateStdDev(historicalData);
            const confidence = Math.max(0.5, Math.min(0.95, r2));

            predictions.push({
                date: futureDate.toISOString().split('T')[0],
                predicted,
                confidence,
                upperBound: Math.round(predicted + stdDev * 1.96),
                lowerBound: Math.max(0, Math.round(predicted - stdDev * 1.96)),
            });
        }

        return {
            predictions,
            accuracy: r2,
            model: 'linear_regression_ma7',
            generatedAt: new Date(),
        };
    }

    // ===== 季節性分析 =====

    async analyzeSeasonality(days: number = 30): Promise<{
        hourly: SeasonalPattern[];
        weekday: { day: string; avgCount: number }[];
    }> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 每小時分佈
        const hourlyRaw = await this.reportRepo
            .createQueryBuilder('r')
            .select("EXTRACT(HOUR FROM r.createdAt)", 'hour')
            .addSelect('COUNT(*)', 'count')
            .where('r.createdAt >= :startDate', { startDate })
            .groupBy("EXTRACT(HOUR FROM r.createdAt)")
            .orderBy('hour', 'ASC')
            .getRawMany();

        // 計算每小時的平均和標準差
        const hourlyMap = new Map<number, number[]>();
        for (let h = 0; h < 24; h++) {
            hourlyMap.set(h, []);
        }

        const reports = await this.reportRepo.find({
            where: { createdAt: new Date(startDate) as any },
            select: ['createdAt'],
        });

        // 簡化：使用聚合結果
        const hourly: SeasonalPattern[] = [];
        for (let h = 0; h < 24; h++) {
            const found = hourlyRaw.find(r => parseInt(r.hour) === h);
            hourly.push({
                hour: h,
                avgCount: found ? parseFloat(found.count) / days : 0,
                stdDev: 0, // 簡化
            });
        }

        // 每週幾分佈
        const weekdayRaw = await this.reportRepo
            .createQueryBuilder('r')
            .select("EXTRACT(DOW FROM r.createdAt)", 'dow')
            .addSelect('COUNT(*)', 'count')
            .where('r.createdAt >= :startDate', { startDate })
            .groupBy("EXTRACT(DOW FROM r.createdAt)")
            .orderBy('dow', 'ASC')
            .getRawMany();

        const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        const weekday = dayNames.map((day, index) => {
            const found = weekdayRaw.find(r => parseInt(r.dow) === index);
            return {
                day,
                avgCount: found ? parseFloat(found.count) / (days / 7) : 0,
            };
        });

        return { hourly, weekday };
    }

    // ===== 風險評估 =====

    async assessRisks(days: number = 7): Promise<RiskAssessment[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const previousStart = new Date(startDate);
        previousStart.setDate(previousStart.getDate() - days);

        // 當前期間統計
        const currentStats = await this.reportRepo
            .createQueryBuilder('r')
            .select('r.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG(r.severity)', 'avgSeverity')
            .where('r.createdAt >= :startDate', { startDate })
            .groupBy('r.type')
            .getRawMany();

        // 前一期間統計
        const previousStats = await this.reportRepo
            .createQueryBuilder('r')
            .select('r.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('r.createdAt >= :previousStart', { previousStart })
            .andWhere('r.createdAt < :startDate', { startDate })
            .groupBy('r.type')
            .getRawMany();

        const previousMap = new Map(previousStats.map(s => [s.type, parseInt(s.count)]));

        const assessments: RiskAssessment[] = [];

        for (const stat of currentStats) {
            const currentCount = parseInt(stat.count);
            const previousCount = previousMap.get(stat.type) || 0;
            const avgSeverity = parseFloat(stat.avgSeverity) || 1;

            // 計算變化趨勢
            let trend: 'decreasing' | 'stable' | 'increasing';
            const changeRate = previousCount > 0
                ? (currentCount - previousCount) / previousCount
                : currentCount > 0 ? 1 : 0;

            if (changeRate < -0.2) trend = 'decreasing';
            else if (changeRate > 0.2) trend = 'increasing';
            else trend = 'stable';

            // 計算風險分數 (0-100)
            const score = Math.min(100, Math.round(
                (currentCount * 10 + avgSeverity * 15) * (trend === 'increasing' ? 1.5 : 1)
            ));

            // 判斷風險等級
            let riskLevel: 'low' | 'medium' | 'high' | 'critical';
            if (score < 25) riskLevel = 'low';
            else if (score < 50) riskLevel = 'medium';
            else if (score < 75) riskLevel = 'high';
            else riskLevel = 'critical';

            // 識別風險因素
            const factors: string[] = [];
            if (trend === 'increasing') factors.push(`較前期增加 ${Math.round(changeRate * 100)}%`);
            if (avgSeverity > 2.5) factors.push('平均嚴重程度較高');
            if (currentCount > 10) factors.push('事件數量較多');

            assessments.push({
                type: stat.type as ReportType,
                riskLevel,
                score,
                trend,
                factors,
            });
        }

        // 按風險分數排序
        return assessments.sort((a, b) => b.score - a.score);
    }

    // ===== 異常檢測 =====

    async detectAnomalies(days: number = 7): Promise<{
        hasAnomaly: boolean;
        anomalies: { date: string; actual: number; expected: number; zscore: number }[];
    }> {
        const historicalData = await this.getHistoricalData(30);
        const recentData = await this.getHistoricalData(days);

        const mean = historicalData.reduce((a, b) => a + b, 0) / historicalData.length || 0;
        const stdDev = this.calculateStdDev(historicalData);

        const anomalies: { date: string; actual: number; expected: number; zscore: number }[] = [];

        const today = new Date();
        for (let i = 0; i < recentData.length; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - (recentData.length - 1 - i));
            const zscore = stdDev > 0 ? (recentData[i] - mean) / stdDev : 0;

            if (Math.abs(zscore) > 2) {
                anomalies.push({
                    date: date.toISOString().split('T')[0],
                    actual: recentData[i],
                    expected: Math.round(mean),
                    zscore: Math.round(zscore * 100) / 100,
                });
            }
        }

        return {
            hasAnomaly: anomalies.length > 0,
            anomalies,
        };
    }

    // ===== 輔助方法 =====

    private async getHistoricalData(days: number, type?: ReportType): Promise<number[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const query = this.reportRepo.createQueryBuilder('r')
            .select("DATE_TRUNC('day', r.createdAt)", 'date')
            .addSelect('COUNT(*)', 'count')
            .where('r.createdAt >= :startDate', { startDate });

        if (type) {
            query.andWhere('r.type = :type', { type });
        }

        const results = await query
            .groupBy("DATE_TRUNC('day', r.createdAt)")
            .orderBy('date', 'ASC')
            .getRawMany();

        return results.map(r => parseInt(r.count));
    }

    private calculateMovingAverage(data: number[], window: number): number[] {
        const result: number[] = [];
        for (let i = window - 1; i < data.length; i++) {
            const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / window);
        }
        return result;
    }

    private linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
        const n = x.length;
        if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
        const sumXX = x.reduce((total, xi) => total + xi * xi, 0);
        const sumYY = y.reduce((total, yi) => total + yi * yi, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
        const intercept = (sumY - slope * sumX) / n || 0;

        // R² 計算
        const yMean = sumY / n;
        const ssTotal = y.reduce((total, yi) => total + (yi - yMean) ** 2, 0);
        const ssRes = y.reduce((total, yi, i) => total + (yi - (intercept + slope * x[i])) ** 2, 0);
        const r2 = ssTotal > 0 ? 1 - ssRes / ssTotal : 0;

        return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
    }

    private calculateStdDev(data: number[]): number {
        if (data.length === 0) return 0;
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const squareDiffs = data.map(value => (value - mean) ** 2);
        return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / data.length);
    }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TrendPredictionService } from './trend-prediction.service';
import { Report } from '../reports/reports.entity';

describe('TrendPredictionService', () => {
    let service: TrendPredictionService;
    let queryBuilder: any;
    let reportRepo: any;

    beforeEach(async () => {
        queryBuilder = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
        };

        reportRepo = {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TrendPredictionService,
                { provide: getRepositoryToken(Report), useValue: reportRepo },
            ],
        }).compile();

        service = module.get<TrendPredictionService>(TrendPredictionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== predictTrend =====
    describe('predictTrend', () => {
        it('should return insufficient_data when history too short', async () => {
            queryBuilder.getRawMany.mockResolvedValueOnce([
                { date: '2024-01-01', count: '5' },
            ]); // Only 1 day

            const result = await service.predictTrend();
            expect(result.model).toBe('insufficient_data');
            expect(result.predictions).toHaveLength(0);
        });

        it('should generate predictions with enough data', async () => {
            // 14 days of historical data
            const data = Array.from({ length: 14 }, (_, i) => ({
                date: `2024-01-${String(i + 1).padStart(2, '0')}`,
                count: String(10 + i),
            }));
            queryBuilder.getRawMany.mockResolvedValueOnce(data);

            const result = await service.predictTrend(undefined, 7);
            expect(result.model).toBe('linear_regression_ma7');
            expect(result.predictions).toHaveLength(7);
            expect(result.accuracy).toBeGreaterThanOrEqual(0);
            expect(result.accuracy).toBeLessThanOrEqual(1);

            for (const pred of result.predictions) {
                expect(pred.date).toBeDefined();
                expect(pred.predicted).toBeGreaterThanOrEqual(0);
                expect(pred.upperBound).toBeGreaterThanOrEqual(pred.predicted);
                expect(pred.lowerBound).toBeLessThanOrEqual(pred.predicted);
                expect(pred.confidence).toBeGreaterThanOrEqual(0.5);
                expect(pred.confidence).toBeLessThanOrEqual(0.95);
            }
        });
    });

    // ===== analyzeSeasonality =====
    describe('analyzeSeasonality', () => {
        it('should return 24 hourly patterns and 7 weekday patterns', async () => {
            queryBuilder.getRawMany
                .mockResolvedValueOnce([{ hour: '9', count: '30' }]) // hourly
                .mockResolvedValueOnce([{ dow: '1', count: '50' }]); // weekday

            const result = await service.analyzeSeasonality(30);
            expect(result.hourly).toHaveLength(24);
            expect(result.hourly[9].avgCount).toBe(1); // 30 / 30 days
            expect(result.weekday).toHaveLength(7);
            expect(result.weekday[0].day).toBe('週日');
        });
    });

    // ===== assessRisks =====
    describe('assessRisks', () => {
        it('should return empty when no data', async () => {
            const result = await service.assessRisks();
            expect(result).toEqual([]);
        });

        it('should assess risk levels correctly', async () => {
            queryBuilder.getRawMany
                .mockResolvedValueOnce([
                    { type: 'fire', count: '20', avgSeverity: '4.0' },
                    { type: 'flood', count: '2', avgSeverity: '1.5' },
                ]) // current period
                .mockResolvedValueOnce([
                    { type: 'fire', count: '5' },
                ]); // previous period (fire increasing)

            const result = await service.assessRisks();
            expect(result.length).toBe(2);
            // Fire should be higher risk (increasing + high severity + many events)
            expect(result[0].type).toBe('fire');
            expect(result[0].trend).toBe('increasing');
            expect(result[0].score).toBeGreaterThan(result[1].score);
        });
    });

    // ===== detectAnomalies =====
    describe('detectAnomalies', () => {
        it('should detect no anomalies in stable data', async () => {
            const stableData = Array.from({ length: 30 }, () => ({ date: '2024-01-01', count: '10' }));
            queryBuilder.getRawMany
                .mockResolvedValueOnce(stableData) // 30-day history
                .mockResolvedValueOnce(stableData.slice(0, 7)); // 7-day recent

            const result = await service.detectAnomalies();
            expect(result.hasAnomaly).toBe(false);
            expect(result.anomalies).toHaveLength(0);
        });

        it('should detect anomaly with extreme spike', async () => {
            // 30-day history: values around 10 with natural variance (stdDev > 0)
            const normalData = Array.from({ length: 30 }, (_, i) => ({
                date: '2024-01-01',
                count: String(8 + (i % 5)), // values cycle: 8,9,10,11,12
            }));
            // 7-day recent: spike of 500 on day 4 (z-score will be >> 2)
            const spikeData = Array.from({ length: 7 }, (_, i) => ({
                date: '2024-01-01',
                count: i === 3 ? '500' : '10',
            }));
            queryBuilder.getRawMany
                .mockResolvedValueOnce(normalData)  // getHistoricalData(30)
                .mockResolvedValueOnce(spikeData);   // getHistoricalData(7)

            const result = await service.detectAnomalies();
            expect(result.hasAnomaly).toBe(true);
            expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
            // The spike day should have a very high z-score
            const spikeAnomaly = result.anomalies.find(a => a.actual === 500);
            expect(spikeAnomaly).toBeDefined();
            expect(spikeAnomaly!.zscore).toBeGreaterThan(2);
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PredictiveAnalyticsService } from './predictive-analytics.service';

describe('PredictiveAnalyticsService', () => {
    let service: PredictiveAnalyticsService;
    let dataSource: { query: jest.Mock };

    beforeEach(async () => {
        dataSource = { query: jest.fn().mockResolvedValue([]) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PredictiveAnalyticsService,
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get<PredictiveAnalyticsService>(PredictiveAnalyticsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Risk Prediction =====
    describe('predictHighRiskAreas', () => {
        it('should return empty when no incident data', async () => {
            const result = await service.predictHighRiskAreas();
            expect(result).toEqual([]);
        });

        it('should identify high-risk areas from incident data', async () => {
            dataSource.query.mockResolvedValueOnce([
                { area: '台北市中正區', count: '15', lat: '25.03', lng: '121.52' },
                { area: '高雄市三民區', count: '8', lat: '22.63', lng: '120.30' },
            ]);
            const result = await service.predictHighRiskAreas();
            expect(result.length).toBe(2);
            expect(result[0].riskScore).toBeGreaterThanOrEqual(result[1].riskScore);
            expect(result[0].factors).toBeDefined();
            expect(result[0].predictedTimeframe).toBeDefined();
        });
    });

    // ===== SOS Likelihood =====
    describe('predictSOSLikelihood', () => {
        it('should return zero likelihood with no data', async () => {
            const result = await service.predictSOSLikelihood(25.03, 121.52);
            expect(result.likelihood).toBe(0);
            expect(result.historicalCount).toBe(0);
            expect(result.peakHours.length).toBeLessThanOrEqual(3);
        });

        it('should calculate likelihood from historical signals', async () => {
            const signals = Array.from({ length: 10 }, (_, i) => ({
                created_at: new Date(2024, 0, 1, i % 12).toISOString(),
            }));
            dataSource.query.mockResolvedValueOnce(signals);
            const result = await service.predictSOSLikelihood(25.03, 121.52, 5);
            expect(result.historicalCount).toBe(10);
            expect(result.likelihood).toBeGreaterThan(0);
            expect(result.peakHours.length).toBeLessThanOrEqual(3);
        });
    });

    // ===== Trend Analysis =====
    describe('analyzeTrends', () => {
        it('should return trends for incidents, SOS, and tasks', async () => {
            // 6 queries: calculateTrend(field_reports) x2, calculateTrend(sos_signals) x2, calculateTaskCompletionTrend x1
            dataSource.query
                .mockResolvedValueOnce([{ count: '20' }])  // field_reports current
                .mockResolvedValueOnce([{ count: '15' }])  // field_reports previous
                .mockResolvedValueOnce([{ count: '10' }])  // sos_signals current
                .mockResolvedValueOnce([{ count: '8' }])   // sos_signals previous
                .mockResolvedValueOnce([{ completed: '60', total: '100' }]); // tasks

            const result = await service.analyzeTrends(30);
            expect(result).toHaveLength(3);
            expect(result.map(t => t.metric)).toEqual(['incidents', 'sosSignals', 'taskCompletion']);
        });
    });

    // ===== Forecast =====
    describe('generateForecast', () => {
        it('should generate 7-day forecast', async () => {
            dataSource.query.mockResolvedValueOnce(
                Array.from({ length: 30 }, (_, i) => ({ count: String(5 + (i % 3)) }))
            );
            const result = await service.generateForecast('incidents', 7);
            expect(result).toHaveLength(7);
            result.forEach(v => expect(typeof v).toBe('number'));
        });

        it('should return forecast even with empty data', async () => {
            const result = await service.generateForecast('incidents', 3);
            expect(result).toHaveLength(3);
        });
    });

    // ===== Pattern Detection =====
    describe('detectPatterns', () => {
        it('should detect time, location, and weather patterns', async () => {
            dataSource.query
                .mockResolvedValueOnce([  // time patterns
                    { hour: '14', dow: '1', count: '20' },
                    { hour: '18', dow: '5', count: '15' },
                ])
                .mockResolvedValueOnce([  // location patterns
                    { location: '台北市', count: '30' },
                ]);

            const result = await service.detectPatterns();
            expect(result.length).toBeGreaterThanOrEqual(1);
            // Weather patterns always return 1 hardcoded pattern
            const weatherPattern = result.find(p => p.type === 'weather_correlation');
            expect(weatherPattern).toBeDefined();
        });
    });
});

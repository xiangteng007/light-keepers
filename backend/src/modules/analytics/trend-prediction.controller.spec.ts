import { Test, TestingModule } from '@nestjs/testing';
import { TrendPredictionController } from './trend-prediction.controller';
import { TrendPredictionService } from './trend-prediction.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TrendPredictionController', () => {
    let controller: TrendPredictionController;
    let service: jest.Mocked<Partial<TrendPredictionService>>;

    beforeEach(async () => {
        service = {
            predictTrend: jest.fn().mockResolvedValue({ predictions: [{ date: '2026-01-08', count: 12 }], accuracy: 0.85 }),
            analyzeSeasonality: jest.fn().mockResolvedValue({ hourly: [{ hour: 14, avgCount: 5 }] }),
            assessRisks: jest.fn().mockResolvedValue([{ type: 'flood', level: 'high' }]),
            detectAnomalies: jest.fn().mockResolvedValue({ hasAnomaly: true, anomalies: [{ date: '2026-01-05', type: 'spike' }] }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TrendPredictionController],
            providers: [{ provide: TrendPredictionService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<TrendPredictionController>(TrendPredictionController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('predictTrend returns trend prediction', async () => {
        const result = await controller.predictTrend(undefined, '7', '30');
        expect(result.success).toBe(true);
        expect(result.data.accuracy).toBe(0.85);
    });

    it('analyzeSeasonality returns seasonal patterns', async () => {
        const result = await controller.analyzeSeasonality('30');
        expect(result.success).toBe(true);
    });

    it('assessRisks returns risk assessment', async () => {
        const result = await controller.assessRisks('7');
        expect(result.success).toBe(true);
    });

    it('detectAnomalies returns anomaly detection', async () => {
        const result = await controller.detectAnomalies('7');
        expect(result.success).toBe(true);
    });

    it('getSummary returns comprehensive report', async () => {
        const result = await controller.getSummary('7');
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('trend');
        expect(result.data).toHaveProperty('peakHours');
        expect(result.data).toHaveProperty('topRisks');
    });
});

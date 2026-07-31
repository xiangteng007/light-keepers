import { Test, TestingModule } from '@nestjs/testing';
import { TrendPredictionController } from './trend-prediction.controller';
import { TrendPredictionService } from './trend-prediction.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TrendPredictionController', () => {
    let controller: TrendPredictionController;

    beforeEach(async () => {
        const service = {
            predictDisasterProbability: jest.fn().mockResolvedValue({ probability: 0.3 }),
            getRegionRiskOverview: jest.fn().mockResolvedValue({}),
            getSeasonalTrends: jest.fn().mockReturnValue([]),
            predictResourceDemand: jest.fn().mockResolvedValue({}),
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
    it('predictProbability', async () => expect(await controller.predictProbability('taipei', 'flood')).toBeDefined());
    it('getRegionRisk', async () => expect(await controller.getRegionRisk('taipei')).toBeDefined());
    it('getSeasonalTrends', () => expect(controller.getSeasonalTrends('taipei')).toEqual([]));
    it('predictResourceDemand', async () => expect(await controller.predictResourceDemand('taipei', 'earthquake')).toBeDefined());
});

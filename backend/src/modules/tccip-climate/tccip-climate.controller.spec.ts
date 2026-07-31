import { Test, TestingModule } from '@nestjs/testing';
import { TccipClimateController } from './tccip-climate.controller';
import { TccipClimateService } from './tccip-climate.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TccipClimateController', () => {
    let controller: TccipClimateController;

    beforeEach(async () => {
        const service = {
            getClimateTrends: jest.fn().mockResolvedValue({}),
            getExtremeWeatherForecast: jest.fn().mockResolvedValue({}),
            getVulnerabilityAssessment: jest.fn().mockResolvedValue({}),
            getHistoricalDisasterStats: jest.fn().mockResolvedValue({}),
            getAdaptationStrategies: jest.fn().mockReturnValue([]),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TccipClimateController],
            providers: [{ provide: TccipClimateService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<TccipClimateController>(TccipClimateController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getClimateTrends', async () => expect(await controller.getClimateTrends('taipei')).toBeDefined());
    it('getExtremeWeather', async () => expect(await controller.getExtremeWeather('taipei')).toBeDefined());
    it('getVulnerability', async () => expect(await controller.getVulnerability('taipei')).toBeDefined());
    it('getDisasterStats', async () => expect(await controller.getDisasterStats('taipei', 10)).toBeDefined());
    it('getAdaptation', () => expect(controller.getAdaptation('flood,earthquake')).toEqual([]));
});

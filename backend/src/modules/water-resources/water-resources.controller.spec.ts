import { Test, TestingModule } from '@nestjs/testing';
import { WaterResourcesController } from './water-resources.controller';
import { WaterResourcesService } from './water-resources.service';

describe('WaterResourcesController', () => {
    let controller: WaterResourcesController;

    beforeEach(async () => {
        const service = {
            getRiverLevels: jest.fn().mockResolvedValue([]),
            getReservoirStatus: jest.fn().mockResolvedValue([]),
            getFloodPotentialAreas: jest.fn().mockResolvedValue([]),
            getActiveAlerts: jest.fn().mockReturnValue([]),
            subscribeToAlerts: jest.fn().mockReturnValue({ subscribed: true }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [WaterResourcesController],
            providers: [{ provide: WaterResourcesService, useValue: service }],
        }).compile();
        controller = module.get<WaterResourcesController>(WaterResourcesController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getRiverLevels', async () => expect(await controller.getRiverLevels()).toEqual([]));
    it('getReservoirStatus', async () => expect(await controller.getReservoirStatus()).toEqual([]));
    it('getFloodZones', async () => expect(await controller.getFloodZones('taipei')).toEqual([]));
    it('getAlerts', () => expect(controller.getAlerts()).toEqual([]));
    it('subscribeAlerts', () => expect(controller.subscribeAlerts({ regions: ['taipei'], callbackUrl: 'http://cb' })).toBeDefined());
});

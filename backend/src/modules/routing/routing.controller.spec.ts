import { Test, TestingModule } from '@nestjs/testing';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('RoutingController', () => {
    let controller: RoutingController;

    beforeEach(async () => {
        const service = {
            addRoadBlock: jest.fn().mockResolvedValue({ id: 'b1' }),
            getRoadBlocks: jest.fn().mockResolvedValue([]),
            removeRoadBlock: jest.fn().mockReturnValue(true),
            calculateRoute: jest.fn().mockResolvedValue({ distance: 10 }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RoutingController],
            providers: [{ provide: RoutingService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<RoutingController>(RoutingController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('addRoadBlock', async () => expect(await controller.addRoadBlock({ missionSessionId: 'm1', location: { lat: 25, lng: 121 }, radius: 100, reason: 'flood', severity: 'complete' } as any)).toBeDefined());
    it('getRoadBlocks', async () => expect(await controller.getRoadBlocks('m1')).toEqual([]));
    it('removeRoadBlock', async () => expect((await controller.removeRoadBlock('m1', 'b1')).success).toBe(true));
    it('calculateRoute', async () => expect(await controller.calculateRoute({ origin: { lat: 25, lng: 121 }, destination: { lat: 25.1, lng: 121.1 }, missionSessionId: 'm1' } as any)).toBeDefined());
});

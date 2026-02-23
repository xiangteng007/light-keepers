import { Test, TestingModule } from '@nestjs/testing';
import { LocationShareController } from './location-share.controller';
import { LocationShareService } from './location-share.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('LocationShareController', () => {
    let controller: LocationShareController;
    const mockUser = { uid: 'u1', id: 'u1' } as any;

    beforeEach(async () => {
        const service = {
            start: jest.fn().mockResolvedValue({ shareId: 's1' }),
            stop: jest.fn().mockResolvedValue({ stopped: true }),
            updateLocation: jest.fn().mockResolvedValue(true),
            getLiveLocations: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [LocationShareController],
            providers: [{ provide: LocationShareService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<LocationShareController>(LocationShareController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('start begins location sharing', async () => {
        const result = await controller.start('ms1', {} as any, mockUser);
        expect(result).toBeDefined();
    });

    it('stop ends location sharing', async () => {
        const result = await controller.stop('ms1', mockUser);
        expect(result).toBeDefined();
    });

    it('updateLocation updates position', async () => {
        const result = await controller.updateLocation('ms1', {} as any, mockUser);
        expect(result.success).toBe(true);
    });

    it('getLiveLocations returns live positions', async () => {
        const result = await controller.getLiveLocations('ms1');
        expect(result).toBeDefined();
    });
});

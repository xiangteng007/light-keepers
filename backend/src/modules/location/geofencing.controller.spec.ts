import { Test, TestingModule } from '@nestjs/testing';
import { GeofencingController } from './geofencing.controller';
import { GeofencingService } from './geofencing.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('GeofencingController', () => {
    let controller: GeofencingController;

    beforeEach(async () => {
        const service = {
            createZone: jest.fn().mockResolvedValue({ id: 'z1' }),
            getAllZones: jest.fn().mockResolvedValue([]),
            getActiveZones: jest.fn().mockResolvedValue([]),
            getZone: jest.fn().mockResolvedValue({ id: 'z1' }),
            updateZone: jest.fn().mockResolvedValue({ id: 'z1' }),
            deleteZone: jest.fn().mockResolvedValue(true),
            checkLocation: jest.fn().mockResolvedValue([]),
            calculateDistance: jest.fn().mockReturnValue(1500),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GeofencingController],
            providers: [{ provide: GeofencingService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<GeofencingController>(GeofencingController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('createZone creates a zone', async () => {
        const result = await controller.createZone({ name: 'Z1', type: 'circle' } as any);
        expect(result.success).toBe(true);
    });

    it('getAllZones returns zones', async () => {
        const result = await controller.getAllZones();
        expect(result.success).toBe(true);
    });

    it('getZone returns zone', async () => {
        const result = await controller.getZone('z1');
        expect(result.success).toBe(true);
    });

    it('deleteZone deletes zone', async () => {
        const result = await controller.deleteZone('z1');
        expect(result.success).toBe(true);
    });

    it('checkLocation checks geofences', async () => {
        const result = await controller.checkLocation({ lat: 25.033, lng: 121.565 });
        expect(result.success).toBe(true);
    });

    it('calculateDistance calculates', async () => {
        const result = await controller.calculateDistance({ from: { lat: 25, lng: 121 }, to: { lat: 25.1, lng: 121.1 } });
        expect(result.success).toBe(true);
    });
});

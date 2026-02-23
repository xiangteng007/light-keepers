import { Test, TestingModule } from '@nestjs/testing';
import { TacticalMapsController } from './tactical-maps.controller';
import { TacticalMapsService } from './tactical-maps.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TacticalMapsController', () => {
    let controller: TacticalMapsController;

    beforeEach(async () => {
        const service = {
            createMarker: jest.fn().mockResolvedValue({ id: 'm1' }),
            createBatch: jest.fn().mockResolvedValue([{ id: 'm1' }]),
            getMarkersByMission: jest.fn().mockResolvedValue([]),
            getMarker: jest.fn().mockResolvedValue({ id: 'm1' }),
            updateMarker: jest.fn().mockResolvedValue({ id: 'm1' }),
            deleteMarker: jest.fn().mockResolvedValue(undefined),
            calculateViewshed: jest.fn().mockResolvedValue({ visibleArea: [] }),
            generateSIDC: jest.fn().mockReturnValue('SFGPUCR---'),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TacticalMapsController],
            providers: [{ provide: TacticalMapsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<TacticalMapsController>(TacticalMapsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('createMarker', async () => expect(await controller.createMarker({})).toBeDefined());
    it('createBatch', async () => expect(await controller.createBatch([{}])).toHaveLength(1));
    it('getMarkersByMission', async () => expect(await controller.getMarkersByMission('m1')).toEqual([]));
    it('getMarker', async () => expect(await controller.getMarker('m1')).toBeDefined());
    it('updateMarker', async () => expect(await controller.updateMarker('m1', {})).toBeDefined());
    it('deleteMarker', async () => expect((await controller.deleteMarker('m1')).success).toBe(true));
    it('calculateViewshed', async () => expect(await controller.calculateViewshed({ observer: { lat: 25, lng: 121, height: 10 }, params: { maxDistance: 1000 } })).toBeDefined());
    it('generateSIDC', async () => expect((await controller.generateSIDC('friend', 'ground')).sidc).toBe('SFGPUCR---'));
});

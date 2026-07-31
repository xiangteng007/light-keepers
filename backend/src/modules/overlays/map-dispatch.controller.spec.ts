import { Test, TestingModule } from '@nestjs/testing';
import { MapDispatchController } from './map-dispatch.controller';
import { MapDispatchService } from './map-dispatch.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('MapDispatchController', () => {
    let controller: MapDispatchController;

    beforeEach(async () => {
        const service = {
            getSectors: jest.fn().mockResolvedValue([]),
            createSector: jest.fn().mockResolvedValue({ id: 'sec1' }),
            assignTeamToSector: jest.fn().mockResolvedValue({ id: 'sec1' }),
            updateSectorStatus: jest.fn().mockResolvedValue({ id: 'sec1' }),
            getRallyPoints: jest.fn().mockResolvedValue([]),
            createRallyPoint: jest.fn().mockResolvedValue({ id: 'rp1' }),
            updateRallyPointStatus: jest.fn().mockResolvedValue({ id: 'rp1' }),
            getRoutes: jest.fn().mockResolvedValue([]),
            createRoute: jest.fn().mockResolvedValue({ id: 'rt1' }),
            updateRouteStatus: jest.fn().mockResolvedValue({ id: 'rt1' }),
            dispatchFromBbox: jest.fn().mockResolvedValue({ id: 'task1' }),
            dispatchToSector: jest.fn().mockResolvedValue({ id: 'task2' }),
            calculateETA: jest.fn().mockResolvedValue({ minutes: 15 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MapDispatchController],
            providers: [{ provide: MapDispatchService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<MapDispatchController>(MapDispatchController);
    });

    const req = { user: { uid: 'u1' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('getSectors returns sectors', async () => {
        const result = await controller.getSectors('s1');
        expect(result.success).toBe(true);
    });
    it('createSector creates sector', async () => {
        const result = await controller.createSector('s1', { sectorCode: 'A', name: 'Alpha', sectorType: 'search' as any, geometry: {} as any }, req);
        expect(result.success).toBe(true);
    });
    it('getRallyPoints returns points', async () => {
        const result = await controller.getRallyPoints('s1');
        expect(result.success).toBe(true);
    });
    it('getRoutes returns routes', async () => {
        const result = await controller.getRoutes('s1');
        expect(result.success).toBe(true);
    });
    it('dispatchFromBbox dispatches', async () => {
        const result = await controller.dispatchFromBbox('s1', { bbox: {} as any, teamId: 't1', teamName: 'T1', taskTitle: 'Task' }, req);
        expect(result.success).toBe(true);
    });
    it('calculateETA calculates', async () => {
        const result = await controller.calculateETA('25', '121', '25.1', '121.1');
        expect(result.success).toBe(true);
    });
});

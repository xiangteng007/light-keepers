import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('ReportsController', () => {
    let controller: ReportsController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 'r1' }),
            findForMap: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({}),
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ id: 'r1' }),
            review: jest.fn().mockResolvedValue({ id: 'r1' }),
            delete: jest.fn().mockResolvedValue(undefined),
            getHotspots: jest.fn().mockResolvedValue([]),
            getTrendData: jest.fn().mockResolvedValue([]),
            getRegionStats: jest.fn().mockResolvedValue([]),
            getHourlyStats: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReportsController],
            providers: [{ provide: ReportsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ReportsController>(ReportsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('create creates report', async () => {
        const result = await controller.create({} as any);
        expect(result.success).toBe(true);
    });
    it('findForMap returns map data', async () => {
        const result = await controller.findForMap();
        expect(result.success).toBe(true);
    });
    it('getStats returns stats', async () => {
        const result = await controller.getStats();
        expect(result.success).toBe(true);
    });
    it('findAll returns reports', async () => {
        const result = await controller.findAll();
        expect(result.success).toBe(true);
    });
    it('delete deletes report', async () => {
        const result = await controller.delete('r1');
        expect(result.success).toBe(true);
    });
    it('getHotspots returns hotspots', async () => {
        const result = await controller.getHotspots();
        expect(result.success).toBe(true);
    });
    it('getTrend returns trend', async () => {
        const result = await controller.getTrend();
        expect(result.success).toBe(true);
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NcdrAlertsController } from './ncdr-alerts.controller';
import { NcdrAlertsService } from './ncdr-alerts.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('NcdrAlertsController', () => {
    let controller: NcdrAlertsController;

    beforeEach(async () => {
        const service = {
            getAlertTypes: jest.fn().mockReturnValue([]),
            getCoreAlertTypes: jest.fn().mockReturnValue([33, 34]),
            findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            findWithLocation: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({}),
            syncAlertTypes: jest.fn().mockResolvedValue({ synced: 5 }),
            updateExistingSourceLinks: jest.fn().mockResolvedValue({ updated: 3 }),
            updateExistingCoordinates: jest.fn().mockResolvedValue({ updated: 2 }),
            syncCwaEarthquakes: jest.fn().mockResolvedValue({ synced: 1 }),
            clearAllAlerts: jest.fn().mockResolvedValue({ deleted: 10 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [NcdrAlertsController],
            providers: [{ provide: NcdrAlertsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<NcdrAlertsController>(NcdrAlertsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getAlertTypes returns types', () => {
        const result = controller.getAlertTypes();
        expect(result).toHaveProperty('types');
        expect(result).toHaveProperty('coreTypes');
    });
    it('findAll returns alerts', async () => expect(await controller.findAll({} as any)).toBeDefined());
    it('findForMap returns map alerts', async () => {
        const result = await controller.findForMap('33,34');
        expect(result).toHaveProperty('data');
    });
    it('getStats returns stats', async () => expect(await controller.getStats()).toBeDefined());
    it('syncCore syncs', async () => {
        const result = await controller.syncCore();
        expect(result.message).toBe('Sync completed');
    });
    it('syncTypes syncs specified types', async () => {
        const result = await controller.syncTypes({ typeIds: [33, 34] } as any);
        expect(result.message).toBe('Sync completed');
    });
    it('updateSourceLinks updates', async () => {
        const result = await controller.updateSourceLinks();
        expect(result.message).toContain('Source links');
    });
    it('syncCwaEarthquakes syncs', async () => {
        const result = await controller.syncCwaEarthquakes();
        expect(result.message).toContain('CWA earthquake');
    });
    it('clearAll clears', async () => {
        const result = await controller.clearAll();
        expect(result.message).toContain('cleared');
    });
});

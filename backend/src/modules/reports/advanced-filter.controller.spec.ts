import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedFilterController } from './advanced-filter.controller';
import { AdvancedFilterService } from './advanced-filter.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AdvancedFilterController', () => {
    let controller: AdvancedFilterController;

    beforeEach(async () => {
        const service = {
            filterReports: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            aggregateReports: jest.fn().mockResolvedValue([]),
            getTimeSeries: jest.fn().mockResolvedValue([]),
            getCrossAnalysis: jest.fn().mockResolvedValue([]),
            getFilterOptions: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AdvancedFilterController],
            providers: [{ provide: AdvancedFilterService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AdvancedFilterController>(AdvancedFilterController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('filterReports filters', async () => {
        const result = await controller.filterReports({} as any);
        expect(result.success).toBe(true);
    });
    it('filterReportsGet filters via GET', async () => {
        const result = await controller.filterReportsGet();
        expect(result.success).toBe(true);
    });
    it('aggregateReports aggregates', async () => {
        const result = await controller.aggregateReports('day');
        expect(result.success).toBe(true);
    });
    it('getTimeSeries returns series', async () => {
        const result = await controller.getTimeSeries('day');
        expect(result.success).toBe(true);
    });
    it('getFilterOptions returns options', async () => {
        const result = await controller.getFilterOptions();
        expect(result.success).toBe(true);
    });
});

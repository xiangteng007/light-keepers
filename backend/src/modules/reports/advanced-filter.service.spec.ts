import { AdvancedFilterService } from './advanced-filter.service';

describe('AdvancedFilterService', () => {
    let service: AdvancedFilterService;
    let repo: Record<string, jest.Mock>;
    let queryBuilder: Record<string, jest.Mock>;

    beforeEach(() => {
        queryBuilder = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            getMany: jest.fn().mockResolvedValue([]),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            addGroupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
        };
        repo = {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
        };
        service = new AdvancedFilterService(repo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('filterReports', () => {
        it('should return paginated results', async () => {
            queryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: '1' }], 1]);
            const result = await service.filterReports({ page: 1, pageSize: 10 });
            expect(result.data.length).toBe(1);
            expect(result.total).toBe(1);
            expect(result.page).toBe(1);
        });

        it('should apply default pagination', async () => {
            queryBuilder.getManyAndCount.mockResolvedValueOnce([[], 0]);
            const result = await service.filterReports({});
            expect(result.pageSize).toBeGreaterThan(0);
        });
    });

    describe('aggregateReports', () => {
        it('should aggregate by type', async () => {
            queryBuilder.getRawMany.mockResolvedValueOnce([
                { key: 'flood', count: '5' },
            ]);
            const result = await service.aggregateReports({}, 'type');
            expect(Array.isArray(result)).toBe(true);
        });

        it('should aggregate by status', async () => {
            await service.aggregateReports({}, 'status');
            expect(repo.createQueryBuilder).toHaveBeenCalled();
        });
    });

    describe('getTimeSeries', () => {
        it('should return time series data', async () => {
            queryBuilder.getRawMany.mockResolvedValueOnce([
                { timestamp: '2026-02-10', count: '3' },
            ]);
            const result = await service.getTimeSeries({}, 'day');
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('getCrossAnalysis', () => {
        it('should return cross analysis', async () => {
            queryBuilder.getRawMany.mockResolvedValueOnce([]);
            const result = await service.getCrossAnalysis({}, 'type', 'severity');
            expect(typeof result).toBe('object');
        });
    });

    describe('getFilterOptions', () => {
        it('should return filter options', async () => {
            queryBuilder.getRawMany.mockResolvedValue([]);
            const result = await service.getFilterOptions();
            expect(result).toBeDefined();
        });
    });
});

import { HxlExportService } from './hxl-export.service';

describe('HxlExportService', () => {
    let service: HxlExportService;

    const mockReports = [
        { id: 'r1', createdAt: '2026-01-01', status: 'open', affectedCount: 10, location: { address: '台北', latitude: 25.03, longitude: 121.56 } },
        { id: 'r2', createdAt: '2026-01-02', status: 'closed', affectedCount: 5, location: { address: '新北', latitude: 25.01, longitude: 121.47 } },
    ];

    const mockDistributions = [
        { date: '2026-01-01', itemName: '飲用水', quantity: 100, unit: 'bottles', beneficiaryCount: 50, location: { name: '信義區' } },
    ];

    beforeEach(() => {
        service = new HxlExportService();
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('exportDisasterReports', () => {
        it('should export as CSV with HXL tags', async () => {
            const csv = await service.exportDisasterReports(mockReports);
            expect(csv).toContain('#report+id');
            expect(csv).toContain('r1');
            expect(csv).toContain('Taiwan');
        });

        it('should export as JSON', async () => {
            const json = await service.exportDisasterReports(mockReports, { format: 'json', includeHeaders: true });
            const parsed = JSON.parse(json);
            expect(parsed.columns).toBeDefined();
            expect(parsed.rows.length).toBe(2);
        });
    });

    describe('exportResourceDistribution', () => {
        it('should export distribution CSV', async () => {
            const csv = await service.exportResourceDistribution(mockDistributions);
            expect(csv).toContain('#item+name');
            expect(csv).toContain('飲用水');
        });
    });

    describe('getHxlTags', () => {
        it('should return HXL tag dictionary', () => {
            const tags = service.getHxlTags();
            expect(tags.country).toBe('#country+name');
            expect(tags.latitude).toBe('#geo+lat');
        });
    });
});

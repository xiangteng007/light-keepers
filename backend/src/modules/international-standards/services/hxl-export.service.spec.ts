import { Test, TestingModule } from '@nestjs/testing';
import { HxlExportService } from './hxl-export.service';

describe('HxlExportService', () => {
    let service: HxlExportService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [HxlExportService],
        }).compile();
        service = module.get(HxlExportService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('exportMissions returns HxlDataset', () => {
        const ds = service.exportMissions([{ name: 'Test', status: 'active' }]);
        expect(ds.headers.length).toBeGreaterThan(0);
        expect(ds.data.length).toBe(1);
    });

    it('exportResources returns HxlDataset', () => {
        const ds = service.exportResources([{ name: 'Water', quantity: 100 }]);
        expect(ds.data.length).toBe(1);
    });

    it('export3W returns HxlDataset', () => {
        const ds = service.export3W([{ organization: 'NGO', sector: 'WASH' }]);
        expect(ds.data.length).toBe(1);
    });

    it('toCsv returns CSV string', () => {
        const ds = service.exportMissions([{ name: 'M1' }]);
        const csv = service.toCsv(ds);
        expect(csv).toContain('Mission Name');
    });

    it('toJson returns structured JSON', () => {
        const ds = service.exportMissions([{ name: 'M1' }]);
        const json = service.toJson(ds);
        expect(json.schema).toBeDefined();
        expect(json.data.length).toBe(1);
    });
});

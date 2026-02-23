import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PowerBiService } from './power-bi.service';

describe('PowerBiService', () => {
    let service: PowerBiService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PowerBiService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
            ],
        }).compile();
        service = module.get(PowerBiService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getEmbedConfig returns not-configured when missing env', async () => {
        const config = await service.getEmbedConfig('report1');
        expect(config.success).toBe(false);
        expect(config.error).toBe('POWERBI_NOT_CONFIGURED');
    });

    it('listReports returns empty when not configured', async () => {
        const reports = await service.listReports();
        expect(reports).toEqual([]);
    });

    it('getDefaultDashboards returns 4 defaults', () => {
        const dashboards = service.getDefaultDashboards();
        expect(dashboards.length).toBe(4);
        expect(dashboards[0].id).toBe('realtime-disaster');
    });

    it('pushToStreamingDataset returns false when not configured', async () => {
        const result = await service.pushToStreamingDataset('ds1', [{ val: 1 }]);
        expect(result).toBe(false);
    });
});
